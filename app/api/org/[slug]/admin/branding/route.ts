/**
 * Login Branding API Endpoint
 *
 * GET /api/org/[slug]/admin/branding  -- Return login branding data
 * PUT /api/org/[slug]/admin/branding  -- Update login branding data
 *
 * Requires Org Admin authentication.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireOrgAdmin } from '@/lib/auth-middleware';
import { getLoginBranding, upsertLoginBranding } from '@/lib/services/login-branding-service';
import { getIpAddress, auditLog } from '@/lib/services/audit-service';
import prisma from '@/lib/db';
import { z } from 'zod';

const FeatureCardSchema = z.object({
  icon: z.string().max(50),
  title: z.string().max(100),
  subtitle: z.string().max(200),
});

const BrandingSchema = z.object({
  loginHeadline: z.string().max(200, 'Headline must be at most 200 characters').optional().nullable(),
  loginBadge: z.string().max(100, 'Badge must be at most 100 characters').optional().nullable(),
  loginDescription: z.string().max(500, 'Description must be at most 500 characters').optional().nullable(),
  loginFeatureCards: z.array(FeatureCardSchema).max(4, 'Maximum 4 feature cards allowed').optional(),
});

/**
 * GET - Return current login branding data
 */
export async function GET(req: NextRequest) {
  const auth = await requireOrgAdmin(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const branding = await getLoginBranding(auth.organization.id);

    return NextResponse.json(branding ?? {
      loginHeadline: null,
      loginBadge: null,
      loginDescription: null,
      loginFeatureCards: [],
    });
  } catch (error) {
    console.error('Branding GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT - Update login branding data
 */
export async function PUT(req: NextRequest) {
  const auth = await requireOrgAdmin(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await req.json();
    const parsed = BrandingSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues.map((i) => i.message).join(', ') },
        { status: 400 }
      );
    }

    const ipAddress = getIpAddress(req);
    const orgId = auth.organization.id;

    const updated = await upsertLoginBranding(orgId, parsed.data);

    await prisma.$transaction(async (tx) => {
      await auditLog.record(tx, {
        userId: auth.user.id,
        action: 'login_branding_updated',
        targetType: 'LoginBranding',
        targetId: orgId,
        organizationId: orgId,
        ipAddress,
        metadata: {
          headline: parsed.data.loginHeadline,
          badge: parsed.data.loginBadge,
          featureCardCount: parsed.data.loginFeatureCards?.length ?? 0,
        },
      });
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Branding PUT error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
