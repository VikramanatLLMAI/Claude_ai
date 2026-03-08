/**
 * Unit tests for auth middleware: requireAuth, requireOrgAuth, requireSuperAdmin
 *
 * Tests cover:
 * - 401 for missing/invalid tokens
 * - 401 for expired sessions
 * - Valid user return for good sessions
 * - 403 for Super Admin on org routes
 * - 403 for suspended org members
 * - 403 with FORCE_PASSWORD_CHANGE code
 * - Full OrgAuthContext return on success
 * - SuperAdminContext return
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextResponse } from 'next/server';

// Mock dependencies before importing the module under test
vi.mock('@/lib/storage', () => ({
  getSessionByToken: vi.fn(),
}));

vi.mock('@/lib/resolve-org', () => ({
  resolveOrgSlug: vi.fn(),
}));

vi.mock('@/lib/tenant', () => ({
  tenantPrisma: vi.fn(() => ({})),
}));

// Import mock-db to get prismaMock (mocks @/lib/db)
import '@/__tests__/helpers/mock-db';
import { prismaMock } from '@/__tests__/helpers/mock-db';
import { createMockRequest } from '@/__tests__/helpers/mock-auth';
import {
  createMockUser,
  createMockSession,
  createMockOrgMember,
} from '@/__tests__/helpers/factories';

// Import mocked functions
import { getSessionByToken } from '@/lib/storage';
import { resolveOrgSlug } from '@/lib/resolve-org';

// Import functions under test
import { requireAuth, requireOrgAuth, requireSuperAdmin } from '@/lib/auth-middleware';

const mockedGetSessionByToken = vi.mocked(getSessionByToken);
const mockedResolveOrgSlug = vi.mocked(resolveOrgSlug);

// Valid token (>= 32 chars)
const VALID_TOKEN = 'a'.repeat(64);

describe('requireAuth', () => {
  it('returns 401 when no Authorization header', async () => {
    const req = createMockRequest({});
    const result = await requireAuth(req);

    expect(result).toBeInstanceOf(NextResponse);
    const res = result as NextResponse;
    expect(res.status).toBe(401);
  });

  it('returns 401 when token is too short (< 32 chars)', async () => {
    const req = createMockRequest({ token: 'short-token' });
    const result = await requireAuth(req);

    expect(result).toBeInstanceOf(NextResponse);
    const res = result as NextResponse;
    expect(res.status).toBe(401);
  });

  it('returns 401 when session not found', async () => {
    mockedGetSessionByToken.mockResolvedValue(null);
    const req = createMockRequest({ token: VALID_TOKEN });
    const result = await requireAuth(req);

    expect(result).toBeInstanceOf(NextResponse);
    const res = result as NextResponse;
    expect(res.status).toBe(401);
  });

  it('returns 401 when session is expired', async () => {
    const expiredSession = createMockSession({
      token: VALID_TOKEN,
      expiresAt: new Date(Date.now() - 1000), // expired 1 second ago
    });
    mockedGetSessionByToken.mockResolvedValue(expiredSession);
    const req = createMockRequest({ token: VALID_TOKEN });
    const result = await requireAuth(req);

    expect(result).toBeInstanceOf(NextResponse);
    const res = result as NextResponse;
    expect(res.status).toBe(401);
  });

  it('returns { user } when session is valid', async () => {
    const user = createMockUser();
    const session = createMockSession({
      token: VALID_TOKEN,
      user,
      expiresAt: new Date(Date.now() + 86400000), // expires in 1 day
    });
    mockedGetSessionByToken.mockResolvedValue(session);

    // Mock the fire-and-forget session update
    prismaMock.session.update.mockResolvedValue({} as any);

    const req = createMockRequest({ token: VALID_TOKEN });
    const result = await requireAuth(req);

    expect(result).not.toBeInstanceOf(NextResponse);
    expect(result).toHaveProperty('user');
    expect((result as { user: typeof user }).user.id).toBe(user.id);
  });
});

describe('requireOrgAuth', () => {
  beforeEach(() => {
    // Default: resolveOrgSlug returns a slug
    mockedResolveOrgSlug.mockReturnValue('test-org');
  });

  it('returns 401 when no auth header', async () => {
    const req = createMockRequest({
      url: 'http://localhost:3000/api/org/test-org/admin/users',
    });
    const result = await requireOrgAuth(req);

    expect(result).toBeInstanceOf(NextResponse);
    expect((result as NextResponse).status).toBe(401);
  });

  it('returns 403 when user is Super Admin', async () => {
    const superUser = createMockUser({ isSuperAdmin: true });
    const session = createMockSession({
      token: VALID_TOKEN,
      user: superUser,
      expiresAt: new Date(Date.now() + 86400000),
    });
    mockedGetSessionByToken.mockResolvedValue(session);

    const req = createMockRequest({
      url: 'http://localhost:3000/api/org/test-org/admin/users',
      token: VALID_TOKEN,
    });
    const result = await requireOrgAuth(req);

    expect(result).toBeInstanceOf(NextResponse);
    expect((result as NextResponse).status).toBe(403);
  });

  it('returns 403 when org member not found', async () => {
    const user = createMockUser();
    const session = createMockSession({
      token: VALID_TOKEN,
      user,
      expiresAt: new Date(Date.now() + 86400000),
    });
    mockedGetSessionByToken.mockResolvedValue(session);
    prismaMock.orgMember.findFirst.mockResolvedValue(null);

    const req = createMockRequest({
      url: 'http://localhost:3000/api/org/test-org/admin/users',
      token: VALID_TOKEN,
    });
    const result = await requireOrgAuth(req);

    expect(result).toBeInstanceOf(NextResponse);
    expect((result as NextResponse).status).toBe(403);
  });

  it('returns 403 when org member is suspended', async () => {
    const user = createMockUser();
    const session = createMockSession({
      token: VALID_TOKEN,
      user,
      expiresAt: new Date(Date.now() + 86400000),
    });
    mockedGetSessionByToken.mockResolvedValue(session);

    const suspendedMember = createMockOrgMember({ status: 'SUSPENDED' });
    prismaMock.orgMember.findFirst.mockResolvedValue(suspendedMember as any);

    const req = createMockRequest({
      url: 'http://localhost:3000/api/org/test-org/admin/users',
      token: VALID_TOKEN,
    });
    const result = await requireOrgAuth(req);

    expect(result).toBeInstanceOf(NextResponse);
    expect((result as NextResponse).status).toBe(403);
  });

  it('returns 403 with FORCE_PASSWORD_CHANGE code when forcePasswordChange is true', async () => {
    const user = createMockUser();
    const session = createMockSession({
      token: VALID_TOKEN,
      user,
      expiresAt: new Date(Date.now() + 86400000),
    });
    mockedGetSessionByToken.mockResolvedValue(session);

    const forcePwdMember = createMockOrgMember({ forcePasswordChange: true });
    prismaMock.orgMember.findFirst.mockResolvedValue(forcePwdMember as any);

    const req = createMockRequest({
      url: 'http://localhost:3000/api/org/test-org/admin/users',
      token: VALID_TOKEN,
    });
    const result = await requireOrgAuth(req);

    expect(result).toBeInstanceOf(NextResponse);
    const res = result as NextResponse;
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.code).toBe('FORCE_PASSWORD_CHANGE');
  });

  it('returns 403 with FORCE_PASSWORD_CHANGE exempt for /change-password path', async () => {
    const user = createMockUser();
    const session = createMockSession({
      token: VALID_TOKEN,
      user,
      expiresAt: new Date(Date.now() + 86400000),
    });
    mockedGetSessionByToken.mockResolvedValue(session);

    const forcePwdMember = createMockOrgMember({ forcePasswordChange: true });
    prismaMock.orgMember.findFirst.mockResolvedValue(forcePwdMember as any);

    // Mock fire-and-forget updates
    prismaMock.orgMember.update.mockResolvedValue({} as any);
    prismaMock.session.update.mockResolvedValue({} as any);

    const req = createMockRequest({
      url: 'http://localhost:3000/api/auth/change-password',
      token: VALID_TOKEN,
    });
    const result = await requireOrgAuth(req);

    // Should NOT be blocked since path is exempt
    expect(result).not.toBeInstanceOf(NextResponse);
  });

  it('returns OrgAuthContext when everything is valid', async () => {
    const user = createMockUser();
    const session = createMockSession({
      token: VALID_TOKEN,
      user,
      expiresAt: new Date(Date.now() + 86400000),
    });
    mockedGetSessionByToken.mockResolvedValue(session);

    const orgMember = createMockOrgMember({
      role: {
        id: 'role-1',
        organizationId: 'org-1',
        name: 'Member',
        description: null,
        isSystemRole: false,
        permissions: ['chat', 'view_models'] as any,
        allowedModels: [] as any,
        systemInstructions: null,
        restrictionInstructions: null,
        restrictionInstructionsMaxLength: 1000,
        customInstructionsEnabled: true,
        customInstructionsMaxLength: 1000,
        personalMcpEnabled: false,
        personalMcpMaxCount: 3,
        dailyRequestLimit: null,
        dailyTokenLimit: null,
        promptSuggestions: [] as any,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
    prismaMock.orgMember.findFirst.mockResolvedValue(orgMember as any);
    prismaMock.orgMember.update.mockResolvedValue({} as any);
    prismaMock.session.update.mockResolvedValue({} as any);

    const req = createMockRequest({
      url: 'http://localhost:3000/api/org/test-org/admin/users',
      token: VALID_TOKEN,
    });
    const result = await requireOrgAuth(req);

    expect(result).not.toBeInstanceOf(NextResponse);
    const ctx = result as any;
    expect(ctx).toHaveProperty('user');
    expect(ctx).toHaveProperty('orgMember');
    expect(ctx).toHaveProperty('organization');
    expect(ctx).toHaveProperty('role');
    expect(ctx).toHaveProperty('permissions');
    expect(ctx).toHaveProperty('tenantDb');
    expect(ctx.permissions).toEqual(['chat', 'view_models']);
  });
});

describe('requireSuperAdmin', () => {
  it('returns 401 when no auth header', async () => {
    const req = createMockRequest({});
    const result = await requireSuperAdmin(req);

    expect(result).toBeInstanceOf(NextResponse);
    expect((result as NextResponse).status).toBe(401);
  });

  it('returns 403 when user is not Super Admin', async () => {
    const user = createMockUser({ isSuperAdmin: false });
    const session = createMockSession({
      token: VALID_TOKEN,
      user,
      expiresAt: new Date(Date.now() + 86400000),
    });
    mockedGetSessionByToken.mockResolvedValue(session);

    const req = createMockRequest({ token: VALID_TOKEN });
    const result = await requireSuperAdmin(req);

    expect(result).toBeInstanceOf(NextResponse);
    expect((result as NextResponse).status).toBe(403);
  });

  it('returns SuperAdminContext when user is Super Admin', async () => {
    const superUser = createMockUser({ isSuperAdmin: true });
    const session = createMockSession({
      token: VALID_TOKEN,
      user: superUser,
      expiresAt: new Date(Date.now() + 86400000),
    });
    mockedGetSessionByToken.mockResolvedValue(session);
    prismaMock.session.update.mockResolvedValue({} as any);

    const req = createMockRequest({ token: VALID_TOKEN });
    const result = await requireSuperAdmin(req);

    expect(result).not.toBeInstanceOf(NextResponse);
    const ctx = result as any;
    expect(ctx).toHaveProperty('user');
    expect(ctx.user.isSuperAdmin).toBe(true);
  });
});
