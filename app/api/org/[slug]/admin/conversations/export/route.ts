/**
 * Org Admin Conversation Export API
 *
 * POST /api/org/[slug]/admin/conversations/export
 *
 * Exports selected conversations as JSON. For a single conversation, returns
 * JSON directly. For multiple, creates a zip file using JSZip.
 * Requires conversationVisibility to be enabled.
 *
 * Body: { conversationIds: string[] }
 *
 * Covers: OVIS-04
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireOrgAdmin } from '@/lib/auth-middleware';
import prisma from '@/lib/db';
import { exportConversations } from '@/lib/services/conversation-visibility-service';
import JSZip from 'jszip';
import { validate, ConversationExportSchema } from '@/lib/validation';

export async function POST(req: NextRequest) {
  const auth = await requireOrgAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const { organization, tenantDb } = auth;

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

    const body = await req.json();
    const result = validate(ConversationExportSchema, body);
    if (!result.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: result.errors!.map(e => ({ field: e.path.join('.'), message: e.message })) },
        { status: 400 }
      );
    }

    const exported = await exportConversations(tenantDb, result.data!.conversationIds);

    if (exported.length === 0) {
      return NextResponse.json(
        { error: 'No conversations found for the given IDs' },
        { status: 404 }
      );
    }

    const dateStr = new Date().toISOString().slice(0, 10);

    // Single conversation: return JSON directly
    if (exported.length === 1) {
      return new NextResponse(JSON.stringify(exported[0], null, 2), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="conversation-${dateStr}.json"`,
        },
      });
    }

    // Multiple conversations: create zip
    const zip = new JSZip();
    for (const item of exported) {
      const filename = `conversation-${item.conversation.id.slice(0, 8)}.json`;
      zip.file(filename, JSON.stringify(item, null, 2));
    }

    const zipBuffer = await zip.generateAsync({ type: 'uint8array' });

    return new NextResponse(zipBuffer as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="conversations-export-${dateStr}.zip"`,
      },
    });
  } catch (error) {
    console.error('Org conversation export API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
