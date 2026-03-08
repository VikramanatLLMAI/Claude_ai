/**
 * Org Admin Conversation Visibility Toggle API
 *
 * GET  /api/org/[slug]/admin/settings/visibility  -- Get current visibility state
 * PATCH /api/org/[slug]/admin/settings/visibility -- Toggle conversation visibility
 *
 * OVIS-07: Toggle change is logged in audit logs.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireOrgAdmin } from '@/lib/auth-middleware';
import prisma from '@/lib/db';
import { auditLog, getIpAddress } from '@/lib/services/audit-service';
import { validate, ConversationVisibilityToggleSchema } from '@/lib/validation';

/**
 * GET - Return current conversationVisibility boolean
 */
export async function GET(req: NextRequest) {
  const auth = await requireOrgAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const settings = await prisma.orgSettings.findUnique({
    where: { organizationId: auth.organization.id },
    select: { conversationVisibility: true },
  });

  return NextResponse.json({
    conversationVisibility: settings?.conversationVisibility ?? false,
  });
}

/**
 * PATCH - Toggle conversation visibility on/off
 */
export async function PATCH(req: NextRequest) {
  const auth = await requireOrgAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const { organization, user } = auth;
  const ipAddress = getIpAddress(req);

  try {
    const body = await req.json();
    const result = validate(ConversationVisibilityToggleSchema, body);
    if (!result.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: result.errors!.map(e => ({ field: e.path.join('.'), message: e.message })) },
        { status: 400 }
      );
    }
    const enabled = result.data!.enabled;

    await prisma.$transaction(async (tx) => {
      await tx.orgSettings.update({
        where: { organizationId: organization.id },
        data: { conversationVisibility: enabled },
      });

      // OVIS-07: Audit log the toggle change
      await auditLog.record(tx, {
        userId: user.id,
        action: 'conversation_visibility.toggled',
        targetType: 'OrgSettings',
        targetId: organization.id,
        organizationId: organization.id,
        ipAddress,
        metadata: { enabled },
      });
    });

    return NextResponse.json({ conversationVisibility: enabled });
  } catch (error) {
    console.error('Visibility toggle API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
