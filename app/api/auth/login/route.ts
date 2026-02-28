/**
 * Login API
 * POST /api/auth/login — Authenticate user and create session
 *
 * For org-scoped login: resolves org from URL context and stores organizationId in session.
 * For Super Admin: creates session without org context.
 */

import { NextRequest } from 'next/server';
import { getUserByEmail, updateUser } from '@/lib/storage';
import { verifyPassword, generateToken } from '@/lib/encryption';
import prisma from '@/lib/db';
import { resolveOrgSlug } from '@/lib/resolve-org';
import {
  getPasswordPolicy,
  checkPasswordChangeRequired,
} from '@/lib/services/password-policy-service';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password } = body;

    // Validate required fields
    if (!email || !password) {
      return Response.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Find user by email
    const user = await getUserByEmail(email);
    if (!user) {
      return Response.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Verify password
    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
      return Response.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Resolve org context from URL (if present)
    const slug = resolveOrgSlug(req);
    let organizationId: string | null = null;
    let orgInfo: { id: string; name: string; slug: string } | null = null;

    if (!user.isSuperAdmin && slug) {
      // Verify user is a member of this organization
      const orgMember = await prisma.orgMember.findFirst({
        where: {
          userId: user.id,
          organization: {
            slug,
            deletedAt: null,
            status: 'ACTIVE',
          },
          status: 'ACTIVE',
        },
        include: {
          organization: true,
        },
      });

      if (!orgMember) {
        return Response.json(
          { error: 'You are not a member of this organization' },
          { status: 403 }
        );
      }

      organizationId = orgMember.organization.id;
      orgInfo = {
        id: orgMember.organization.id,
        name: orgMember.organization.name,
        slug: orgMember.organization.slug,
      };
    }

    // Capture request metadata
    const userAgent = req.headers.get('user-agent') || undefined;
    const ipAddress =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      req.headers.get('x-real-ip') ||
      undefined;

    // Create session (30 day expiry)
    const token = generateToken();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await prisma.session.create({
      data: {
        userId: user.id,
        token,
        expiresAt,
        organizationId,
        userAgent,
        ipAddress,
      },
    });

    // Update last login (non-blocking)
    updateUser(user.id, { lastLogin: new Date() }).catch(() => {});

    // Build response
    if (user.isSuperAdmin) {
      return Response.json({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          avatarBase64: user.avatarBase64,
          preferences: user.preferences,
        },
        token,
        expiresAt: expiresAt.toISOString(),
        isSuperAdmin: true,
      });
    }

    // Check if password change is required (OPWD-05: only on login, no immediate lockout)
    if (organizationId) {
      const orgMember = await prisma.orgMember.findFirst({
        where: { userId: user.id, organizationId },
        select: { forcePasswordChange: true },
      });

      if (orgMember) {
        const policy = await getPasswordPolicy(organizationId);
        const changeRequired = checkPasswordChangeRequired(
          user,
          orgMember,
          policy
        );

        if (changeRequired.required) {
          return Response.json({
            user: {
              id: user.id,
              email: user.email,
              name: user.name,
              avatarBase64: user.avatarBase64,
              preferences: user.preferences,
            },
            token,
            expiresAt: expiresAt.toISOString(),
            ...(orgInfo ? { organization: orgInfo } : {}),
            forcePasswordChange: true,
            reason: changeRequired.reason,
          });
        }
      }
    }

    return Response.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarBase64: user.avatarBase64,
        preferences: user.preferences,
      },
      token,
      expiresAt: expiresAt.toISOString(),
      ...(orgInfo ? { organization: orgInfo } : {}),
    });
  } catch (error) {
    console.error('Login error:', error);
    return Response.json(
      { error: 'Failed to login' },
      { status: 500 }
    );
  }
}
