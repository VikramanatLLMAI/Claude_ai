import { NextRequest, NextResponse } from 'next/server';
import {
  createConversation,
  getAllConversations,
  getConversationsBySolution,
  toConversationResponse,
} from '@/lib/storage';
import { requireAuth } from '@/lib/auth-middleware';

// GET /api/conversations - List all conversations
// Query params:
//   - solutionType: Filter by solution type (e.g., 'manufacturing', 'maintenance')
//   - all: If 'true', return all conversations regardless of solution type
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;

  try {
    const { searchParams } = new URL(req.url);
    const solutionType = searchParams.get('solutionType');
    const showAll = searchParams.get('all') === 'true';

    let conversations;

    if (showAll) {
      // Return all conversations regardless of solution type
      conversations = await getAllConversations(user.id);
    } else if (solutionType !== null) {
      // Filter by specific solution type (including empty string for general chat)
      const filterType = solutionType === '' ? null : solutionType;
      conversations = await getConversationsBySolution(filterType, user.id);
    } else {
      // Default: return all conversations (backward compatible)
      conversations = await getAllConversations(user.id);
    }

    return NextResponse.json(conversations.map(c => ({
      id: c.id,
      title: c.title,
      isPinned: c.isPinned,
      isShared: c.isShared,
      model: c.model,
      solutionType: c.solutionType,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
      lastMessage: null, // We don't have messages in the list query
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
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;

  try {
    const body = await req.json();
    const { title, model, solutionType } = body;

    const conversation = await createConversation({
      title: title || 'New Chat',
      model,
      solutionType,
      userId: user.id,
    });

    return NextResponse.json(toConversationResponse(conversation), { status: 201 });
  } catch (error) {
    console.error('Error creating conversation:', error);
    return NextResponse.json(
      { error: 'Failed to create conversation' },
      { status: 500 }
    );
  }
}
