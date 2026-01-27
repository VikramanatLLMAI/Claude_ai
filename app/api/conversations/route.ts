import { prisma } from "@/lib/db"
import { NextResponse } from "next/server"

// GET /api/conversations - List all conversations
export async function GET() {
  try {
    const conversations = await prisma.conversation.findMany({
      orderBy: [
        { isPinned: "desc" },
        { updatedAt: "desc" },
      ],
      include: {
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1, // Get only the last message for preview
        },
      },
    })

    // Transform to include lastMessage
    const transformedConversations = conversations.map((conv) => ({
      id: conv.id,
      title: conv.title,
      isPinned: conv.isPinned,
      isShared: conv.isShared,
      model: conv.model,
      solutionType: conv.solutionType,
      createdAt: conv.createdAt,
      updatedAt: conv.updatedAt,
      lastMessage: conv.messages[0]?.content || null,
    }))

    return NextResponse.json(transformedConversations)
  } catch (error) {
    console.error("Error fetching conversations:", error)
    return NextResponse.json(
      { error: "Failed to fetch conversations" },
      { status: 500 }
    )
  }
}

// POST /api/conversations - Create a new conversation
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { title, model, solutionType } = body

    const conversation = await prisma.conversation.create({
      data: {
        title: title || "New Chat",
        model: model || "us.anthropic.claude-sonnet-4-5-20250929-v1:0",
        solutionType: solutionType || null,
      },
    })

    // Track analytics event
    await prisma.analyticsEvent.create({
      data: {
        eventType: "conversation_created",
        solutionType: solutionType || null,
        conversationId: conversation.id,
        model: conversation.model,
        metadata: JSON.stringify({ title: conversation.title }),
      },
    }).catch((error) => {
      // Don't fail the request if analytics fails
      console.error("Error creating analytics event:", error)
    })

    return NextResponse.json(conversation, { status: 201 })
  } catch (error) {
    console.error("Error creating conversation:", error)
    return NextResponse.json(
      { error: "Failed to create conversation" },
      { status: 500 }
    )
  }
}
