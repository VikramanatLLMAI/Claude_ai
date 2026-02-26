/**
 * Org Admin Default Role API
 *
 * GET   /api/org/settings/default-role - Get default role for new invitations
 * PATCH /api/org/settings/default-role - Set default role for new invitations
 *
 * Requires Org Admin authentication.
 * (ODEF-01)
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireOrgAdmin } from '@/lib/auth-middleware';
import { getIpAddress } from '@/lib/services/audit-service';
import { auditLog, type PrismaTransactionClient } from '@/lib/services/audit-service';
import prisma from '@/lib/db';
import {
  SetDefaultRoleSchema,
  formatValidationErrors,
} from '@/lib/validation';

/**
 * GET /api/org/settings/default-role
 * Get the current default role ID for this organization.
 */
export async function GET(req: NextRequest) {
  const authResult = await requireOrgAdmin(req);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const settings = await prisma.orgSettings.findUnique({
      where: { organizationId: authResult.organization.id },
      select: { defaultRoleId: true },
    });

    return NextResponse.json({
      defaultRoleId: settings?.defaultRoleId ?? null,
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
 * PATCH /api/org/settings/default-role
 * Set or clear the default role for new invitations.
 */
export async function PATCH(req: NextRequest) {
  const authResult = await requireOrgAdmin(req);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const body = await req.json();
    const parsed = SetDefaultRoleSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: formatValidationErrors(parsed.error.issues) },
        { status: 400 }
      );
    }

    const { roleId } = parsed.data;

    // If roleId is not null, verify the role exists in this org
    if (roleId !== null) {
      const role = await prisma.role.findFirst({
        where: { id: roleId, organizationId: authResult.organization.id },
      });
      if (!role) {
        return NextResponse.json(
          { error: 'Role not found in this organization' },
          { status: 400 }
        );
      }
    }

    const ipAddress = getIpAddress(req);

    // Update settings in transaction with audit log
    const settings = await prisma.$transaction(async (tx: PrismaTransactionClient) => {
      const updated = await tx.orgSettings.update({
        where: { organizationId: authResult.organization.id },
        data: { defaultRoleId: roleId },
        select: { defaultRoleId: true },
      });

      await auditLog.record(tx, {
        userId: authResult.user.id,
        action: 'org.default_role_updated',
        targetType: 'OrgSettings',
        targetId: authResult.organization.id,
        organizationId: authResult.organization.id,
        ipAddress,
        metadata: { defaultRoleId: roleId },
      });

      return updated;
    });

    return NextResponse.json({
      defaultRoleId: settings.defaultRoleId,
    });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
