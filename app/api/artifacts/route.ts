import { NextRequest, NextResponse } from 'next/server';
import { getConversationArtifacts, createArtifact } from '@/lib/storage';

// Default user ID for demo mode
const DEMO_USER_ID = 'demo-user-id';

// GET /api/artifacts?conversationId=xxx - Get all artifacts for a conversation
export async function GET(req: NextRequest) {
  try {
    const conversationId = req.nextUrl.searchParams.get('conversationId');

    if (!conversationId) {
      return NextResponse.json(
        { error: 'conversationId is required' },
        { status: 400 }
      );
    }

    const artifacts = await getConversationArtifacts(conversationId);

    return NextResponse.json(
      artifacts.map((a) => ({
        id: a.id,
        conversationId: a.conversationId,
        messageId: a.messageId,
        type: a.type,
        title: a.title,
        createdAt: a.createdAt.toISOString(),
        updatedAt: a.updatedAt.toISOString(),
        // Don't include full content in list response for performance
        contentLength: a.content.length,
      }))
    );
  } catch (error) {
    console.error('Error fetching artifacts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch artifacts' },
      { status: 500 }
    );
  }
}

// POST /api/artifacts - Create a new artifact
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { conversationId, messageId, type, title, content } = body;

    if (!conversationId || !messageId || !title || !content) {
      return NextResponse.json(
        { error: 'conversationId, messageId, title, and content are required' },
        { status: 400 }
      );
    }

    const artifact = await createArtifact({
      conversationId,
      messageId,
      userId: DEMO_USER_ID,
      type: type || 'html',
      title,
      content,
    });

    return NextResponse.json({
      id: artifact.id,
      conversationId: artifact.conversationId,
      messageId: artifact.messageId,
      type: artifact.type,
      title: artifact.title,
      createdAt: artifact.createdAt.toISOString(),
      updatedAt: artifact.updatedAt.toISOString(),
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating artifact:', error);
    return NextResponse.json(
      { error: 'Failed to create artifact' },
      { status: 500 }
    );
  }
}
