import { NextRequest, NextResponse } from 'next/server';
import { requireOrgAuth } from '@/lib/auth-middleware';
import { toUIMessage } from '@/lib/storage';
import type { Prisma } from '@/lib/generated/prisma/client';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/conversations/[id]/messages - List all messages in conversation
export async function GET(req: NextRequest, { params }: RouteParams) {
  const auth = await requireOrgAuth(req);
  if (auth instanceof NextResponse) return auth;
  const { user, tenantDb } = auth;

  try {
    const { id } = await params;
    const conversation = await tenantDb.conversation.findUnique({
      where: { id },
    });

    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      );
    }

    // Verify ownership
    if (conversation.userId !== user.id) {
      return NextResponse.json(
        { error: 'Not authorized to access this conversation' },
        { status: 403 }
      );
    }

    const messages = await tenantDb.message.findMany({
      where: { conversationId: id },
      orderBy: { createdAt: 'asc' },
    });
    return NextResponse.json(messages.map(toUIMessage));
  } catch (error) {
    console.error('Error fetching messages:', error);
    return NextResponse.json(
      { error: 'Failed to fetch messages' },
      { status: 500 }
    );
  }
}

// POST /api/conversations/[id]/messages - Add message to conversation
export async function POST(req: NextRequest, { params }: RouteParams) {
  const auth = await requireOrgAuth(req);
  if (auth instanceof NextResponse) return auth;
  const { user, tenantDb } = auth;

  try {
    const { id } = await params;
    const conversation = await tenantDb.conversation.findUnique({
      where: { id },
    });

    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      );
    }

    // Verify ownership
    if (conversation.userId !== user.id) {
      return NextResponse.json(
        { error: 'Not authorized to access this conversation' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { role, content, parts } = body;

    if (!role || !content) {
      return NextResponse.json(
        { error: 'Role and content are required' },
        { status: 400 }
      );
    }

    const message = await tenantDb.message.create({
      data: {
        organizationId: '' as string,
        conversationId: id,
        role,
        content,
        // Cast required: Prisma InputJsonValue is stricter than runtime Json
        parts: ((parts as object) ?? null) as Prisma.InputJsonValue,
        metadata: {} as Prisma.InputJsonValue,
      },
    });

    // Update conversation's lastMessageAt (non-blocking)
    tenantDb.conversation.update({
      where: { id },
      data: { lastMessageAt: new Date() },
    }).catch(err => console.error('Error updating lastMessageAt:', err));

    return NextResponse.json(toUIMessage(message), { status: 201 });
  } catch (error) {
    console.error('Error adding message:', error);
    return NextResponse.json(
      { error: 'Failed to add message' },
      { status: 500 }
    );
  }
}

// DELETE /api/conversations/[id]/messages - Clear all messages in conversation
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const auth = await requireOrgAuth(req);
  if (auth instanceof NextResponse) return auth;
  const { user, tenantDb } = auth;

  try {
    const { id } = await params;
    const conversation = await tenantDb.conversation.findUnique({
      where: { id },
    });

    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      );
    }

    // Verify ownership
    if (conversation.userId !== user.id) {
      return NextResponse.json(
        { error: 'Not authorized to access this conversation' },
        { status: 403 }
      );
    }

    await tenantDb.message.deleteMany({
      where: { conversationId: id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error clearing messages:', error);
    return NextResponse.json(
      { error: 'Failed to clear messages' },
      { status: 500 }
    );
  }
}
