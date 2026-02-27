/**
 * Org Admin Role Model Assignment API
 *
 * GET   /api/org/[slug]/admin/roles/[roleId]/models - Get role's allowed models
 * PATCH /api/org/[slug]/admin/roles/[roleId]/models - Update role's allowed models
 *
 * Requires Org Admin authentication.
 * Enforces minimum 1 model per role (CONTEXT.md).
 * Validates all model IDs exist in the Model Registry.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireOrgAdmin } from '@/lib/auth-middleware';
import { getIpAddress } from '@/lib/services/audit-service';
import { auditLog } from '@/lib/services/audit-service';
import { getModelsByIds } from '@/lib/services/model-registry-service';
import { z } from 'zod';
import { formatValidationErrors } from '@/lib/validation';
import prisma from '@/lib/db';

/** Zod schema: at least one model required per role */
const UpdateAllowedModelsSchema = z.object({
  allowedModels: z
    .array(z.string().min(1))
    .min(1, 'At least one model must be enabled per role'),
});

/**
 * GET /api/org/[slug]/admin/roles/[roleId]/models
 * Returns the role's allowed models and role name.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string; roleId: string }> }
) {
  const authResult = await requireOrgAdmin(req);
  if (authResult instanceof NextResponse) return authResult;

  const { roleId } = await params;

  try {
    const role = await authResult.tenantDb.role.findUnique({
      where: { id: roleId },
      select: {
        id: true,
        name: true,
        allowedModels: true,
      },
    });

    if (!role) {
      return NextResponse.json(
        { error: 'Role not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      roleId: role.id,
      roleName: role.name,
      allowedModels: Array.isArray(role.allowedModels) ? role.allowedModels : [],
    });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/org/[slug]/admin/roles/[roleId]/models
 * Update the role's allowed model IDs.
 * Validates:
 *   - At least 1 model in the list
 *   - All model IDs exist in the Model Registry (active)
 * Audit logs the change.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string; roleId: string }> }
) {
  const authResult = await requireOrgAdmin(req);
  if (authResult instanceof NextResponse) return authResult;

  const { roleId } = await params;

  try {
    const body = await req.json();
    const parsed = UpdateAllowedModelsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: formatValidationErrors(parsed.error.issues) },
        { status: 400 }
      );
    }

    const { allowedModels } = parsed.data;

    // Verify role exists and belongs to org
    const role = await authResult.tenantDb.role.findUnique({
      where: { id: roleId },
      select: { id: true, name: true },
    });

    if (!role) {
      return NextResponse.json(
        { error: 'Role not found' },
        { status: 404 }
      );
    }

    // Verify all model IDs exist in Model Registry (active models only)
    const validModels = await getModelsByIds(allowedModels);
    if (validModels.length !== allowedModels.length) {
      const validIds = new Set(validModels.map((m) => m.modelId));
      const invalidIds = allowedModels.filter((id) => !validIds.has(id));
      return NextResponse.json(
        { error: `Invalid model IDs: ${invalidIds.join(', ')}. Models must be active in the registry.` },
        { status: 400 }
      );
    }

    // Update role's allowed models and audit log atomically
    const ipAddress = getIpAddress(req);

    const updatedRole = await prisma.$transaction(async (tx) => {
      const updated = await tx.role.update({
        where: { id: roleId },
        data: { allowedModels },
        select: {
          id: true,
          name: true,
          allowedModels: true,
        },
      });

      await auditLog.record(tx, {
        userId: authResult.user.id,
        action: 'role.models.updated',
        targetType: 'Role',
        targetId: roleId,
        organizationId: authResult.organization.id,
        ipAddress,
        metadata: {
          roleId,
          roleName: role.name,
          allowedModels,
        },
      });

      return updated;
    });

    return NextResponse.json(updatedRole);
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
