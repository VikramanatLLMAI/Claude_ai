import { NextRequest, NextResponse } from 'next/server';
import { requireOrgAuth } from '@/lib/auth-middleware';
import { validate, UpdateArtifactSchema } from '@/lib/validation';

// GET /api/artifacts/[id] - Get a single artifact with full content
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireOrgAuth(req);
  if (auth instanceof NextResponse) return auth;
  const { user, tenantDb } = auth;

  try {
    const { id } = await params;
    const artifact = await tenantDb.artifact.findUnique({
      where: { id },
    });

    if (!artifact) {
      return NextResponse.json(
        { error: 'Artifact not found' },
        { status: 404 }
      );
    }

    // Verify user owns this artifact
    if (artifact.userId !== user.id) {
      return NextResponse.json(
        { error: 'Not authorized to access this artifact' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      id: artifact.id,
      conversationId: artifact.conversationId,
      messageId: artifact.messageId,
      type: artifact.type,
      title: artifact.title,
      content: artifact.content,
      createdAt: artifact.createdAt.toISOString(),
      updatedAt: artifact.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error('Error fetching artifact:', error);
    return NextResponse.json(
      { error: 'Failed to fetch artifact' },
      { status: 500 }
    );
  }
}

// PATCH /api/artifacts/[id] - Update an artifact
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireOrgAuth(req);
  if (auth instanceof NextResponse) return auth;
  const { user, tenantDb } = auth;

  try {
    const { id } = await params;
    const body = await req.json();
    const result = validate(UpdateArtifactSchema, body);
    if (!result.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: result.errors!.map(e => ({ field: e.path.join('.'), message: e.message })) },
        { status: 400 }
      );
    }
    const data = result.data!;

    const artifact = await tenantDb.artifact.findUnique({
      where: { id },
    });
    if (!artifact) {
      return NextResponse.json(
        { error: 'Artifact not found' },
        { status: 404 }
      );
    }

    // Verify user owns this artifact
    if (artifact.userId !== user.id) {
      return NextResponse.json(
        { error: 'Not authorized to update this artifact' },
        { status: 403 }
      );
    }

    const updated = await tenantDb.artifact.update({
      where: { id },
      data: {
        ...(data.title && { title: data.title }),
        ...(data.content && { content: data.content }),
      },
    });

    return NextResponse.json({
      id: updated.id,
      conversationId: updated.conversationId,
      messageId: updated.messageId,
      type: updated.type,
      title: updated.title,
      content: updated.content,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error('Error updating artifact:', error);
    return NextResponse.json(
      { error: 'Failed to update artifact' },
      { status: 500 }
    );
  }
}

// DELETE /api/artifacts/[id] - Delete an artifact
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireOrgAuth(req);
  if (auth instanceof NextResponse) return auth;
  const { user, tenantDb } = auth;

  try {
    const { id } = await params;

    const artifact = await tenantDb.artifact.findUnique({
      where: { id },
    });
    if (!artifact) {
      return NextResponse.json(
        { error: 'Artifact not found' },
        { status: 404 }
      );
    }

    // Verify user owns this artifact
    if (artifact.userId !== user.id) {
      return NextResponse.json(
        { error: 'Not authorized to delete this artifact' },
        { status: 403 }
      );
    }

    await tenantDb.artifact.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting artifact:', error);
    return NextResponse.json(
      { error: 'Failed to delete artifact' },
      { status: 500 }
    );
  }
}
