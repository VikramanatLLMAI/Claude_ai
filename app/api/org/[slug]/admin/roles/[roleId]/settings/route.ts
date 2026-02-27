/**
 * Org Admin Role Settings API
 *
 * GET   /api/org/[slug]/admin/roles/[roleId]/settings - Get role settings
 * PATCH /api/org/[slug]/admin/roles/[roleId]/settings - Update role settings
 *
 * Manages:
 * - customInstructionsEnabled (boolean)
 * - personalMcpEnabled (boolean)
 * - personalMcpMaxCount (integer, 0-20)
 *
 * When personalMcpEnabled is toggled ON and personalMcpMaxCount is not provided,
 * defaults to 3 (per CONTEXT.md).
 *
 * Requires Org Admin authentication.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireOrgAdmin } from '@/lib/auth-middleware';
import { getIpAddress, auditLog } from '@/lib/services/audit-service';
import { z } from 'zod';
import { formatValidationErrors } from '@/lib/validation';
import prisma from '@/lib/db';

/** Zod schema for role settings update */
const UpdateRoleSettingsSchema = z.object({
  customInstructionsEnabled: z.boolean().optional(),
  personalMcpEnabled: z.boolean().optional(),
  personalMcpMaxCount: z
    .number()
    .int('Max count must be an integer')
    .min(0, 'Max count must be at least 0')
    .max(20, 'Max count must be at most 20')
    .optional(),
});

/**
 * GET /api/org/[slug]/admin/roles/[roleId]/settings
 * Returns the role's configurable settings.
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
        customInstructionsEnabled: true,
        customInstructionsMaxLength: true,
        personalMcpEnabled: true,
        personalMcpMaxCount: true,
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
      customInstructionsEnabled: role.customInstructionsEnabled,
      customInstructionsMaxLength: role.customInstructionsMaxLength,
      personalMcpEnabled: role.personalMcpEnabled,
      personalMcpMaxCount: role.personalMcpMaxCount,
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
 * PATCH /api/org/[slug]/admin/roles/[roleId]/settings
 * Update the role's settings (custom instructions toggle, personal MCP settings).
 * When personalMcpEnabled is toggled ON and personalMcpMaxCount is not provided,
 * defaults to 3 per CONTEXT.md.
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
    const parsed = UpdateRoleSettingsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: formatValidationErrors(parsed.error.issues) },
        { status: 400 }
      );
    }

    // Verify role exists and belongs to org
    const role = await authResult.tenantDb.role.findUnique({
      where: { id: roleId },
      select: {
        id: true,
        name: true,
        personalMcpEnabled: true,
        personalMcpMaxCount: true,
        customInstructionsEnabled: true,
      },
    });

    if (!role) {
      return NextResponse.json(
        { error: 'Role not found' },
        { status: 404 }
      );
    }

    // Build update data
    const updateData: Record<string, unknown> = {};

    if (parsed.data.customInstructionsEnabled !== undefined) {
      updateData.customInstructionsEnabled = parsed.data.customInstructionsEnabled;
    }

    if (parsed.data.personalMcpEnabled !== undefined) {
      updateData.personalMcpEnabled = parsed.data.personalMcpEnabled;

      // When toggling ON and no max count provided, default to 3
      if (
        parsed.data.personalMcpEnabled === true &&
        !role.personalMcpEnabled &&
        parsed.data.personalMcpMaxCount === undefined
      ) {
        updateData.personalMcpMaxCount = 3;
      }
    }

    if (parsed.data.personalMcpMaxCount !== undefined) {
      updateData.personalMcpMaxCount = parsed.data.personalMcpMaxCount;
    }

    const ipAddress = getIpAddress(req);

    const updatedRole = await prisma.$transaction(async (tx) => {
      const updated = await tx.role.update({
        where: { id: roleId },
        data: updateData,
        select: {
          id: true,
          name: true,
          customInstructionsEnabled: true,
          customInstructionsMaxLength: true,
          personalMcpEnabled: true,
          personalMcpMaxCount: true,
        },
      });

      await auditLog.record(tx, {
        userId: authResult.user.id,
        action: 'role.settings.updated',
        targetType: 'Role',
        targetId: roleId,
        organizationId: authResult.organization.id,
        ipAddress,
        metadata: {
          roleId,
          roleName: role.name,
          changes: Object.keys(updateData),
          before: {
            customInstructionsEnabled: role.customInstructionsEnabled,
            personalMcpEnabled: role.personalMcpEnabled,
            personalMcpMaxCount: role.personalMcpMaxCount,
          },
          after: updateData,
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
