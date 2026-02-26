/**
 * Super Admin Service
 *
 * CRUD operations for Super Admin users with safety rules:
 * - SAFE-01: Cannot delete yourself
 * - SAFE-06: Must maintain at least 1 Super Admin
 *
 * All mutations are wrapped in prisma.$transaction() with audit logging.
 */

import prisma from '@/lib/db';
import { hashPassword, generateToken } from '@/lib/encryption';
import { ensureMinimumSuperAdmins } from '@/lib/auth-middleware';
import { auditLog, type PrismaTransactionClient } from './audit-service';

// ============================================
// Types
// ============================================

interface CreateSuperAdminInput {
  email: string;
  password: string;
  name: string;
}

interface UpdateSuperAdminInput {
  name?: string;
  email?: string;
}

// ============================================
// Super Admin CRUD
// ============================================

/**
 * Create a new Super Admin user.
 * (SUSR-01)
 */
export async function createSuperAdmin(
  data: CreateSuperAdminInput,
  actorId: string,
  ipAddress: string | null
) {
  try {
    const passwordHash = await hashPassword(data.password);

    return await prisma.$transaction(async (tx: PrismaTransactionClient) => {
      const user = await tx.user.create({
        data: {
          email: data.email.toLowerCase().trim(),
          passwordHash,
          name: data.name,
          isSuperAdmin: true,
        },
        select: {
          id: true,
          email: true,
          name: true,
          isSuperAdmin: true,
          createdAt: true,
          lastLogin: true,
        },
      });

      await auditLog.record(tx, {
        userId: actorId,
        action: 'super_admin.created',
        targetType: 'User',
        targetId: user.id,
        ipAddress,
        metadata: { email: user.email, name: user.name },
      });

      return user;
    });
  } catch (error: unknown) {
    if (
      error instanceof Error &&
      'code' in error &&
      (error as { code: string }).code === 'P2002'
    ) {
      throw new Error('Email already registered');
    }
    throw error;
  }
}

/**
 * Update a Super Admin user (name, email).
 * (SUSR-03)
 */
export async function updateSuperAdmin(
  userId: string,
  data: UpdateSuperAdminInput,
  actorId: string,
  ipAddress: string | null
) {
  try {
    return await prisma.$transaction(async (tx: PrismaTransactionClient) => {
      // Load before state for audit
      const before = await tx.user.findUnique({
        where: { id: userId, isSuperAdmin: true },
        select: { id: true, email: true, name: true },
      });
      if (!before) {
        throw new Error('Super Admin not found');
      }

      const updated = await tx.user.update({
        where: { id: userId },
        data: {
          ...(data.name !== undefined && { name: data.name }),
          ...(data.email !== undefined && {
            email: data.email.toLowerCase().trim(),
          }),
        },
        select: {
          id: true,
          email: true,
          name: true,
          isSuperAdmin: true,
          createdAt: true,
          lastLogin: true,
        },
      });

      await auditLog.record(tx, {
        userId: actorId,
        action: 'super_admin.updated',
        targetType: 'User',
        targetId: userId,
        ipAddress,
        metadata: {
          before: { email: before.email, name: before.name },
          after: { email: updated.email, name: updated.name },
          selfEdit: actorId === userId,
        },
      });

      return updated;
    });
  } catch (error: unknown) {
    if (
      error instanceof Error &&
      'code' in error &&
      (error as { code: string }).code === 'P2002'
    ) {
      throw new Error('Email already registered');
    }
    throw error;
  }
}

/**
 * Delete a Super Admin user.
 * Safety: Cannot delete yourself (SAFE-01). Must have > 1 Super Admin remaining (SAFE-06).
 * (SUSR-04)
 */
export async function deleteSuperAdmin(
  userId: string,
  actorId: string,
  ipAddress: string | null
) {
  // SAFE-01: Cannot delete yourself
  if (actorId === userId) {
    throw new Error('Cannot delete yourself');
  }

  // SAFE-06: Must maintain at least 1 Super Admin
  const canDelete = await ensureMinimumSuperAdmins();
  if (!canDelete) {
    throw new Error('Cannot delete the last Super Admin. At least one Super Admin must remain.');
  }

  return await prisma.$transaction(async (tx: PrismaTransactionClient) => {
    const user = await tx.user.findUnique({
      where: { id: userId, isSuperAdmin: true },
      select: { id: true, email: true, name: true },
    });
    if (!user) {
      throw new Error('Super Admin not found');
    }

    // Delete all their sessions
    await tx.session.deleteMany({ where: { userId } });

    // Delete the user
    await tx.user.delete({ where: { id: userId } });

    await auditLog.record(tx, {
      userId: actorId,
      action: 'super_admin.deleted',
      targetType: 'User',
      targetId: userId,
      ipAddress,
      metadata: { email: user.email, name: user.name },
    });

    return { success: true, deletedUser: user };
  });
}

/**
 * List all Super Admin users.
 */
export async function listSuperAdmins() {
  return await prisma.user.findMany({
    where: { isSuperAdmin: true },
    select: {
      id: true,
      email: true,
      name: true,
      createdAt: true,
      lastLogin: true,
    },
    orderBy: { name: 'asc' },
  });
}

/**
 * Assign an Org Admin by creating an invitation for the specified email.
 * (SUSR-02) -- The actual email sending is deferred to Plan 02-02.
 */
export async function assignOrgAdmin(
  email: string,
  orgId: string,
  roleId: string,
  actorId: string,
  ipAddress: string | null
) {
  return await prisma.$transaction(async (tx: PrismaTransactionClient) => {
    // Verify org exists
    const org = await tx.organization.findUnique({ where: { id: orgId } });
    if (!org) {
      throw new Error('Organization not found');
    }

    // Verify role exists and belongs to org
    const role = await tx.role.findUnique({ where: { id: roleId } });
    if (!role || role.organizationId !== orgId) {
      throw new Error('Role not found in this organization');
    }

    // Create invitation
    const invitation = await tx.invitation.create({
      data: {
        organizationId: orgId,
        email: email.toLowerCase().trim(),
        roleId,
        invitedById: actorId,
        token: generateToken(),
        status: 'PENDING',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    await auditLog.record(tx, {
      userId: actorId,
      action: 'org_admin.assigned',
      targetType: 'Invitation',
      targetId: invitation.id,
      organizationId: orgId,
      ipAddress,
      metadata: {
        email,
        roleName: role.name,
        orgName: org.name,
      },
    });

    return invitation;
  });
}
