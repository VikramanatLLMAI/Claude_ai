import { NextRequest, NextResponse } from 'next/server';
import { requireOrgAuth } from '@/lib/auth-middleware';
import { validate, CreateArtifactSchema } from '@/lib/validation';
import { checkRateLimit, RATE_LIMITS, rateLimitResponse } from '@/lib/rate-limiter';
import { validateOrigin, originDeniedResponse } from '@/lib/origin-validator';

// GET /api/artifacts?conversationId=xxx - Get all artifacts for a conversation
export async function GET(req: NextRequest) {
  const auth = await requireOrgAuth(req);
  if (auth instanceof NextResponse) return auth;
  const { user, tenantDb } = auth;

  // Rate limiting: 60 requests per minute per user (api tier)
  const rlGet = checkRateLimit(`api:${user.id}`, RATE_LIMITS.api);
  if (!rlGet.allowed) return rateLimitResponse(rlGet.retryAfterSeconds);

  try {
    const conversationId = req.nextUrl.searchParams.get('conversationId');

    if (!conversationId) {
      return NextResponse.json(
        { error: 'conversationId is required' },
        { status: 400 }
      );
    }

    // Verify user owns this conversation (tenant-scoped)
    const conversation = await tenantDb.conversation.findUnique({
      where: { id: conversationId },
    });
    if (!conversation || conversation.userId !== user.id) {
      return NextResponse.json(
        { error: 'Not authorized to access this conversation' },
        { status: 403 }
      );
    }

    const artifacts = await tenantDb.artifact.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'desc' },
    });

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
  // Origin validation for mutation requests
  if (!validateOrigin(req)) return originDeniedResponse();

  const auth = await requireOrgAuth(req);
  if (auth instanceof NextResponse) return auth;
  const { user, tenantDb } = auth;

  // Rate limiting: 60 requests per minute per user (api tier)
  const rlPost = checkRateLimit(`api:${user.id}`, RATE_LIMITS.api);
  if (!rlPost.allowed) return rateLimitResponse(rlPost.retryAfterSeconds);

  try {
    const body = await req.json();
    const result = validate(CreateArtifactSchema, body);
    if (!result.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: result.errors!.map(e => ({ field: e.path.join('.'), message: e.message })) },
        { status: 400 }
      );
    }
    const data = result.data!;

    // Verify user owns this conversation (tenant-scoped)
    const conversation = await tenantDb.conversation.findUnique({
      where: { id: data.conversationId },
    });
    if (!conversation || conversation.userId !== user.id) {
      return NextResponse.json(
        { error: 'Not authorized to access this conversation' },
        { status: 403 }
      );
    }

    const artifact = await tenantDb.artifact.create({
      data: {
        organizationId: '' as string,
        conversationId: data.conversationId,
        messageId: data.messageId,
        userId: user.id,
        type: data.type,
        title: data.title,
        content: data.content,
      },
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
