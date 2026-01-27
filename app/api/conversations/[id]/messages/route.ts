import { prisma } from "@/lib/db"
import { NextResponse } from "next/server"

type RouteParams = { params: Promise<{ id: string }> }

// GET /api/conversations/[id]/messages - Get all messages for a conversation
export async function GET(req: Request, { params }: RouteParams) {
  try {
    const { id } = await params

    const messages = await prisma.message.findMany({
      where: { conversationId: id },
      orderBy: { createdAt: "asc" },
    })

    return NextResponse.json(messages)
  } catch (error) {
    console.error("Error fetching messages:", error)
    return NextResponse.json(
      { error: "Failed to fetch messages" },
      { status: 500 }
    )
  }
}

// POST /api/conversations/[id]/messages - Add a message to a conversation
export async function POST(req: Request, { params }: RouteParams) {
  try {
    const { id } = await params
    const body = await req.json()
    const { role, content } = body

    if (!role || !content) {
      return NextResponse.json(
        { error: "Role and content are required" },
        { status: 400 }
      )
    }

    // Create the message
    const message = await prisma.message.create({
      data: {
        role,
        content,
        conversationId: id,
      },
    })

    // Update conversation's updatedAt timestamp
    await prisma.conversation.update({
      where: { id },
      data: { updatedAt: new Date() },
    })

    return NextResponse.json(message, { status: 201 })
  } catch (error) {
    console.error("Error creating message:", error)
    return NextResponse.json(
      { error: "Failed to create message" },
      { status: 500 }
    )
  }
}

// DELETE /api/conversations/[id]/messages - Delete all messages in a conversation (clear chat)
export async function DELETE(req: Request, { params }: RouteParams) {
  try {
    const { id } = await params

    await prisma.message.deleteMany({
      where: { conversationId: id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting messages:", error)
    return NextResponse.json(
      { error: "Failed to delete messages" },
      { status: 500 }
    )
  }
}
