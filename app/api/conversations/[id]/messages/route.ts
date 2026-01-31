import {
  getConversation,
  addMessage,
  getMessages,
  clearMessages,
  toUIMessage,
} from '@/lib/storage';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/conversations/[id]/messages - List all messages in conversation
export async function GET(req: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const conversation = await getConversation(id);

    if (!conversation) {
      return Response.json(
        { error: 'Conversation not found' },
        { status: 404 }
      );
    }

    const messages = await getMessages(id);
    return Response.json(messages.map(toUIMessage));
  } catch (error) {
    console.error('Error fetching messages:', error);
    return Response.json(
      { error: 'Failed to fetch messages' },
      { status: 500 }
    );
  }
}

// POST /api/conversations/[id]/messages - Add message to conversation
export async function POST(req: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { role, content, parts } = body;

    if (!role || !content) {
      return Response.json(
        { error: 'Role and content are required' },
        { status: 400 }
      );
    }

    const message = await addMessage(id, { role, content, parts });

    if (!message) {
      return Response.json(
        { error: 'Conversation not found' },
        { status: 404 }
      );
    }

    return Response.json(toUIMessage(message), { status: 201 });
  } catch (error) {
    console.error('Error adding message:', error);
    return Response.json(
      { error: 'Failed to add message' },
      { status: 500 }
    );
  }
}

// DELETE /api/conversations/[id]/messages - Clear all messages in conversation
export async function DELETE(req: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const cleared = await clearMessages(id);

    if (!cleared) {
      return Response.json(
        { error: 'Conversation not found' },
        { status: 404 }
      );
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('Error clearing messages:', error);
    return Response.json(
      { error: 'Failed to clear messages' },
      { status: 500 }
    );
  }
}
