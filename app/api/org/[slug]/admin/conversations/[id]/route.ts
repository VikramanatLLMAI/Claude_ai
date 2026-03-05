/**
 * Org Admin Conversation Detail API
 *
 * GET /api/org/[slug]/admin/conversations/[id]
 *
 * Returns full conversation detail with messages for compliance viewing.
 * Read-only -- no modification endpoints (OVIS-05).
 * Requires conversationVisibility to be enabled in OrgSettings.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireOrgAdmin } from '@/lib/auth-middleware';
import prisma from '@/lib/db';
import { getConversationDetail } from '@/lib/services/conversation-visibility-service';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string }> }
) {
  const auth = await requireOrgAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const { organization, tenantDb } = auth;
  const { id } = await params;

  try {
    // Check visibility is enabled
    const settings = await prisma.orgSettings.findUnique({
      where: { organizationId: organization.id },
      select: { conversationVisibility: true },
    });

    if (!settings?.conversationVisibility) {
      return NextResponse.json(
        { error: 'Conversation visibility is not enabled' },
        { status: 403 }
      );
    }

    const detail = await getConversationDetail(tenantDb, id);

    if (!detail) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    return NextResponse.json(detail);
  } catch (error) {
    console.error('Org conversation detail API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
