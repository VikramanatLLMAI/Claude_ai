/**
 * Org User Management Service
 *
 * Provides CRUD operations for org members: list, suspend, activate, delete,
 * change role, promote to admin, update name.
 *
 * Uses raw prisma (not tenantDb) since OrgMember joins User which is not org-scoped.
 * All mutations wrap in prisma.$transaction() with auditLog.record() co-located.
 *
 * Safety guards:
 *   SAFE-01: Cannot suspend/delete self
 *   SAFE-02: Cannot remove last admin (org_admin permission holder)
 */

import prisma from '@/lib/db';
import { auditLog } from '@/lib/services/audit-service';

// ============================================
// Types
// ============================================

export interface OrgMemberFilters {
  search?: string;
  role?: string;
  status?: 'active' | 'inactive' | 'suspended';
}

export interface OrgMemberRow {
  id: string;
  userId: string;
  status: string;
  joinedAt: Date;
  lastActiveAt: Date | null;
  customInstructions: string | null;
  user: {
    id: string;
    name: string;
    email: string;
    avatarBase64: string | null;
  };
  role: {
    id: string;
    name: string;
    permissions: unknown;
  };
}

// ============================================
// Helpers
// ============================================

/**
 * Count org members whose role has org_admin permission.
 */
async function countOrgAdmins(orgId: string): Promise<number> {
  const roles = await prisma.role.findMany({
    where: { organizationId: orgId },
    select: { id: true, permissions: true },
  });

  const adminRoleIds = roles
    .filter((r) => {
      const perms = Array.isArray(r.permissions) ? r.permissions : [];
      return (perms as string[]).includes('org_admin');
    })
    .map((r) => r.id);

  if (adminRoleIds.length === 0) return 0;

  return prisma.orgMember.count({
    where: {
      organizationId: orgId,
      roleId: { in: adminRoleIds },
      status: 'ACTIVE',
    },
  });
}

/**
 * Check if a role has org_admin permission.
 */
function roleHasAdminPermission(role: { permissions: unknown }): boolean {
  const perms = Array.isArray(role.permissions) ? role.permissions : [];
  return (perms as string[]).includes('org_admin');
}

// ============================================
// Service Functions
// ============================================

/**
 * List org members with optional search, role, and status filters.
 *
 * Status filter logic:
 * - "active": status=ACTIVE AND lastActiveAt >= 30 days ago (or null lastActiveAt treated as active)
 * - "inactive": status=ACTIVE AND lastActiveAt < 30 days ago
 * - "suspended": status=SUSPENDED
 */
export async function listOrgMembers(
  orgId: string,
  filters: OrgMemberFilters = {}
): Promise<OrgMemberRow[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = { organizationId: orgId };

  // Status filter
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  if (filters.status === 'suspended') {
    where.status = 'SUSPENDED';
  } else if (filters.status === 'inactive') {
    where.status = 'ACTIVE';
    where.lastActiveAt = { lt: thirtyDaysAgo };
    // Inactive means specifically has a lastActiveAt that is old
    // null lastActiveAt is treated as active (new member)
    where.lastActiveAt = { not: null, lt: thirtyDaysAgo };
  } else if (filters.status === 'active') {
    where.status = 'ACTIVE';
    where.OR = [
      { lastActiveAt: { gte: thirtyDaysAgo } },
      { lastActiveAt: null },
    ];
  }

  // Role filter
  if (filters.role) {
    where.roleId = filters.role;
  }

  // Search filter (name or email, case-insensitive)
  if (filters.search) {
    const searchCondition = {
      user: {
        OR: [
          { name: { contains: filters.search, mode: 'insensitive' as const } },
          { email: { contains: filters.search, mode: 'insensitive' as const } },
        ],
      },
    };

    if (where.OR) {
      // Already have OR from status filter — combine with AND
      where.AND = [{ OR: where.OR }, searchCondition];
      delete where.OR;
    } else {
      Object.assign(where, searchCondition);
    }
  }

  const members = await prisma.orgMember.findMany({
    where,
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          avatarBase64: true,
        },
      },
      role: {
        select: {
          id: true,
          name: true,
          permissions: true,
        },
      },
    },
    orderBy: { joinedAt: 'desc' },
  });

  return members as OrgMemberRow[];
}

/**
 * Suspend an org member.
 *
 * SAFE-01: Cannot suspend self.
 * SAFE-02: If target has org_admin permission, check adminCount > 1.
 */
export async function suspendOrgMember(
  orgId: string,
  userId: string,
  actorId: string,
  ipAddress: string | null
): Promise<void> {
  // SAFE-01
  if (userId === actorId) {
    throw new Error('Cannot suspend yourself');
  }

  // Load target member
  const target = await prisma.orgMember.findFirst({
    where: { organizationId: orgId, userId },
    include: { role: true },
  });
  if (!target) throw new Error('User not found in this organization');

  // SAFE-02
  if (roleHasAdminPermission(target.role)) {
    const adminCount = await countOrgAdmins(orgId);
    if (adminCount <= 1) {
      throw new Error('Cannot suspend the last admin of this organization');
    }
  }

  await prisma.$transaction(async (tx) => {
    // Update status
    await tx.orgMember.update({
      where: { id: target.id },
      data: { status: 'SUSPENDED' },
    });

    // Delete all sessions for this user in this org
    await tx.session.deleteMany({
      where: { userId, organizationId: orgId },
    });

    // Audit log
    await auditLog.record(tx, {
      userId: actorId,
      action: 'user.suspended',
      targetType: 'User',
      targetId: userId,
      organizationId: orgId,
      ipAddress,
    });
  });
}

/**
 * Activate a suspended org member.
 */
export async function activateOrgMember(
  orgId: string,
  userId: string,
  actorId: string,
  ipAddress: string | null
): Promise<void> {
  const target = await prisma.orgMember.findFirst({
    where: { organizationId: orgId, userId },
  });
  if (!target) throw new Error('User not found in this organization');

  await prisma.$transaction(async (tx) => {
    await tx.orgMember.update({
      where: { id: target.id },
      data: { status: 'ACTIVE' },
    });

    await auditLog.record(tx, {
      userId: actorId,
      action: 'user.activated',
      targetType: 'User',
      targetId: userId,
      organizationId: orgId,
      ipAddress,
    });
  });
}

/**
 * Delete an org member (remove org membership, NOT the User record).
 *
 * SAFE-01: Cannot delete self.
 * SAFE-02: If target has org_admin permission, check adminCount > 1.
 */
export async function deleteOrgMember(
  orgId: string,
  userId: string,
  actorId: string,
  ipAddress: string | null
): Promise<void> {
  // SAFE-01
  if (userId === actorId) {
    throw new Error('Cannot remove yourself from the organization');
  }

  const target = await prisma.orgMember.findFirst({
    where: { organizationId: orgId, userId },
    include: { role: true },
  });
  if (!target) throw new Error('User not found in this organization');

  // SAFE-02
  if (roleHasAdminPermission(target.role)) {
    const adminCount = await countOrgAdmins(orgId);
    if (adminCount <= 1) {
      throw new Error('Cannot remove the last admin of this organization');
    }
  }

  await prisma.$transaction(async (tx) => {
    // Delete all sessions first
    await tx.session.deleteMany({
      where: { userId, organizationId: orgId },
    });

    // Delete org membership
    await tx.orgMember.delete({
      where: { id: target.id },
    });

    // Audit log
    await auditLog.record(tx, {
      userId: actorId,
      action: 'user.deleted',
      targetType: 'User',
      targetId: userId,
      organizationId: orgId,
      ipAddress,
    });
  });
}

/**
 * Change an org member's role.
 *
 * SAFE-02: If removing org_admin permission, check adminCount > 1.
 */
export async function changeOrgMemberRole(
  orgId: string,
  userId: string,
  newRoleId: string,
  actorId: string,
  ipAddress: string | null
): Promise<void> {
  const target = await prisma.orgMember.findFirst({
    where: { organizationId: orgId, userId },
    include: { role: true },
  });
  if (!target) throw new Error('User not found in this organization');

  // Verify new role belongs to this org
  const newRole = await prisma.role.findFirst({
    where: { id: newRoleId, organizationId: orgId },
  });
  if (!newRole) throw new Error('Role not found in this organization');

  // SAFE-02: If old role has org_admin but new role doesn't, check admin count
  const oldHasAdmin = roleHasAdminPermission(target.role);
  const newHasAdmin = roleHasAdminPermission(newRole);

  if (oldHasAdmin && !newHasAdmin) {
    const adminCount = await countOrgAdmins(orgId);
    if (adminCount <= 1) {
      throw new Error('Cannot remove admin permissions from the last admin');
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.orgMember.update({
      where: { id: target.id },
      data: { roleId: newRoleId },
    });

    await auditLog.record(tx, {
      userId: actorId,
      action: 'user.role_changed',
      targetType: 'User',
      targetId: userId,
      organizationId: orgId,
      ipAddress,
      metadata: {
        fromRoleId: target.roleId,
        toRoleId: newRoleId,
      },
    });
  });
}

/**
 * Promote an org member to admin by assigning a role with org_admin permission.
 */
export async function promoteToAdmin(
  orgId: string,
  userId: string,
  actorId: string,
  ipAddress: string | null
): Promise<void> {
  const target = await prisma.orgMember.findFirst({
    where: { organizationId: orgId, userId },
    include: { role: true },
  });
  if (!target) throw new Error('User not found in this organization');

  // Find a role with org_admin permission (prefer Technical role)
  const roles = await prisma.role.findMany({
    where: { organizationId: orgId },
    select: { id: true, name: true, permissions: true },
  });

  const adminRole = roles.find((r) => {
    const perms = Array.isArray(r.permissions) ? r.permissions : [];
    return (perms as string[]).includes('org_admin') && r.name === 'Technical';
  }) || roles.find((r) => {
    const perms = Array.isArray(r.permissions) ? r.permissions : [];
    return (perms as string[]).includes('org_admin');
  });

  if (!adminRole) {
    throw new Error('No admin role found in this organization');
  }

  await prisma.$transaction(async (tx) => {
    await tx.orgMember.update({
      where: { id: target.id },
      data: { roleId: adminRole.id },
    });

    await auditLog.record(tx, {
      userId: actorId,
      action: 'user.promoted_to_admin',
      targetType: 'User',
      targetId: userId,
      organizationId: orgId,
      ipAddress,
      metadata: {
        fromRoleId: target.roleId,
        toRoleId: adminRole.id,
      },
    });
  });
}

/**
 * Update an org member's display name (on User model).
 */
export async function updateOrgMemberName(
  orgId: string,
  userId: string,
  newName: string,
  actorId: string,
  ipAddress: string | null
): Promise<void> {
  // Verify membership
  const target = await prisma.orgMember.findFirst({
    where: { organizationId: orgId, userId },
  });
  if (!target) throw new Error('User not found in this organization');

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: { name: newName },
    });

    await auditLog.record(tx, {
      userId: actorId,
      action: 'user.name_updated',
      targetType: 'User',
      targetId: userId,
      organizationId: orgId,
      ipAddress,
      metadata: { newName },
    });
  });
}
