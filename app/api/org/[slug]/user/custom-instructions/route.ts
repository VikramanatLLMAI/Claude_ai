/**
 * User Custom Instructions API
 *
 * GET   /api/org/[slug]/user/custom-instructions - Get user's custom instructions
 * PATCH /api/org/[slug]/user/custom-instructions - Update user's custom instructions
 *
 * Custom instructions are stored on OrgMember (org-specific, not user-global).
 * Token budget: 200 tokens max (TOKEN_LIMITS.user) with SERVER_MARGIN.
 * Respects role-level customInstructionsEnabled flag.
 *
 * Protected by requireOrgAuth middleware.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireOrgAuth } from '@/lib/auth-middleware';
import { TOKEN_LIMITS, SERVER_MARGIN, estimateTokenCount } from '@/lib/token-counter';
import { z } from 'zod';
import { formatValidationErrors } from '@/lib/validation';

// Max character limit: tokens * ~4 chars/token * server margin
const MAX_CHARS = Math.ceil(TOKEN_LIMITS.user * 4 * SERVER_MARGIN);

const UserCustomInstructionsSchema = z.object({
  customInstructions: z.string().max(MAX_CHARS, 'Instructions text is too long'),
}).refine(
  (data) => {
    const tokenCount = estimateTokenCount(data.customInstructions);
    return tokenCount <= Math.ceil(TOKEN_LIMITS.user * SERVER_MARGIN);
  },
  { message: `Custom instructions exceed the ${TOKEN_LIMITS.user} token limit`, path: ['customInstructions'] }
);

// GET /api/org/[slug]/user/custom-instructions
export async function GET(req: NextRequest) {
  const auth = await requireOrgAuth(req);
  if (auth instanceof NextResponse) return auth;

  try {
    return NextResponse.json({
      customInstructions: auth.orgMember.customInstructions || '',
      enabled: auth.role.customInstructionsEnabled,
      maxTokens: TOKEN_LIMITS.user,
    });
  } catch (error) {
    console.error('Failed to get custom instructions:', error);
    return NextResponse.json(
      { error: 'Failed to load custom instructions' },
      { status: 500 }
    );
  }
}

// PATCH /api/org/[slug]/user/custom-instructions
export async function PATCH(req: NextRequest) {
  const auth = await requireOrgAuth(req);
  if (auth instanceof NextResponse) return auth;

  try {
    // Check if custom instructions are enabled for this role
    if (!auth.role.customInstructionsEnabled) {
      return NextResponse.json(
        { error: 'Custom instructions disabled for your role' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const parsed = UserCustomInstructionsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: formatValidationErrors(parsed.error.issues) },
        { status: 400 }
      );
    }

    // Update OrgMember customInstructions (org-specific)
    await auth.tenantDb.orgMember.update({
      where: { id: auth.orgMember.id },
      data: { customInstructions: parsed.data.customInstructions || null },
    });

    return NextResponse.json({
      customInstructions: parsed.data.customInstructions,
      enabled: auth.role.customInstructionsEnabled,
      maxTokens: TOKEN_LIMITS.user,
    });
  } catch (error) {
    console.error('Failed to update custom instructions:', error);
    return NextResponse.json(
      { error: 'Failed to save custom instructions' },
      { status: 500 }
    );
  }
}
