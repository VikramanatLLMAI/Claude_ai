/**
 * Authentication & Authorization Middleware for API routes
 *
 * Provides utilities for validating sessions and protecting routes:
 * - validateSession(req) — validate Bearer token, return user
 * - requireAuth(req) — simple auth check (used by auth routes: me, logout, change-password)
 * - requireOrgAuth(req) — enriched org auth (user + org + role + permissions + tenantDb)
 * - requireSuperAdmin(req) — platform admin auth (Super Admin only)
 * - requireOrgAdmin(req) — org admin auth (Org Admin role)
 * - ensureMinimumSuperAdmins() — safety check for Super Admin deletion
 *
 * Authorization is enforced at the route handler level (AUTH-07, CVE-2025-29927).
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSessionByToken } from './storage';
import prisma from './db';
import { resolveOrgSlug } from './resolve-org';
import { tenantPrisma, type TenantPrismaClient } from './tenant';
import type {
  User,
  Organization,
  OrgMember,
  Role,
} from './generated/prisma/client';

// ============================================
// Types
// ============================================

export interface AuthenticatedRequest extends NextRequest {
  user?: User;
}

export interface AuthResult {
  authenticated: boolean;
  user?: User;
  error?: string;
  status?: number;
}

/**
 * Enriched org auth context returned by requireOrgAuth().
 * Contains user, org membership, organization, role, permissions, and a pre-built tenant-scoped DB client.
 * (AUTH-01)
 */
export interface OrgAuthContext {
  user: User;
  orgMember: OrgMember & { organization: Organization; role: Role };
  organization: Organization;
  role: Role;
  permissions: string[];
  tenantDb: TenantPrismaClient;
}

/**
 * Super Admin context returned by requireSuperAdmin().
 * Super Admin has no org context and cannot access org-scoped resources (AUTH-06).
 */
export interface SuperAdminContext {
  user: User & { isSuperAdmin: true };
}

// ============================================
// Session Validation (existing)
// ============================================

/**
 * Validate session token from Authorization header
 */
export async function validateSession(req: NextRequest): Promise<AuthResult> {
  const authHeader = req.headers.get('Authorization');

  if (!authHeader) {
    return {
      authenticated: false,
      error: 'No authorization header provided',
      status: 401,
    };
  }

  if (!authHeader.startsWith('Bearer ')) {
    return {
      authenticated: false,
      error: 'Invalid authorization format. Use Bearer token',
      status: 401,
    };
  }

  const token = authHeader.slice(7);

  if (!token || token.length < 32) {
    return {
      authenticated: false,
      error: 'Invalid token format',
      status: 401,
    };
  }

  try {
    const session = await getSessionByToken(token);

    if (!session) {
      return {
        authenticated: false,
        error: 'Invalid or expired session',
        status: 401,
      };
    }

    // Check if session is expired
    if (session.expiresAt < new Date()) {
      return {
        authenticated: false,
        error: 'Session has expired',
        status: 401,
      };
    }

    return {
      authenticated: true,
      user: session.user,
    };
  } catch (error) {
    console.error('Session validation error:', error);
    return {
      authenticated: false,
      error: 'Failed to validate session',
      status: 500,
    };
  }
}

// ============================================
// Basic Auth (existing — kept for auth routes)
// ============================================

/**
 * Higher-order function to protect API routes.
 * Returns 401 if not authenticated, otherwise calls the handler.
 */
export function withAuth<T>(
  handler: (req: NextRequest, user: User) => Promise<NextResponse<T>>
): (req: NextRequest) => Promise<NextResponse<T | { error: string }>> {
  return async (req: NextRequest) => {
    const auth = await validateSession(req);

    if (!auth.authenticated || !auth.user) {
      return NextResponse.json(
        { error: auth.error || 'Unauthorized' },
        { status: auth.status || 401 }
      );
    }

    return handler(req, auth.user);
  };
}

/**
 * Get user from request, returns null if not authenticated.
 * Useful when authentication is optional.
 */
export async function getUserFromRequest(req: NextRequest): Promise<User | null> {
  const auth = await validateSession(req);
  return auth.authenticated ? auth.user || null : null;
}

/**
 * Middleware helper for protected API routes (basic auth, no org context).
 * Use this ONLY for auth routes: /api/auth/me, /api/auth/logout, /api/auth/change-password.
 * For org-scoped routes, use requireOrgAuth() instead.
 */
export async function requireAuth(
  req: NextRequest
): Promise<{ user: User } | NextResponse> {
  const auth = await validateSession(req);

  if (!auth.authenticated || !auth.user) {
    return NextResponse.json(
      { error: auth.error || 'Unauthorized' },
      { status: auth.status || 401 }
    );
  }

  return { user: auth.user };
}

// ============================================
// Org Auth (new — AUTH-01, AUTH-02, AUTH-07)
// ============================================

/**
 * Enriched org auth middleware for org-scoped API routes.
 *
 * Validates session, resolves org from URL, checks membership, loads role & permissions,
 * and returns a pre-built tenant-scoped Prisma client.
 *
 * 1. Validate session (401 if invalid)
 * 2. Block Super Admin from org routes (403 — AUTH-06)
 * 3. Resolve org slug from URL (400 if missing)
 * 4. Query org membership with org + role (403 if not member)
 * 5. Check member is active (403 if suspended)
 * 6. Build OrgAuthContext with tenantPrisma(orgId)
 * 7. Fire-and-forget lastActiveAt update
 *
 * @returns OrgAuthContext or NextResponse (error)
 */
export async function requireOrgAuth(
  req: NextRequest
): Promise<OrgAuthContext | NextResponse> {
  // 1. Validate session
  const auth = await validateSession(req);
  if (!auth.authenticated || !auth.user) {
    return NextResponse.json(
      { error: auth.error || 'Unauthorized' },
      { status: auth.status || 401 }
    );
  }

  const user = auth.user;

  // 2. Super Admin cannot access org-scoped resources (AUTH-06)
  if (user.isSuperAdmin) {
    return NextResponse.json(
      { error: 'Super Admin cannot access org-scoped resources' },
      { status: 403 }
    );
  }

  // 3. Resolve org slug from request URL
  const slug = resolveOrgSlug(req);
  if (!slug) {
    return NextResponse.json(
      { error: 'Organization context required' },
      { status: 400 }
    );
  }

  // 4. Query org membership with organization and role included
  const orgMember = await prisma.orgMember.findFirst({
    where: {
      userId: user.id,
      organization: {
        slug,
        deletedAt: null,
        status: 'ACTIVE',
      },
    },
    include: {
      organization: true,
      role: true,
    },
  });

  if (!orgMember) {
    return NextResponse.json(
      { error: 'Forbidden' },
      { status: 403 }
    );
  }

  // 5. Check member status
  if (orgMember.status !== 'ACTIVE') {
    return NextResponse.json(
      { error: 'Account suspended' },
      { status: 403 }
    );
  }

  // 6. Build enriched context
  const permissions = Array.isArray(orgMember.role.permissions)
    ? (orgMember.role.permissions as string[])
    : [];

  const context: OrgAuthContext = {
    user,
    orgMember,
    organization: orgMember.organization,
    role: orgMember.role,
    permissions,
    tenantDb: tenantPrisma(orgMember.organization.id),
  };

  // 7. Fire-and-forget: update lastActiveAt
  prisma.orgMember.update({
    where: { id: orgMember.id },
    data: { lastActiveAt: new Date() },
  }).catch(() => {
    // Silently ignore errors — this is non-critical
  });

  return context;
}

// ============================================
// Super Admin Auth (new — AUTH-03, AUTH-06)
// ============================================

/**
 * Super Admin auth middleware for platform-level routes.
 *
 * 1. Validate session (401 if invalid)
 * 2. Check isSuperAdmin flag (403 if not)
 * 3. Return SuperAdminContext
 *
 * @returns SuperAdminContext or NextResponse (error)
 */
export async function requireSuperAdmin(
  req: NextRequest
): Promise<SuperAdminContext | NextResponse> {
  const auth = await validateSession(req);
  if (!auth.authenticated || !auth.user) {
    return NextResponse.json(
      { error: auth.error || 'Unauthorized' },
      { status: auth.status || 401 }
    );
  }

  if (!auth.user.isSuperAdmin) {
    return NextResponse.json(
      { error: 'Forbidden' },
      { status: 403 }
    );
  }

  return {
    user: auth.user as User & { isSuperAdmin: true },
  };
}

// ============================================
// Org Admin Auth (convenience — ROUTE-03)
// ============================================

/**
 * Org Admin auth middleware — requireOrgAuth + admin role check.
 *
 * Checks if the user's role permissions include "org_admin" OR role name is "Org Admin".
 *
 * @returns OrgAuthContext or NextResponse (error)
 */
export async function requireOrgAdmin(
  req: NextRequest
): Promise<OrgAuthContext | NextResponse> {
  const result = await requireOrgAuth(req);
  if (result instanceof NextResponse) return result;

  const isAdmin =
    result.permissions.includes('org_admin') ||
    result.role.name === 'Org Admin';

  if (!isAdmin) {
    return NextResponse.json(
      { error: 'Org Admin access required' },
      { status: 403 }
    );
  }

  return result;
}

// ============================================
// Safety Checks (SAFE-03, SAFE-06)
// ============================================

/**
 * Check if there are at least 2 Super Admins (safe to delete one).
 * Used by Super Admin deletion routes in future phases.
 *
 * @returns true if count > 1 (safe to delete one), false otherwise
 */
export async function ensureMinimumSuperAdmins(): Promise<boolean> {
  const count = await prisma.user.count({
    where: { isSuperAdmin: true },
  });
  return count > 1;
}

// ============================================
// Response Helpers (existing)
// ============================================

/**
 * Create unauthorized response (401)
 */
export function unauthorizedResponse(message?: string): NextResponse {
  return NextResponse.json(
    { error: message || 'Unauthorized' },
    { status: 401 }
  );
}

/**
 * Create forbidden response (403)
 */
export function forbiddenResponse(message?: string): NextResponse {
  return NextResponse.json(
    { error: message || 'Forbidden' },
    { status: 403 }
  );
}
