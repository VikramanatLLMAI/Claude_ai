/**
 * Invitation Service
 *
 * Handles the invitation lifecycle: create, revoke, resend, list.
 * All mutations are wrapped in prisma.$transaction() with audit logging.
 *
 * Covers: OUSR-01 (invite by email), OUSR-09 (revoke/resend), SAFE-02 (admin protection)
 */

import prisma from '@/lib/db';
import { generateToken } from '@/lib/encryption';
import { resend } from '@/lib/email/resend';
import { InvitationEmail } from '@/lib/email/templates/invitation-email';
import { auditLog, type PrismaTransactionClient } from './audit-service';
import { render } from '@react-email/components';

// ============================================
// Constants
// ============================================

const INVITATION_EXPIRY_DAYS = 7;
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'LLMatscale.ai <onboarding@resend.dev>';
const ROOT_DOMAIN = process.env.ROOT_DOMAIN || 'llmatscale.ai';

// ============================================
// Types
// ============================================

interface SendEmailParams {
  recipientEmail: string;
  orgName: string;
  orgSlug: string;
  inviterName: string;
  roleName: string;
  token: string;
}

interface OrgContext {
  id: string;
  name: string;
  slug: string;
}

interface CreateInvitationData {
  email: string;
  roleId: string;
}

// ============================================
// Internal Helpers
// ============================================

/**
 * Check if a role is an admin role by checking permissions or name.
 */
function isAdminRole(role: { name: string; permissions: unknown }): boolean {
  return (
    role.name === 'Org Admin' ||
    (Array.isArray(role.permissions) && role.permissions.includes('org_admin'))
  );
}

/**
 * Build the accept URL for an invitation.
 * Dev: http://localhost:3000/org/{slug}/register?token={token}
 * Prod: https://{slug}.{ROOT_DOMAIN}/register?token={token}
 */
function buildAcceptUrl(orgSlug: string, token: string): string {
  if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === undefined) {
    return `http://localhost:3000/org/${orgSlug}/register?token=${token}`;
  }
  return `https://${orgSlug}.${ROOT_DOMAIN}/register?token=${token}`;
}

/**
 * Send an invitation email via Resend.
 * Falls back to console logging if RESEND_API_KEY is not set.
 */
export async function sendInvitationEmail(params: SendEmailParams): Promise<void> {
  const { recipientEmail, orgName, orgSlug, inviterName, roleName, token } = params;
  const acceptUrl = buildAcceptUrl(orgSlug, token);

  // Dev fallback: log to console when no Resend API key
  if (!resend) {
    console.log('[DEV] Invitation email would be sent to:', recipientEmail);
    console.log('[DEV] Accept URL:', acceptUrl);
    console.log('[DEV] Org:', orgName, '| Inviter:', inviterName, '| Role:', roleName);
    return;
  }

  try {
    const emailHtml = await render(
      InvitationEmail({
        orgName,
        inviterName,
        roleName,
        acceptUrl,
        expiresInDays: INVITATION_EXPIRY_DAYS,
      })
    );

    await resend.emails.send({
      from: FROM_EMAIL,
      to: recipientEmail,
      subject: `${inviterName} invited you to join ${orgName} on LLMatscale.ai`,
      html: emailHtml,
    });
  } catch (error) {
    console.error('Failed to send invitation email:', error);
    throw new Error('Failed to send invitation email');
  }
}

// ============================================
// Invitation CRUD
// ============================================

/**
 * Create an invitation for a user to join an organization.
 * Validates role belongs to org, checks for duplicate pending invitations.
 * Sends invitation email after successful database transaction.
 * (OUSR-01)
 */
export async function createInvitation(
  data: CreateInvitationData,
  orgContext: OrgContext,
  actorId: string,
  ipAddress: string | null
) {
  const { email, roleId } = data;

  // Validate the roleId belongs to this org
  const role = await prisma.role.findFirst({
    where: { id: roleId, organizationId: orgContext.id },
  });
  if (!role) {
    throw new Error('Role not found in this organization');
  }

  // Check if email already has a PENDING invitation for this org
  const existingPending = await prisma.invitation.findFirst({
    where: {
      email: email.toLowerCase(),
      organizationId: orgContext.id,
      status: 'PENDING',
    },
  });
  if (existingPending) {
    throw new Error('An invitation is already pending for this email');
  }

  // NOTE: Per CONTEXT.md, do NOT check if email is already registered at invite-send time.
  // Multiple orgs CAN invite the same email. Uniqueness check happens at registration/acceptance.

  // Create invitation in transaction with audit log
  const invitation = await prisma.$transaction(async (tx: PrismaTransactionClient) => {
    const inv = await tx.invitation.create({
      data: {
        organizationId: orgContext.id,
        email: email.toLowerCase(),
        roleId,
        invitedById: actorId,
        token: generateToken(),
        status: 'PENDING',
        expiresAt: new Date(Date.now() + INVITATION_EXPIRY_DAYS * 24 * 60 * 60 * 1000),
      },
      include: {
        role: true,
        invitedBy: { select: { name: true } },
      },
    });

    await auditLog.record(tx, {
      userId: actorId,
      action: 'invitation.created',
      targetType: 'Invitation',
      targetId: inv.id,
      organizationId: orgContext.id,
      ipAddress,
      metadata: { email: email.toLowerCase(), roleName: role.name },
    });

    return inv;
  });

  // Send email outside transaction (email is non-transactional)
  const inviter = await prisma.user.findUnique({
    where: { id: actorId },
    select: { name: true },
  });

  await sendInvitationEmail({
    recipientEmail: email.toLowerCase(),
    orgName: orgContext.name,
    orgSlug: orgContext.slug,
    inviterName: inviter?.name || 'An administrator',
    roleName: role.name,
    token: invitation.token,
  });

  return invitation;
}

/**
 * Revoke a pending invitation.
 * Includes SAFE-02 guard: cannot revoke if it would leave org with 0 admins.
 * (OUSR-09, SAFE-02)
 */
export async function revokeInvitation(
  invitationId: string,
  orgId: string,
  actorId: string,
  ipAddress: string | null
) {
  // Find invitation with its role
  const invitation = await prisma.invitation.findFirst({
    where: { id: invitationId, organizationId: orgId },
    include: { role: true },
  });

  if (!invitation) {
    throw new Error('Invitation not found');
  }

  if (invitation.status !== 'PENDING') {
    throw new Error('Only pending invitations can be revoked');
  }

  // SAFE-02: If this invitation is for an admin role, check admin coverage
  if (isAdminRole(invitation.role)) {
    // Load active members with roles to check admin permissions in code
    const activeAdminMembersByPermission = await prisma.orgMember.findMany({
      where: {
        organizationId: orgId,
        status: 'ACTIVE',
      },
      include: { role: true },
    });

    const activeAdminCount = activeAdminMembersByPermission.filter(
      (m) => isAdminRole(m.role)
    ).length;

    // Count remaining PENDING invitations for admin roles (excluding this one)
    const pendingAdminInvitations = await prisma.invitation.findMany({
      where: {
        organizationId: orgId,
        status: 'PENDING',
        id: { not: invitationId },
      },
      include: { role: true },
    });

    const pendingAdminCount = pendingAdminInvitations.filter(
      (inv) => isAdminRole(inv.role)
    ).length;

    if (activeAdminCount + pendingAdminCount === 0) {
      throw new Error(
        'Cannot revoke: this would leave the organization with no admin. At least one active admin or pending admin invitation must exist.'
      );
    }
  }

  // Revoke in transaction with audit log
  const updated = await prisma.$transaction(async (tx: PrismaTransactionClient) => {
    const inv = await tx.invitation.update({
      where: { id: invitationId },
      data: { status: 'REVOKED' },
      include: {
        role: true,
        invitedBy: { select: { name: true } },
      },
    });

    await auditLog.record(tx, {
      userId: actorId,
      action: 'invitation.revoked',
      targetType: 'Invitation',
      targetId: inv.id,
      organizationId: orgId,
      ipAddress,
      metadata: { email: inv.email, roleName: inv.role.name },
    });

    return inv;
  });

  return updated;
}

/**
 * Resend an invitation (PENDING or EXPIRED).
 * Generates a new token, resets expiry, and re-sends email.
 * (OUSR-09)
 */
export async function resendInvitation(
  invitationId: string,
  orgId: string,
  actorId: string,
  ipAddress: string | null
) {
  // Find invitation with role and org
  const invitation = await prisma.invitation.findFirst({
    where: { id: invitationId, organizationId: orgId },
    include: {
      role: true,
      organization: true,
      invitedBy: { select: { name: true } },
    },
  });

  if (!invitation) {
    throw new Error('Invitation not found');
  }

  // Can resend PENDING or EXPIRED invitations
  if (invitation.status === 'ACCEPTED' || invitation.status === 'REVOKED') {
    throw new Error('Cannot resend accepted or revoked invitations');
  }

  // Generate new token and reset expiry
  const newToken = generateToken();

  const updated = await prisma.$transaction(async (tx: PrismaTransactionClient) => {
    const inv = await tx.invitation.update({
      where: { id: invitationId },
      data: {
        token: newToken,
        status: 'PENDING',
        expiresAt: new Date(Date.now() + INVITATION_EXPIRY_DAYS * 24 * 60 * 60 * 1000),
      },
      include: {
        role: true,
        organization: true,
        invitedBy: { select: { name: true } },
      },
    });

    await auditLog.record(tx, {
      userId: actorId,
      action: 'invitation.resent',
      targetType: 'Invitation',
      targetId: inv.id,
      organizationId: orgId,
      ipAddress,
      metadata: { email: inv.email, roleName: inv.role.name },
    });

    return inv;
  });

  // Re-send email with new token
  const inviter = await prisma.user.findUnique({
    where: { id: actorId },
    select: { name: true },
  });

  await sendInvitationEmail({
    recipientEmail: updated.email,
    orgName: updated.organization.name,
    orgSlug: updated.organization.slug,
    inviterName: inviter?.name || 'An administrator',
    roleName: updated.role.name,
    token: newToken,
  });

  return updated;
}

/**
 * List all invitations for an organization.
 * Performs lazy expiry check: marks overdue PENDING invitations as EXPIRED.
 */
export async function listInvitations(orgId: string) {
  // Lazy expiry check: batch-update overdue PENDING invitations to EXPIRED
  await prisma.invitation.updateMany({
    where: {
      organizationId: orgId,
      status: 'PENDING',
      expiresAt: { lt: new Date() },
    },
    data: { status: 'EXPIRED' },
  });

  // Fetch all invitations for this org
  const invitations = await prisma.invitation.findMany({
    where: { organizationId: orgId },
    include: {
      role: { select: { id: true, name: true } },
      invitedBy: { select: { id: true, name: true } },
    },
    orderBy: [
      { status: 'asc' }, // PENDING first (alphabetically before others)
      { createdAt: 'desc' },
    ],
  });

  return invitations;
}
