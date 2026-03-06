import { NextRequest, NextResponse } from 'next/server';
import { requireOrgAuth } from '@/lib/auth-middleware';

// GET /api/conversations - List all conversations for user in current org
export async function GET(req: NextRequest) {
  const auth = await requireOrgAuth(req);
  if (auth instanceof NextResponse) return auth;
  const { user, tenantDb } = auth;

  try {
    const conversations = await tenantDb.conversation.findMany({
      where: { userId: user.id },
      orderBy: [
        { isPinned: 'desc' },
        { updatedAt: 'desc' },
      ],
    });

    return NextResponse.json(conversations.map(c => ({
      id: c.id,
      title: c.title,
      isPinned: c.isPinned,
      isShared: c.isShared,
      model: c.model,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
      lastMessage: null,
    })));
  } catch (error) {
    console.error('Error fetching conversations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch conversations' },
      { status: 500 }
    );
  }
}

// POST /api/conversations - Create a new conversation
export async function POST(req: NextRequest) {
  const auth = await requireOrgAuth(req);
  if (auth instanceof NextResponse) return auth;
  const { user, tenantDb } = auth;

  try {
    const body = await req.json();
    const { title, model } = body;

    const conversation = await tenantDb.conversation.create({
      data: {
        organizationId: '' as string,
        userId: user.id,
        title: title || 'New Chat',
        model: model || 'claude-sonnet-4-5-20250929',
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
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating conversation:', error);
    return NextResponse.json(
      { error: 'Failed to create conversation' },
      { status: 500 }
    );
  }
}
