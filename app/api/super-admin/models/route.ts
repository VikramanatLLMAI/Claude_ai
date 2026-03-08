/**
 * Super Admin Model Registry API - List & Create
 *
 * GET  /api/super-admin/models - List all models (optionally filtered by status)
 * POST /api/super-admin/models - Create a new model
 *
 * All routes require Super Admin authentication.
 * AuditLog has NO PATCH/DELETE endpoints (SAFE-07 - immutable audit logs).
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth-middleware';
import { getIpAddress } from '@/lib/services/audit-service';
import { getAllModels, createModel } from '@/lib/services/model-registry-service';
import { checkRateLimit, RATE_LIMITS, rateLimitResponse } from '@/lib/rate-limiter';
import { validateOrigin, originDeniedResponse } from '@/lib/origin-validator';
import {
  CreateModelSchema,
  formatValidationErrors,
} from '@/lib/validation';

/**
 * GET /api/super-admin/models
 * List all models, optionally filtered by status query parameter.
 * Query params: ?status=ACTIVE or ?status=DEPRECATED
 */
export async function GET(req: NextRequest) {
  const authResult = await requireSuperAdmin(req);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const { searchParams } = new URL(req.url);
    const statusParam = searchParams.get('status');

    let status: 'ACTIVE' | 'DEPRECATED' | undefined;
    if (statusParam === 'ACTIVE' || statusParam === 'DEPRECATED') {
      status = statusParam;
    }

    const models = await getAllModels(status);
    return NextResponse.json(models);
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/super-admin/models
 * Create a new model in the registry.
 * Returns 201 on success, 409 if modelId already exists.
 */
export async function POST(req: NextRequest) {
  // Origin validation for mutation requests
  if (!validateOrigin(req)) return originDeniedResponse();

  const authResult = await requireSuperAdmin(req);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const body = await req.json();
    const parsed = CreateModelSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: formatValidationErrors(parsed.error.issues) },
        { status: 400 }
      );
    }

    const ipAddress = getIpAddress(req);
    const model = await createModel(
      parsed.data,
      authResult.user.id,
      ipAddress
    );

    return NextResponse.json(model, { status: 201 });
  } catch (error) {
    if (error instanceof Error) {
      // Handle unique constraint violation (duplicate modelId)
      if (
        'code' in error &&
        (error as { code: string }).code === 'P2002'
      ) {
        return NextResponse.json(
          { error: 'A model with this model ID already exists' },
          { status: 409 }
        );
      }
    }
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
