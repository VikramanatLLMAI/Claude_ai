/**
 * Message Feedback API
 * POST /api/messages/feedback - Store feedback for a message
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireOrgAuth } from '@/lib/auth-middleware';
import {
  MessageFeedbackSchema,
  validate,
  formatValidationErrors,
} from '@/lib/validation';
import { checkRateLimit, RATE_LIMITS, rateLimitResponse } from '@/lib/rate-limiter';
import { validateOrigin, originDeniedResponse } from '@/lib/origin-validator';

export async function POST(req: NextRequest) {
  // Origin validation for mutation requests
  if (!validateOrigin(req)) return originDeniedResponse();

  const auth = await requireOrgAuth(req);
  if (auth instanceof NextResponse) return auth;
  const { user, tenantDb } = auth;

  // Rate limiting: 60 requests per minute per user (api tier)
  const rl = checkRateLimit(`api:${user.id}`, RATE_LIMITS.api);
  if (!rl.allowed) return rateLimitResponse(rl.retryAfterSeconds);

  try {
    const body = await req.json();

    // Validate request body
    const validation = validate(MessageFeedbackSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        { error: formatValidationErrors(validation.errors!) },
        { status: 400 }
      );
    }

    const { messageId, feedback, comment } = validation.data!;

    // Get current message (tenant-scoped)
    const message = await tenantDb.message.findUnique({
      where: { id: messageId },
      include: { conversation: true },
    });

    if (!message) {
      return NextResponse.json(
        { error: 'Message not found' },
        { status: 404 }
      );
    }

    // Verify the message belongs to a conversation owned by the user
    if (message.conversation.userId !== user.id) {
      return NextResponse.json(
        { error: 'Not authorized to provide feedback on this message' },
        { status: 403 }
      );
    }

    // Update message metadata with feedback
    const existingMetadata = (message.metadata as Record<string, unknown>) || {};
    const updatedMetadata = {
      ...existingMetadata,
      feedback: {
        rating: feedback,
        comment: comment || null,
        timestamp: new Date().toISOString(),
      },
    };

    // Update the message (tenant-scoped)
    const updatedMessage = await tenantDb.message.update({
      where: { id: messageId },
      data: {
        metadata: updatedMetadata,
        editedAt: new Date(),
      },
    });

    if (!updatedMessage) {
      return NextResponse.json(
        { error: 'Failed to save feedback' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      messageId,
      feedback,
    });
  } catch (error) {
    console.error('Feedback error:', error);
    return NextResponse.json(
      { error: 'Failed to save feedback' },
      { status: 500 }
    );
  }
}
