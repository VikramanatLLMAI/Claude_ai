/**
 * Org Admin Logo Upload API
 *
 * POST   /api/org/[slug]/admin/logo  -- Upload org logo (multipart, max 500KB, PNG/SVG/JPEG)
 * DELETE /api/org/[slug]/admin/logo  -- Remove org logo
 *
 * Uses requireOrgAdmin for authorization.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireOrgAdmin } from '@/lib/auth-middleware';
import { getIpAddress, auditLog } from '@/lib/services/audit-service';
import prisma from '@/lib/db';
import { checkRateLimit, RATE_LIMITS, rateLimitResponse } from '@/lib/rate-limiter';
import { validateOrigin, originDeniedResponse } from '@/lib/origin-validator';

const MAX_LOGO_SIZE = 500 * 1024; // 500KB
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/svg+xml'];

/**
 * POST - Upload org logo
 * Accepts multipart form data with a "logo" file field.
 * Converts to Base64 data URI and stores in Organization.logoBase64.
 */
export async function POST(req: NextRequest) {
  // Origin validation for mutation requests
  if (!validateOrigin(req)) return originDeniedResponse();

  const auth = await requireOrgAdmin(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const formData = await req.formData();
    const file = formData.get('logo');

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: 'No logo file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Allowed: PNG, JPEG, SVG' },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_LOGO_SIZE) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 500KB' },
        { status: 400 }
      );
    }

    // Convert to Base64 data URI
    const buffer = Buffer.from(await file.arrayBuffer());
    const base64 = buffer.toString('base64');
    const dataUri = `data:${file.type};base64,${base64}`;

    const ipAddress = getIpAddress(req);
    const orgId = auth.organization.id;

    await prisma.$transaction(async (tx) => {
      await tx.organization.update({
        where: { id: orgId },
        data: { logoBase64: dataUri },
      });

      await auditLog.record(tx, {
        userId: auth.user.id,
        action: 'org_logo_updated',
        targetType: 'Organization',
        targetId: orgId,
        organizationId: orgId,
        ipAddress,
        metadata: { fileName: file.name, fileSize: file.size, fileType: file.type },
      });
    });

    return NextResponse.json({ success: true, logoBase64: dataUri });
  } catch (error) {
    console.error('Logo upload error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Remove org logo
 * Clears Organization.logoBase64 (set to null).
 */
export async function DELETE(req: NextRequest) {
  // Origin validation for mutation requests
  if (!validateOrigin(req)) return originDeniedResponse();

  const auth = await requireOrgAdmin(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const ipAddress = getIpAddress(req);
    const orgId = auth.organization.id;

    await prisma.$transaction(async (tx) => {
      await tx.organization.update({
        where: { id: orgId },
        data: { logoBase64: null },
      });

      await auditLog.record(tx, {
        userId: auth.user.id,
        action: 'org_logo_removed',
        targetType: 'Organization',
        targetId: orgId,
        organizationId: orgId,
        ipAddress,
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Logo removal error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
