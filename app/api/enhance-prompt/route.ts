/**
 * Enhance Prompt API
 *
 * POST /api/enhance-prompt - Enhance a prompt using Claude Haiku 4.5
 *
 * Accepts a text and type, returns AI-enhanced version of the text.
 * Auth: Super Admin required for 'platform' type, basic auth for all others.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireSuperAdmin } from '@/lib/auth-middleware';
import { generateText } from 'ai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { validate, EnhancePromptSchema } from '@/lib/validation';
import { checkRateLimit, RATE_LIMITS, rateLimitResponse } from '@/lib/rate-limiter';
import { validateOrigin, originDeniedResponse } from '@/lib/origin-validator';

const SYSTEM_PROMPTS: Record<string, string> = {
  platform:
    'You are an expert AI prompt engineer. Improve this platform-level system prompt to be clearer, better structured, and more effective at guiding AI behavior. Maintain the original intent.',
  'org-instructions':
    'You are an expert AI prompt engineer. Improve these organization instructions to be clearer and more actionable for guiding AI behavior within a business context. Maintain the original intent.',
  'org-restrictions':
    'You are an expert AI prompt engineer. Improve these AI restriction rules to be more precise and harder to circumvent. Each restriction should be clear and unambiguous. Maintain the original intent.',
  'role-instructions':
    'You are an expert AI prompt engineer. Improve these role-specific instructions to be clearer and more targeted for the specific role. Maintain the original intent.',
  'role-restrictions':
    'You are an expert AI prompt engineer. Improve these role-specific restrictions to be more precise and harder to circumvent. Each restriction should be clear and unambiguous. Maintain the original intent.',
};

const VALID_TYPES = Object.keys(SYSTEM_PROMPTS);

export async function POST(req: NextRequest) {
  // Origin validation for mutation requests
  if (!validateOrigin(req)) return originDeniedResponse();

  try {
    const body = await req.json();
    const validation = validate(EnhancePromptSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.errors!.map(e => ({ field: e.path.join('.'), message: e.message })) },
        { status: 400 }
      );
    }

    const { text, type } = validation.data!;

    // Auth check based on type
    if (type === 'platform') {
      const auth = await requireSuperAdmin(req);
      if (auth instanceof NextResponse) return auth;
    } else {
      const auth = await requireAuth(req);
      if (auth instanceof NextResponse) return auth;
    }

    // Create Anthropic provider
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Anthropic API key not configured' },
        { status: 500 }
      );
    }

    const anthropic = createAnthropic({ apiKey });

    const result = await generateText({
      model: anthropic('claude-haiku-4-5-20251001'),
      system: SYSTEM_PROMPTS[type],
      prompt: `Improve the following prompt. Return ONLY the improved text, no explanations or preamble.\n\nOriginal:\n${text}`,
      maxOutputTokens: 2048,
    });

    return NextResponse.json({ enhanced: result.text });
  } catch (error) {
    console.error('Failed to enhance prompt:', error);
    return NextResponse.json(
      { error: 'Failed to enhance prompt. Please try again.' },
      { status: 500 }
    );
  }
}
