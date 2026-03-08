import { NextRequest, NextResponse } from 'next/server';
import { toUIMessage } from '@/lib/storage';
import { requireOrgAuth } from '@/lib/auth-middleware';
import { checkRateLimit, RATE_LIMITS, rateLimitResponse } from '@/lib/rate-limiter';
import { validateOrigin, originDeniedResponse } from '@/lib/origin-validator';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/conversations/[id] - Get single conversation with messages
export async function GET(req: NextRequest, { params }: RouteParams) {
  const auth = await requireOrgAuth(req);
  if (auth instanceof NextResponse) return auth;
  const { user, tenantDb } = auth;

  // Rate limiting: 60 requests per minute per user (api tier)
  const rlGet = checkRateLimit(`api:${user.id}`, RATE_LIMITS.api);
  if (!rlGet.allowed) return rateLimitResponse(rlGet.retryAfterSeconds);

  try {
    const { id } = await params;
    const conversation = await tenantDb.conversation.findUnique({
      where: { id },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      );
    }

    // Verify the conversation belongs to the authenticated user
    if (conversation.userId !== user.id) {
      return NextResponse.json(
        { error: 'Not authorized to access this conversation' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      id: conversation.id,
      title: conversation.title,
      isPinned: conversation.isPinned,
      isShared: conversation.isShared,
      model: conversation.model,
      createdAt: conversation.createdAt.toISOString(),
      updatedAt: conversation.updatedAt.toISOString(),
      messages: conversation.messages.map(toUIMessage),
    });
  } catch (error) {
    console.error('Error fetching conversation:', error);
    return NextResponse.json(
      { error: 'Failed to fetch conversation' },
      { status: 500 }
    );
  }
}

// PATCH /api/conversations/[id] - Update conversation
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  // Origin validation for mutation requests
  if (!validateOrigin(req)) return originDeniedResponse();

  const auth = await requireOrgAuth(req);
  if (auth instanceof NextResponse) return auth;
  const { user, tenantDb } = auth;

  // Rate limiting: 60 requests per minute per user (api tier)
  const rlPatch = checkRateLimit(`api:${user.id}`, RATE_LIMITS.api);
  if (!rlPatch.allowed) return rateLimitResponse(rlPatch.retryAfterSeconds);

  try {
    const { id } = await params;

    // Verify ownership before updating (tenantDb already scopes to org)
    const existing = await tenantDb.conversation.findUnique({
      where: { id },
    });
    if (!existing) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      );
    }
    // SAFE-11: Org Admin conversation access is read-only.
    // This ownership check MUST remain even when Phase 7 adds Org Admin read access to all conversations.
    // Org Admins may read others' conversations but MUST NOT edit or delete them.
    if (existing.userId !== user.id) {
      return NextResponse.json(
        { error: 'Not authorized to modify this conversation' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { title, isPinned, isShared, model } = body;

    const conversation = await tenantDb.conversation.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(isPinned !== undefined && { isPinned }),
        ...(isShared !== undefined && { isShared }),
        ...(model !== undefined && { model }),
      },
    });

    return NextResponse.json({
      id: conversation.id,
      title: conversation.title,
      isPinned: conversation.isPinned,
      isShared: conversation.isShared,
      model: conversation.model,
      createdAt: conversation.createdAt.toISOString(),
      updatedAt: conversation.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error('Error updating conversation:', error);
    return NextResponse.json(
      { error: 'Failed to update conversation' },
      { status: 500 }
    );
  }
}

// DELETE /api/conversations/[id] - Delete conversation
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  // Origin validation for mutation requests
  if (!validateOrigin(req)) return originDeniedResponse();

  const auth = await requireOrgAuth(req);
  if (auth instanceof NextResponse) return auth;
  const { user, tenantDb } = auth;

  // Rate limiting: 60 requests per minute per user (api tier)
  const rlDel = checkRateLimit(`api:${user.id}`, RATE_LIMITS.api);
  if (!rlDel.allowed) return rateLimitResponse(rlDel.retryAfterSeconds);

  try {
    const { id } = await params;

    // Verify ownership before deleting
    const existing = await tenantDb.conversation.findUnique({
      where: { id },
    });
    if (!existing) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      );
    }
    // SAFE-11: Org Admin conversation access is read-only.
    // This ownership check MUST remain even when Phase 7 adds Org Admin read access to all conversations.
    // Org Admins may read others' conversations but MUST NOT edit or delete them.
    if (existing.userId !== user.id) {
      return NextResponse.json(
        { error: 'Not authorized to modify this conversation' },
        { status: 403 }
      );
    }

    await tenantDb.conversation.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting conversation:', error);
    return NextResponse.json(
      { error: 'Failed to delete conversation' },
      { status: 500 }
    );
  }
}
