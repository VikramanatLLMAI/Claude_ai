import {
  getConversation,
  updateConversation,
  deleteConversation,
  toConversationResponse,
  toUIMessage,
} from '@/lib/storage';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/conversations/[id] - Get single conversation with messages
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

    return Response.json({
      ...toConversationResponse(conversation),
      messages: conversation.messages.map(toUIMessage),
    });
  } catch (error) {
    console.error('Error fetching conversation:', error);
    return Response.json(
      { error: 'Failed to fetch conversation' },
      { status: 500 }
    );
  }
}

// PATCH /api/conversations/[id] - Update conversation
export async function PATCH(req: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { title, isPinned, isShared, model, solutionType } = body;

    const conversation = await updateConversation(id, {
      title,
      isPinned,
      isShared,
      model,
      solutionType,
    });

    if (!conversation) {
      return Response.json(
        { error: 'Conversation not found' },
        { status: 404 }
      );
    }

    return Response.json(toConversationResponse(conversation));
  } catch (error) {
    console.error('Error updating conversation:', error);
    return Response.json(
      { error: 'Failed to update conversation' },
      { status: 500 }
    );
  }
}

// DELETE /api/conversations/[id] - Delete conversation
export async function DELETE(req: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const deleted = await deleteConversation(id);

    if (!deleted) {
      return Response.json(
        { error: 'Conversation not found' },
        { status: 404 }
      );
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('Error deleting conversation:', error);
    return Response.json(
      { error: 'Failed to delete conversation' },
      { status: 500 }
    );
  }
}
