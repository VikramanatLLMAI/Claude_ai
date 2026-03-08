/**
 * Login Page Customization API
 *
 * GET /api/org/[slug]/admin/settings/login-page  -- Return tagline + welcome message
 * PUT /api/org/[slug]/admin/settings/login-page  -- Update tagline + welcome message
 *
 * Uses requireOrgAdmin for authorization.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireOrgAdmin } from '@/lib/auth-middleware';
import { getIpAddress, auditLog } from '@/lib/services/audit-service';
import prisma from '@/lib/db';
import { z } from 'zod';
import { checkRateLimit, RATE_LIMITS, rateLimitResponse } from '@/lib/rate-limiter';
import { validateOrigin, originDeniedResponse } from '@/lib/origin-validator';

const LoginPageSchema = z.object({
  tagline: z.string().max(100, 'Tagline must be at most 100 characters').optional(),
  welcomeMessage: z.string().max(500, 'Welcome message must be at most 500 characters').optional(),
});

/**
 * GET - Return current login page customization
 */
export async function GET(req: NextRequest) {
  const auth = await requireOrgAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const settings = await prisma.orgSettings.findUnique({
    where: { organizationId: auth.organization.id },
    select: { loginTagline: true, loginWelcomeMessage: true },
  });

  return NextResponse.json({
    tagline: settings?.loginTagline ?? null,
    welcomeMessage: settings?.loginWelcomeMessage ?? null,
  });
}

/**
 * PUT - Update login page tagline and welcome message
 */
export async function PUT(req: NextRequest) {
  // Origin validation for mutation requests
  if (!validateOrigin(req)) return originDeniedResponse();

  const auth = await requireOrgAdmin(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await req.json();
    const parsed = LoginPageSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues.map((i) => i.message).join(', ') },
        { status: 400 }
      );
    }

    const ipAddress = getIpAddress(req);
    const orgId = auth.organization.id;

    await prisma.$transaction(async (tx) => {
      await tx.orgSettings.upsert({
        where: { organizationId: orgId },
        create: {
          organizationId: orgId,
          loginTagline: parsed.data.tagline ?? null,
          loginWelcomeMessage: parsed.data.welcomeMessage ?? null,
        },
        update: {
          loginTagline: parsed.data.tagline ?? null,
          loginWelcomeMessage: parsed.data.welcomeMessage ?? null,
        },
      });

      await auditLog.record(tx, {
        userId: auth.user.id,
        action: 'login_page_updated',
        targetType: 'OrgSettings',
        targetId: orgId,
        organizationId: orgId,
        ipAddress,
        metadata: {
          tagline: parsed.data.tagline,
          welcomeMessage: parsed.data.welcomeMessage,
        },
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Login page settings error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
