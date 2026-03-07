/**
 * Role Service
 *
 * CRUD operations for org-scoped roles with validation and audit logging.
 * Uses tenantDb for Role queries (org-scoped model).
 *
 * Functions:
 * - createRole: Create a custom role with name uniqueness validation
 * - updateRole: Update any role (system or custom)
 * - deleteRole: Delete custom role with system-role guard and member check
 * - getRoleWithMembers: Get role with member count and member list
 *
 * Covers: ODEF-02 (deleteRole clears defaultRoleId when deleted role is default)
 */

import type { TenantPrismaClient } from '@/lib/tenant';
import { auditLog, type PrismaTransactionClient } from './audit-service';
import type { Role } from '@/lib/generated/prisma/client';

// ============================================
// Types
// ============================================

export interface CreateRoleInput {
  name: string;
  description?: string;
  permissions?: string[];
  allowedModels?: string[];
  systemInstructions?: string;
  customInstructionsEnabled?: boolean;
  customInstructionsMaxLength?: number;
  personalMcpEnabled?: boolean;
  personalMcpMaxCount?: number;
  dailyRequestLimit?: number | null;
  dailyTokenLimit?: number | null;
  promptSuggestions?: Array<{ icon: string; label: string; prompt: string }>;
}

export interface UpdateRoleInput {
  name?: string;
  description?: string;
  permissions?: string[];
  allowedModels?: string[];
  systemInstructions?: string | null;
  customInstructionsEnabled?: boolean;
  customInstructionsMaxLength?: number;
  personalMcpEnabled?: boolean;
  personalMcpMaxCount?: number;
  dailyRequestLimit?: number | null;
  dailyTokenLimit?: number | null;
  promptSuggestions?: Array<{ icon: string; label: string; prompt: string }>;
}

export interface AuditContext {
  userId: string;
  organizationId: string;
  ipAddress: string | null;
}

export interface RoleWithMembers extends Role {
  _count: { members: number };
  members: Array<{
    id: string;
    userId: string;
    user: { id: string; name: string; email: string };
  }>;
}

// ============================================
// Create
// ============================================

/**
 * Create a custom role within an organization.
 *
 * Validates:
 * - Name uniqueness within org (catches Prisma unique constraint error)
 * - Reasonable limits (positive numbers when set)
 *
 * Wraps in transaction with audit logging.
 *
 * @param tenantDb - Tenant-scoped Prisma client
 * @param orgId - Organization ID
 * @param data - Role creation data
 * @param auditCtx - Audit context (userId, orgId, ipAddress)
 */
export async function createRole(
  tenantDb: TenantPrismaClient,
  orgId: string,
  data: CreateRoleInput,
  auditCtx: AuditContext
): Promise<Role> {
  // Validate limits
  validateLimits(data.dailyRequestLimit, data.dailyTokenLimit);

  try {
    return await tenantDb.$transaction(async (tx: PrismaTransactionClient) => {
      const role = await tx.role.create({
        data: {
          organizationId: orgId,
          name: data.name,
          description: data.description ?? null,
          isSystemRole: false,
          permissions: data.permissions ?? [],
          allowedModels: data.allowedModels ?? [],
          systemInstructions: data.systemInstructions ?? null,
          customInstructionsEnabled: data.customInstructionsEnabled ?? true,
          customInstructionsMaxLength: data.customInstructionsMaxLength ?? 1000,
          personalMcpEnabled: data.personalMcpEnabled ?? false,
          personalMcpMaxCount: data.personalMcpMaxCount ?? 3,
          dailyRequestLimit: data.dailyRequestLimit ?? null,
          dailyTokenLimit: data.dailyTokenLimit ?? null,
          promptSuggestions: (data.promptSuggestions as any) ?? [],
        },
      });

      await auditLog.record(tx, {
        userId: auditCtx.userId,
        action: 'role.created',
        targetType: 'Role',
        targetId: role.id,
        organizationId: auditCtx.organizationId,
        ipAddress: auditCtx.ipAddress,
        metadata: {
          name: role.name,
          isSystemRole: false,
        },
      });

      return role;
    });
  } catch (error: unknown) {
    // Handle Prisma unique constraint violation (P2002)
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      (error as { code: string }).code === 'P2002'
    ) {
      throw new Error(`A role with the name "${data.name}" already exists in this organization`);
    }
    throw error;
  }
}

// ============================================
// Update
// ============================================

/**
 * Update a role (system or custom).
 *
 * System roles can be renamed, have description, models, limits, etc. changed.
 * The only restriction on system roles is that they cannot be deleted.
 *
 * @param tenantDb - Tenant-scoped Prisma client
 * @param roleId - Role ID to update
 * @param data - Partial update data
 * @param auditCtx - Audit context
 */
export async function updateRole(
  tenantDb: TenantPrismaClient,
  roleId: string,
  data: UpdateRoleInput,
  auditCtx: AuditContext
): Promise<Role> {
  // Validate limits if provided
  if (data.dailyRequestLimit !== undefined || data.dailyTokenLimit !== undefined) {
    validateLimits(
      data.dailyRequestLimit ?? undefined,
      data.dailyTokenLimit ?? undefined
    );
  }

  try {
    return await tenantDb.$transaction(async (tx: PrismaTransactionClient) => {
      const existing = await tx.role.findUnique({ where: { id: roleId } });
      if (!existing) {
        throw new Error('Role not found');
      }

      // Build update data, only including provided fields
      const updateData: Record<string, unknown> = {};
      if (data.name !== undefined) updateData.name = data.name;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.permissions !== undefined) updateData.permissions = data.permissions;
      if (data.allowedModels !== undefined) updateData.allowedModels = data.allowedModels;
      if (data.systemInstructions !== undefined) updateData.systemInstructions = data.systemInstructions;
      if (data.customInstructionsEnabled !== undefined) updateData.customInstructionsEnabled = data.customInstructionsEnabled;
      if (data.customInstructionsMaxLength !== undefined) updateData.customInstructionsMaxLength = data.customInstructionsMaxLength;
      if (data.personalMcpEnabled !== undefined) updateData.personalMcpEnabled = data.personalMcpEnabled;
      if (data.personalMcpMaxCount !== undefined) updateData.personalMcpMaxCount = data.personalMcpMaxCount;
      if (data.dailyRequestLimit !== undefined) updateData.dailyRequestLimit = data.dailyRequestLimit;
      if (data.dailyTokenLimit !== undefined) updateData.dailyTokenLimit = data.dailyTokenLimit;
      if (data.promptSuggestions !== undefined) updateData.promptSuggestions = data.promptSuggestions;

      const updated = await tx.role.update({
        where: { id: roleId },
        data: updateData,
      });

      await auditLog.record(tx, {
        userId: auditCtx.userId,
        action: 'role.updated',
        targetType: 'Role',
        targetId: roleId,
        organizationId: auditCtx.organizationId,
        ipAddress: auditCtx.ipAddress,
        metadata: {
          name: updated.name,
          changes: Object.keys(updateData),
          isSystemRole: existing.isSystemRole,
        },
      });

      return updated;
    });
  } catch (error: unknown) {
    // Handle Prisma unique constraint violation (P2002) for name uniqueness
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      (error as { code: string }).code === 'P2002'
    ) {
      throw new Error(`A role with the name "${data.name}" already exists in this organization`);
    }
    throw error;
  }
}

// ============================================
// Delete
// ============================================

/**
 * Delete a custom role.
 *
 * Validates:
 * - Role is NOT a system role (system roles cannot be deleted)
 * - Role has no assigned members
 * - If role is the org's defaultRoleId, set defaultRoleId to null (ODEF-02)
 *
 * @param tenantDb - Tenant-scoped Prisma client
 * @param roleId - Role ID to delete
 * @param auditCtx - Audit context
 */
export async function deleteRole(
  tenantDb: TenantPrismaClient,
  roleId: string,
  auditCtx: AuditContext
): Promise<void> {
  await tenantDb.$transaction(async (tx: PrismaTransactionClient) => {
    const role = await tx.role.findUnique({
      where: { id: roleId },
      include: { _count: { select: { members: true } } },
    });

    if (!role) {
      throw new Error('Role not found');
    }

    // Guard: system roles cannot be deleted
    if (role.isSystemRole) {
      throw new Error('System roles cannot be deleted');
    }

    // Guard: role must have no assigned members
    if (role._count.members > 0) {
      throw new Error(
        `Cannot delete role "${role.name}": ${role._count.members} member(s) are still assigned. ` +
        'Reassign members to another role first.'
      );
    }

    // ODEF-02: If this role is the org's defaultRoleId, clear it
    const orgSettings = await tx.orgSettings.findFirst({
      where: { organizationId: role.organizationId, defaultRoleId: roleId },
    });
    if (orgSettings) {
      await tx.orgSettings.update({
        where: { id: orgSettings.id },
        data: { defaultRoleId: null },
      });
    }

    // Delete the role
    await tx.role.delete({ where: { id: roleId } });

    await auditLog.record(tx, {
      userId: auditCtx.userId,
      action: 'role.deleted',
      targetType: 'Role',
      targetId: roleId,
      organizationId: auditCtx.organizationId,
      ipAddress: auditCtx.ipAddress,
      metadata: {
        name: role.name,
        clearedDefaultRole: !!orgSettings,
      },
    });
  });
}

// ============================================
// Read
// ============================================

/**
 * Get a role with member count and member list.
 *
 * @param tenantDb - Tenant-scoped Prisma client
 * @param roleId - Role ID
 */
export async function getRoleWithMembers(
  tenantDb: TenantPrismaClient,
  roleId: string
): Promise<RoleWithMembers | null> {
  const role = await tenantDb.role.findUnique({
    where: { id: roleId },
    include: {
      _count: { select: { members: true } },
      members: {
        select: {
          id: true,
          userId: true,
          user: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: { joinedAt: 'asc' },
      },
    },
  });

  return role as RoleWithMembers | null;
}

// ============================================
// Internal Helpers
// ============================================

/**
 * Validate daily request and token limits.
 * Limits must be positive integers when set.
 */
function validateLimits(
  requestLimit?: number | null,
  tokenLimit?: number | null
): void {
  if (requestLimit !== undefined && requestLimit !== null) {
    if (!Number.isInteger(requestLimit) || requestLimit <= 0) {
      throw new Error('Daily request limit must be a positive integer');
    }
  }
  if (tokenLimit !== undefined && tokenLimit !== null) {
    if (!Number.isInteger(tokenLimit) || tokenLimit <= 0) {
      throw new Error('Daily token limit must be a positive integer');
    }
  }
}
