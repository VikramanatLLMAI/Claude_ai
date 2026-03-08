/**
 * Org Admin Models API - List Active Models
 *
 * GET /api/org/[slug]/admin/models - Returns all active models from the Model Registry.
 * This endpoint is org-admin accessible (requireOrgAdmin), unlike the super-admin-only
 * /api/admin/models endpoint. Used by the RoleModelAssignment component to show
 * available models for role-based model access configuration.
 *
 * No POST/PATCH/DELETE -- model CRUD stays in super-admin routes.
 *
 * Covers: OLLM-01, OLLM-02, MODL-05
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireOrgAdmin } from '@/lib/auth-middleware';
import { getAllModels } from '@/lib/services/model-registry-service';
import { checkRateLimit, RATE_LIMITS, rateLimitResponse } from '@/lib/rate-limiter';
import { validateOrigin, originDeniedResponse } from '@/lib/origin-validator';

/**
 * GET /api/org/[slug]/admin/models
 * Returns all active models from the platform Model Registry.
 * Requires org admin authentication.
 */
export async function GET(req: NextRequest) {
  const authResult = await requireOrgAdmin(req);
  if (authResult instanceof NextResponse) return authResult;

  // Rate limiting: 60 requests per minute per user (api tier)
  const rlGet = checkRateLimit(`api:${authResult.user.id}`, RATE_LIMITS.api);
  if (!rlGet.allowed) return rateLimitResponse(rlGet.retryAfterSeconds);

  try {
    const models = await getAllModels('ACTIVE');
    return NextResponse.json(models);
  } catch (error) {
    console.error('Error fetching models for org admin:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
