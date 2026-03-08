/**
 * User Profile API
 *
 * GET   /api/org/[slug]/profile - Get current user's profile
 * PATCH /api/org/[slug]/profile - Update display name and/or avatar
 *
 * Profile is user-level data enriched with org context (role, join date).
 * Email and role are read-only (UPRF-03, UPRF-04).
 * Avatar must be a data:image/ Base64 string, decoded size < 200KB.
 *
 * Protected by requireOrgAuth middleware (any org member).
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireOrgAuth } from '@/lib/auth-middleware';
import { auditLog, getIpAddress } from '@/lib/services/audit-service';
import prisma from '@/lib/db';
import { z } from 'zod';
import { formatValidationErrors } from '@/lib/validation';
import { checkRateLimit, RATE_LIMITS, rateLimitResponse } from '@/lib/rate-limiter';
import { validateOrigin, originDeniedResponse } from '@/lib/origin-validator';

const MAX_AVATAR_BYTES = 200 * 1024; // 200KB decoded

const UpdateProfileSchema = z.object({
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be at most 100 characters')
    .optional(),
  avatarBase64: z
    .string()
    .nullable()
    .optional(),
});

/**
 * GET /api/org/[slug]/profile
 * Returns the current user's profile with org-context enrichment.
 */
export async function GET(req: NextRequest) {
  const auth = await requireOrgAuth(req);
  if (auth instanceof NextResponse) return auth;

  try {
    return NextResponse.json({
      name: auth.user.name,
      email: auth.user.email,
      avatarBase64: auth.user.avatarBase64 || null,
      roleName: auth.role.name,
      roleId: auth.role.id,
      joinedAt: auth.orgMember.joinedAt,
    });
  } catch (error) {
    console.error('Failed to get profile:', error);
    return NextResponse.json(
      { error: 'Failed to load profile' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/org/[slug]/profile
 * Update display name and/or avatar. Email and role fields in body are ignored.
 */
export async function PATCH(req: NextRequest) {
  // Origin validation for mutation requests
  if (!validateOrigin(req)) return originDeniedResponse();

  const auth = await requireOrgAuth(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await req.json();
    const parsed = UpdateProfileSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: formatValidationErrors(parsed.error.issues) },
        { status: 400 }
      );
    }

    const updateData: Record<string, unknown> = {};
    const changes: string[] = [];

    // Name update
    if (parsed.data.name !== undefined) {
      updateData.name = parsed.data.name;
      changes.push('name');
    }

    // Avatar update
    if (parsed.data.avatarBase64 !== undefined) {
      if (parsed.data.avatarBase64 === null) {
        // Clear avatar
        updateData.avatarBase64 = null;
        changes.push('avatar_cleared');
      } else {
        // Validate Base64 image
        const avatar = parsed.data.avatarBase64;
        if (!avatar.startsWith('data:image/')) {
          return NextResponse.json(
            { error: 'Avatar must be a data:image/ Base64 string (PNG or JPEG)' },
            { status: 400 }
          );
        }

        // Extract the Base64 payload after the comma
        const commaIndex = avatar.indexOf(',');
        if (commaIndex === -1) {
          return NextResponse.json(
            { error: 'Invalid Base64 image format' },
            { status: 400 }
          );
        }

        const base64Data = avatar.slice(commaIndex + 1);
        // Estimate decoded size: Base64 is ~4/3 of binary
        const estimatedBytes = Math.ceil(base64Data.length * 3 / 4);
        if (estimatedBytes > MAX_AVATAR_BYTES) {
          return NextResponse.json(
            { error: `Avatar exceeds maximum size of 200KB (got ~${Math.round(estimatedBytes / 1024)}KB)` },
            { status: 400 }
          );
        }

        updateData.avatarBase64 = avatar;
        changes.push('avatar_updated');
      }
    }

    if (changes.length === 0) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      );
    }

    const ipAddress = getIpAddress(req);

    // User is NOT org-scoped, so use raw prisma (not tenantDb)
    const updatedUser = await prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({
        where: { id: auth.user.id },
        data: updateData,
        select: {
          id: true,
          name: true,
          email: true,
          avatarBase64: true,
        },
      });

      await auditLog.record(tx, {
        userId: auth.user.id,
        action: 'user.profile_updated',
        targetType: 'User',
        targetId: auth.user.id,
        organizationId: auth.organization.id,
        ipAddress,
        metadata: { changes },
      });

      return updated;
    });

    return NextResponse.json({
      name: updatedUser.name,
      email: updatedUser.email,
      avatarBase64: updatedUser.avatarBase64 || null,
      roleName: auth.role.name,
      roleId: auth.role.id,
      joinedAt: auth.orgMember.joinedAt,
    });
  } catch (error) {
    console.error('Failed to update profile:', error);
    return NextResponse.json(
      { error: 'Failed to update profile' },
      { status: 500 }
    );
  }
}
