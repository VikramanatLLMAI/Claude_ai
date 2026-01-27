import { prisma } from "@/lib/db"
import { NextResponse } from "next/server"

type RouteParams = { params: Promise<{ id: string }> }

// GET /api/conversations/[id] - Get a single conversation with messages
export async function GET(req: Request, { params }: RouteParams) {
  try {
    const { id } = await params

    const conversation = await prisma.conversation.findUnique({
      where: { id },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
        },
      },
    })

    if (!conversation) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      )
    }

    return NextResponse.json(conversation)
  } catch (error) {
    console.error("Error fetching conversation:", error)
    return NextResponse.json(
      { error: "Failed to fetch conversation" },
      { status: 500 }
    )
  }
}

// PATCH /api/conversations/[id] - Update a conversation
export async function PATCH(req: Request, { params }: RouteParams) {
  try {
    const { id } = await params
    const body = await req.json()
    const { title, isPinned, isShared, model } = body

    const conversation = await prisma.conversation.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(isPinned !== undefined && { isPinned }),
        ...(isShared !== undefined && { isShared }),
        ...(model !== undefined && { model }),
      },
    })

    return NextResponse.json(conversation)
  } catch (error) {
    console.error("Error updating conversation:", error)
    return NextResponse.json(
      { error: "Failed to update conversation" },
      { status: 500 }
    )
  }
}

// DELETE /api/conversations/[id] - Delete a conversation
export async function DELETE(req: Request, { params }: RouteParams) {
  try {
    const { id } = await params

    await prisma.conversation.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting conversation:", error)
    return NextResponse.json(
      { error: "Failed to delete conversation" },
      { status: 500 }
    )
  }
}
