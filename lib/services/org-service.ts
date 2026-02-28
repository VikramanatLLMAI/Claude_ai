/**
 * Organization Service
 *
 * CRUD + lifecycle management for organizations.
 * All mutations are wrapped in prisma.$transaction() for atomicity
 * with audit logging co-located in the same transaction.
 *
 * Covers: SORG-01 through SORG-07, SAFE-04, SAFE-05, ODEF-01
 */

import prisma from '@/lib/db';
import { generateToken } from '@/lib/encryption';
import { DEFAULT_ROLE_TEMPLATES } from '@/lib/constants/role-templates';
import { auditLog, type PrismaTransactionClient } from './audit-service';

// ============================================
// Types
// ============================================

interface CreateOrgInput {
  name: string;
  slug: string;
  logoBase64?: string;
  logoDisplayMode?: string;
  initialAdminEmail?: string;
}

interface UpdateOrgInput {
  name?: string;
  slug?: string;
  logoDisplayMode?: string;
  monthlyRequestCeiling?: number | null;
  monthlyTokenCeiling?: number | null;
}

// ============================================
// Organization CRUD
// ============================================

/**
 * Create a new organization with all associated resources atomically.
 * Creates: Organization + 3 system roles + OrgSettings + PasswordPolicy + optional Invitation
 * (SORG-01, ODEF-01)
 */
export async function createOrganization(
  data: CreateOrgInput,
  actorId: string,
  ipAddress: string | null
) {
  try {
    return await prisma.$transaction(async (tx: PrismaTransactionClient) => {
      // 1. Create the organization
      const org = await tx.organization.create({
        data: {
          name: data.name,
          slug: data.slug,
          logoBase64: data.logoBase64 ?? null,
          logoDisplayMode: data.logoDisplayMode ?? 'PLATFORM_AND_ORG',
          status: 'ACTIVE',
        },
      });

      // 2. Create 3 system roles from default templates
      const createdRoles = [];
      for (const template of DEFAULT_ROLE_TEMPLATES) {
        const role = await tx.role.create({
          data: {
            organizationId: org.id,
            name: template.name,
            description: template.description,
            isSystemRole: template.isSystemRole,
            permissions: template.permissions,
            allowedModels: template.allowedModels,
            systemInstructions: template.systemInstructions,
            customInstructionsEnabled: template.customInstructionsEnabled,
            customInstructionsMaxLength: template.customInstructionsMaxLength,
            dailyRequestLimit: template.dailyRequestLimit,
            dailyTokenLimit: template.dailyTokenLimit,
          },
        });
        createdRoles.push(role);
      }

      // 3. Create OrgSettings with defaultRoleId = Basic role (ODEF-01)
      const basicRole = createdRoles.find((r) => r.name === 'Basic');
      await tx.orgSettings.create({
        data: {
          organizationId: org.id,
          defaultRoleId: basicRole?.id ?? null,
          conversationVisibility: false,
        },
      });

      // 4. Create PasswordPolicy with defaults
      await tx.passwordPolicy.create({
        data: {
          organizationId: org.id,
        },
      });

      // 5. If initialAdminEmail provided, create an invitation for Technical role (Org Admin)
      let invitation = null;
      if (data.initialAdminEmail) {
        const technicalRole = createdRoles.find((r) => r.name === 'Technical');
        if (technicalRole) {
          invitation = await tx.invitation.create({
            data: {
              organizationId: org.id,
              email: data.initialAdminEmail,
              roleId: technicalRole.id,
              invitedById: actorId,
              token: generateToken(),
              status: 'PENDING',
              expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
            },
          });
        }
      }

      // 6. Audit log
      await auditLog.record(tx, {
        userId: actorId,
        action: 'org.created',
        targetType: 'Organization',
        targetId: org.id,
        organizationId: org.id,
        ipAddress,
        metadata: {
          name: org.name,
          slug: org.slug,
          initialInviteSent: !!invitation,
          initialAdminEmail: data.initialAdminEmail ?? null,
        },
      });

      return {
        ...org,
        roles: createdRoles,
        invitation,
      };
    });
  } catch (error: unknown) {
    if (
      error instanceof Error &&
      'code' in error &&
      (error as { code: string }).code === 'P2002'
    ) {
      throw new Error('Organization with this slug already exists');
    }
    throw error;
  }
}

/**
 * Update organization details (name, slug, logoDisplayMode).
 * (SORG-02)
 */
export async function updateOrganization(
  orgId: string,
  data: UpdateOrgInput,
  actorId: string,
  ipAddress: string | null
) {
  try {
    return await prisma.$transaction(async (tx: PrismaTransactionClient) => {
      // Load current state for audit before/after
      const before = await tx.organization.findUnique({
        where: { id: orgId },
      });
      if (!before) {
        throw new Error('Organization not found');
      }

      const updated = await tx.organization.update({
        where: { id: orgId },
        data: {
          ...(data.name !== undefined && { name: data.name }),
          ...(data.slug !== undefined && { slug: data.slug }),
          ...(data.logoDisplayMode !== undefined && {
            logoDisplayMode: data.logoDisplayMode,
          }),
          ...(data.monthlyRequestCeiling !== undefined && {
            monthlyRequestCeiling: data.monthlyRequestCeiling,
          }),
          ...(data.monthlyTokenCeiling !== undefined && {
            monthlyTokenCeiling: data.monthlyTokenCeiling,
          }),
        },
      });

      await auditLog.record(tx, {
        userId: actorId,
        action: 'org.updated',
        targetType: 'Organization',
        targetId: orgId,
        organizationId: orgId,
        ipAddress,
        metadata: {
          before: {
            name: before.name,
            slug: before.slug,
            logoDisplayMode: before.logoDisplayMode,
            monthlyRequestCeiling: before.monthlyRequestCeiling,
            monthlyTokenCeiling: before.monthlyTokenCeiling,
          },
          after: {
            name: updated.name,
            slug: updated.slug,
            logoDisplayMode: updated.logoDisplayMode,
            monthlyRequestCeiling: updated.monthlyRequestCeiling,
            monthlyTokenCeiling: updated.monthlyTokenCeiling,
          },
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
      throw new Error('Organization with this slug already exists');
    }
    throw error;
  }
}

/**
 * Suspend an organization and invalidate all its sessions immediately.
 * (SORG-03)
 */
export async function suspendOrganization(
  orgId: string,
  actorId: string,
  ipAddress: string | null
) {
  return await prisma.$transaction(async (tx: PrismaTransactionClient) => {
    const org = await tx.organization.findUnique({ where: { id: orgId } });
    if (!org) {
      throw new Error('Organization not found');
    }
    if (org.status === 'SUSPENDED') {
      throw new Error('Organization is already suspended');
    }

    const updated = await tx.organization.update({
      where: { id: orgId },
      data: { status: 'SUSPENDED' },
    });

    // Invalidate all sessions for this org immediately
    await tx.session.deleteMany({
      where: { organizationId: orgId },
    });

    await auditLog.record(tx, {
      userId: actorId,
      action: 'org.suspended',
      targetType: 'Organization',
      targetId: orgId,
      organizationId: orgId,
      ipAddress,
      metadata: { name: org.name },
    });

    return updated;
  });
}

/**
 * Activate a suspended organization.
 * (SORG-04)
 */
export async function activateOrganization(
  orgId: string,
  actorId: string,
  ipAddress: string | null
) {
  return await prisma.$transaction(async (tx: PrismaTransactionClient) => {
    const org = await tx.organization.findUnique({ where: { id: orgId } });
    if (!org) {
      throw new Error('Organization not found');
    }
    if (org.status === 'ACTIVE') {
      throw new Error('Organization is already active');
    }

    const updated = await tx.organization.update({
      where: { id: orgId },
      data: { status: 'ACTIVE' },
    });

    await auditLog.record(tx, {
      userId: actorId,
      action: 'org.activated',
      targetType: 'Organization',
      targetId: orgId,
      organizationId: orgId,
      ipAddress,
      metadata: { name: org.name },
    });

    return updated;
  });
}

/**
 * Soft-delete an organization (set deletedAt).
 * Only Super Admin can call this (enforced at API route level).
 * (SORG-05, SAFE-04, SAFE-05)
 */
export async function deleteOrganization(
  orgId: string,
  actorId: string,
  ipAddress: string | null
) {
  return await prisma.$transaction(async (tx: PrismaTransactionClient) => {
    const org = await tx.organization.findUnique({ where: { id: orgId } });
    if (!org) {
      throw new Error('Organization not found');
    }
    if (org.deletedAt) {
      throw new Error('Organization is already deleted');
    }

    const updated = await tx.organization.update({
      where: { id: orgId },
      data: { deletedAt: new Date() },
    });

    await auditLog.record(tx, {
      userId: actorId,
      action: 'org.deleted',
      targetType: 'Organization',
      targetId: orgId,
      organizationId: orgId,
      ipAddress,
      metadata: { name: org.name },
    });

    return updated;
  });
}

/**
 * Restore a soft-deleted organization within the 30-day grace period.
 * (SAFE-05)
 */
export async function restoreOrganization(
  orgId: string,
  actorId: string,
  ipAddress: string | null
) {
  return await prisma.$transaction(async (tx: PrismaTransactionClient) => {
    const org = await tx.organization.findUnique({ where: { id: orgId } });
    if (!org) {
      throw new Error('Organization not found');
    }
    if (!org.deletedAt) {
      throw new Error('Organization is not deleted');
    }

    // Check 30-day grace period
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    if (org.deletedAt < thirtyDaysAgo) {
      throw new Error(
        'Organization cannot be restored. The 30-day grace period has expired.'
      );
    }

    const updated = await tx.organization.update({
      where: { id: orgId },
      data: { deletedAt: null },
    });

    await auditLog.record(tx, {
      userId: actorId,
      action: 'org.restored',
      targetType: 'Organization',
      targetId: orgId,
      organizationId: orgId,
      ipAddress,
      metadata: { name: org.name },
    });

    return updated;
  });
}

/**
 * List all organizations with member count and deletion days remaining.
 * Includes soft-deleted orgs for "Pending Deletion" display.
 * (SORG-06)
 */
export async function listOrganizations() {
  const orgs = await prisma.organization.findMany({
    include: {
      _count: {
        select: { members: true },
      },
    },
    orderBy: [{ status: 'asc' }, { name: 'asc' }],
  });

  return orgs.map((org) => {
    let daysRemaining: number | null = null;
    if (org.deletedAt) {
      const daysSinceDeleted = Math.floor(
        (Date.now() - org.deletedAt.getTime()) / (24 * 60 * 60 * 1000)
      );
      daysRemaining = Math.max(0, 30 - daysSinceDeleted);
    }

    return {
      id: org.id,
      name: org.name,
      slug: org.slug,
      status: org.status,
      logoBase64: org.logoBase64,
      logoDisplayMode: org.logoDisplayMode,
      createdAt: org.createdAt,
      updatedAt: org.updatedAt,
      deletedAt: org.deletedAt,
      userCount: org._count.members,
      daysRemaining,
    };
  });
}

/**
 * Get a single organization by ID with member count, roles, and settings.
 */
export async function getOrganization(orgId: string) {
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    include: {
      _count: {
        select: { members: true },
      },
      roles: true,
      settings: true,
    },
  });

  if (!org) return null;

  return {
    ...org,
    userCount: org._count.members,
  };
}

/**
 * Update the organization logo.
 * (SORG-07)
 */
export async function updateOrgLogo(
  orgId: string,
  logoBase64: string,
  actorId: string,
  ipAddress: string | null
) {
  return await prisma.$transaction(async (tx: PrismaTransactionClient) => {
    const org = await tx.organization.findUnique({ where: { id: orgId } });
    if (!org) {
      throw new Error('Organization not found');
    }

    const updated = await tx.organization.update({
      where: { id: orgId },
      data: { logoBase64 },
    });

    await auditLog.record(tx, {
      userId: actorId,
      action: 'org.logo_updated',
      targetType: 'Organization',
      targetId: orgId,
      organizationId: orgId,
      ipAddress,
      metadata: { name: org.name },
    });

    return updated;
  });
}
