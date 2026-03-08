/**
 * Permitted Models API Endpoint
 *
 * GET /api/org/[slug]/models - Returns the models permitted for the current user's role,
 * filtered from the Model Registry. This endpoint replaces the hardcoded model list.
 * Frontend fetches from here instead of using the CLAUDE_MODELS constant.
 *
 * Covers: MODL-05 (Model Registry is single source of truth)
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireOrgAuth } from '@/lib/auth-middleware';
import { getModelsByIds } from '@/lib/services/model-registry-service';
import { checkRateLimit, RATE_LIMITS, rateLimitResponse } from '@/lib/rate-limiter';
import { validateOrigin, originDeniedResponse } from '@/lib/origin-validator';

export async function GET(req: NextRequest) {
  const auth = await requireOrgAuth(req);
  if (auth instanceof NextResponse) return auth;

  const { user, role, permissions } = auth;

  // Rate limiting: 60 requests per minute per user (api tier)
  const rlGet = checkRateLimit(`api:${user.id}`, RATE_LIMITS.api);
  if (!rlGet.allowed) return rateLimitResponse(rlGet.retryAfterSeconds);
  const allowedModelIds = Array.isArray(role.allowedModels)
    ? (role.allowedModels as string[])
    : [];

  // Fetch full model info from registry, filtered to active + permitted
  const models = await getModelsByIds(allowedModelIds);

  // Include role info for frontend (Admin Console visibility check)
  const isOrgAdmin = permissions.includes('org_admin') || role.name === 'Org Admin';

  return NextResponse.json({
    models: models.map(m => ({
      id: m.modelId,
      name: m.displayName,
      generationGroup: m.generationGroup,
      supportsThinking: m.supportsThinking,
      thinkingType: m.thinkingType,
      supportsVision: m.supportsVision,
      supportsTools: m.supportsTools,
      maxOutputTokens: m.maxOutputTokens,
      contextWindow: m.contextWindow,
    })),
    defaultModel: models[0]?.modelId || null,
    isOrgAdmin,
    promptSuggestions: (role.promptSuggestions as Array<{ title: string; prompt: string }>) || [],
  });
}
