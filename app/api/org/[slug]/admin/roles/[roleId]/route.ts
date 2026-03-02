/**
 * Org Admin Role API - Update and Delete individual roles
 *
 * PUT    /api/org/[slug]/admin/roles/[roleId] - Update a role
 * DELETE /api/org/[slug]/admin/roles/[roleId] - Delete a custom role
 *
 * Requires Org Admin authentication.
 * tenantDb scoping ensures roleId belongs to the org.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireOrgAdmin } from '@/lib/auth-middleware';
import { updateRole, deleteRole } from '@/lib/services/role-service';
import { getIpAddress } from '@/lib/services/audit-service';
import { z } from 'zod';

interface RouteParams {
  params: Promise<{ slug: string; roleId: string }>;
}

/**
 * Zod schema for role update payload.
 * Same fields as create but all optional.
 */
const UpdateRoleSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters').max(50, 'Name must be at most 50 characters').optional(),
  description: z.string().max(200, 'Description must be at most 200 characters').optional().nullable(),
  allowedModels: z.array(z.string()).optional(),
  systemInstructions: z.string().optional().nullable(),
  customInstructionsEnabled: z.boolean().optional(),
  personalMcpEnabled: z.boolean().optional(),
  personalMcpMaxCount: z.number().int().nonnegative().optional(),
  dailyRequestLimit: z.number().int().positive().nullable().optional(),
  dailyTokenLimit: z.number().int().positive().nullable().optional(),
});

/**
 * PUT /api/org/[slug]/admin/roles/[roleId]
 * Update a role (system or custom). Returns 200 with updated role.
 */
export async function PUT(req: NextRequest, { params }: RouteParams) {
  const authResult = await requireOrgAdmin(req);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const { roleId } = await params;
    const body = await req.json();
    const parsed = UpdateRoleSchema.safeParse(body);

    if (!parsed.success) {
      const messages = parsed.error.issues.map((e: { message: string }) => e.message).join(', ');
      return NextResponse.json(
        { error: messages },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const ipAddress = getIpAddress(req);

    const updated = await updateRole(
      authResult.tenantDb,
      roleId,
      {
        name: data.name,
        description: data.description ?? undefined,
        allowedModels: data.allowedModels,
        systemInstructions: data.systemInstructions ?? undefined,
        customInstructionsEnabled: data.customInstructionsEnabled,
        personalMcpEnabled: data.personalMcpEnabled,
        personalMcpMaxCount: data.personalMcpMaxCount,
        dailyRequestLimit: data.dailyRequestLimit,
        dailyTokenLimit: data.dailyTokenLimit,
      },
      {
        userId: authResult.user.id,
        organizationId: authResult.organization.id,
        ipAddress,
      }
    );

    return NextResponse.json(updated);
  } catch (error) {
    console.error('API error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';

    if (message.includes('not found') || message.includes('Not found')) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 });
    }

    if (message.includes('already exists') || message.includes('must be')) {
      return NextResponse.json({ error: message }, { status: 400 });
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/org/[slug]/admin/roles/[roleId]
 * Delete a custom role. Returns 200 with { success: true }.
 * Blocks: system roles, roles with assigned members.
 * ODEF-02: if deleted role was org's defaultRoleId, clearing happens in service layer.
 */
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const authResult = await requireOrgAdmin(req);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const { roleId } = await params;
    const ipAddress = getIpAddress(req);

    await deleteRole(
      authResult.tenantDb,
      roleId,
      {
        userId: authResult.user.id,
        organizationId: authResult.organization.id,
        ipAddress,
      }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('API error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';

    if (message.includes('not found') || message.includes('Not found')) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 });
    }

    if (message.includes('cannot be deleted') || message.includes('Cannot delete')) {
      return NextResponse.json({ error: message }, { status: 400 });
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
