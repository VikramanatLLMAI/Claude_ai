/**
 * Super Admin Model Registry API - Single Model Operations
 *
 * GET    /api/admin/models/[id] - Get a single model by UUID
 * PATCH  /api/admin/models/[id] - Update a model (e.g., deprecation, pricing)
 * DELETE /api/admin/models/[id] - Delete a model (fails if referenced by roles)
 *
 * All routes require Super Admin authentication.
 * AuditLog has NO PATCH/DELETE endpoints anywhere (SAFE-07 - immutable audit logs).
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth-middleware';
import { getIpAddress } from '@/lib/services/audit-service';
import {
  getModelById,
  updateModel,
  deleteModel,
} from '@/lib/services/model-registry-service';
import {
  UpdateModelSchema,
  formatValidationErrors,
} from '@/lib/validation';

/**
 * GET /api/admin/models/[id]
 * Get a single model by its internal UUID.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireSuperAdmin(req);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const { id } = await params;
    const model = await getModelById(id);

    if (!model) {
      return NextResponse.json(
        { error: 'Model not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(model);
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/models/[id]
 * Update a model's properties (pricing, status, capabilities, etc.).
 * Deprecation is validated to ensure no roles lose all active models.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireSuperAdmin(req);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const { id } = await params;
    const body = await req.json();
    const parsed = UpdateModelSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: formatValidationErrors(parsed.error.issues) },
        { status: 400 }
      );
    }

    const ipAddress = getIpAddress(req);
    const updated = await updateModel(
      id,
      parsed.data,
      authResult.user.id,
      ipAddress
    );

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Model not found') {
        return NextResponse.json(
          { error: 'Model not found' },
          { status: 404 }
        );
      }
      if (error.message.includes('Cannot deprecate model')) {
        return NextResponse.json(
          { error: error.message },
          { status: 409 }
        );
      }
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

/**
 * DELETE /api/admin/models/[id]
 * Hard-delete a model. Fails if any roles reference this model in allowedModels.
 * Returns 204 on success, 409 if referenced by roles.
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireSuperAdmin(req);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const { id } = await params;
    const ipAddress = getIpAddress(req);

    await deleteModel(id, authResult.user.id, ipAddress);

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Model not found') {
        return NextResponse.json(
          { error: 'Model not found' },
          { status: 404 }
        );
      }
      if (error.message.includes('Cannot delete model')) {
        return NextResponse.json(
          { error: error.message },
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
