/**
 * Registration Service
 *
 * Handles invitation acceptance and user registration.
 * Reads invitations directly from the database (not through invitation-service.ts).
 *
 * UATH-01: User can accept invitation and create account
 * UATH-02: Name is required at registration
 * UATH-04: Password validated against org policy
 * SAFE-02: Email uniqueness enforced
 */

import prisma from '@/lib/db';
import { auditLog, type PrismaTransactionClient } from './audit-service';
import { hashPassword, generateToken } from '@/lib/encryption';
import {
  validatePasswordAgainstPolicy,
  getPasswordRequirements,
} from './password-validation';

// ============================================================================
// Types
// ============================================================================

export interface ValidInvitationResult {
  valid: true;
  invitation: {
    id: string;
    email: string;
    orgName: string;
    orgSlug: string;
    orgLogo: string | null;
    orgLogoDisplayMode: string;
    roleName: string;
  };
  passwordRequirements: string[];
}

export interface InvalidInvitationResult {
  valid: false;
  reason:
    | 'not_found'
    | 'expired'
    | 'revoked'
    | 'already_accepted'
    | 'org_unavailable';
}

export type InvitationValidationResult =
  | ValidInvitationResult
  | InvalidInvitationResult;

export interface AcceptInvitationSuccess {
  success: true;
  user: { id: string; email: string; name: string };
  token: string;
  expiresAt: Date;
  organization: { id: string; name: string; slug: string };
}

export interface AcceptInvitationError {
  success: false;
  error: string;
  errorType?:
    | 'not_found'
    | 'expired'
    | 'revoked'
    | 'already_accepted'
    | 'org_unavailable'
    | 'already_registered'
    | 'password_policy'
    | 'validation';
  details?: string[];
}

export type AcceptInvitationResult =
  | AcceptInvitationSuccess
  | AcceptInvitationError;

// ============================================================================
// Validate Invitation Token
// ============================================================================

/**
 * Validate an invitation token without accepting it.
 * Used by the registration page server component to check before rendering the form.
 *
 * Returns invitation details (org name, email, role, password requirements) if valid,
 * or a reason code if invalid.
 */
export async function validateInvitationToken(
  token: string
): Promise<InvitationValidationResult> {
  const invitation = await prisma.invitation.findUnique({
    where: { token },
    include: {
      organization: {
        select: {
          id: true,
          name: true,
          slug: true,
          status: true,
          logoBase64: true,
          logoDisplayMode: true,
          deletedAt: true,
        },
      },
      role: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  if (!invitation) {
    return { valid: false, reason: 'not_found' };
  }

  // Check org is active and not deleted
  if (
    invitation.organization.status !== 'ACTIVE' ||
    invitation.organization.deletedAt !== null
  ) {
    return { valid: false, reason: 'org_unavailable' };
  }

  // Check invitation status
  if (invitation.status === 'ACCEPTED') {
    return { valid: false, reason: 'already_accepted' };
  }

  if (invitation.status === 'REVOKED') {
    return { valid: false, reason: 'revoked' };
  }

  if (invitation.status === 'EXPIRED' || invitation.expiresAt < new Date()) {
    return { valid: false, reason: 'expired' };
  }

  // Only PENDING invitations with a valid expiry reach here
  // Load password policy for the org
  const policy = await prisma.passwordPolicy.findUnique({
    where: { organizationId: invitation.organizationId },
  });

  return {
    valid: true,
    invitation: {
      id: invitation.id,
      email: invitation.email,
      orgName: invitation.organization.name,
      orgSlug: invitation.organization.slug,
      orgLogo: invitation.organization.logoBase64,
      orgLogoDisplayMode: invitation.organization.logoDisplayMode,
      roleName: invitation.role.name,
    },
    passwordRequirements: getPasswordRequirements(policy),
  };
}

// ============================================================================
// Accept Invitation
// ============================================================================

/**
 * Accept an invitation and register a new user.
 *
 * Atomically creates: User + OrgMember + Session, updates Invitation status,
 * and records audit log -- all in a single transaction.
 *
 * UATH-01: Creates user account from invitation
 * UATH-02: Requires name
 * UATH-03: avatarBase64 left null -- existing chat UI renders initials
 * UATH-04: Validates password against org policy
 * SAFE-02: Email uniqueness enforced at check-time and via P2002 catch
 */
export async function acceptInvitation(
  token: string,
  name: string,
  password: string,
  ipAddress: string | null,
  userAgent: string | null
): Promise<AcceptInvitationResult> {
  // Step 1: Find and validate invitation (same checks as validateInvitationToken)
  const invitation = await prisma.invitation.findUnique({
    where: { token },
    include: {
      organization: {
        select: {
          id: true,
          name: true,
          slug: true,
          status: true,
          deletedAt: true,
        },
      },
      role: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  if (!invitation) {
    return {
      success: false,
      error: 'Invitation not found',
      errorType: 'not_found',
    };
  }

  if (
    invitation.organization.status !== 'ACTIVE' ||
    invitation.organization.deletedAt !== null
  ) {
    return {
      success: false,
      error: 'This organization is no longer available',
      errorType: 'org_unavailable',
    };
  }

  if (invitation.status === 'ACCEPTED') {
    return {
      success: false,
      error: 'This invitation has already been accepted',
      errorType: 'already_accepted',
    };
  }

  if (invitation.status === 'REVOKED') {
    return {
      success: false,
      error: 'This invitation has been revoked',
      errorType: 'revoked',
    };
  }

  if (invitation.status === 'EXPIRED' || invitation.expiresAt < new Date()) {
    return {
      success: false,
      error: 'This invitation has expired. Please contact your organization admin to resend the invitation.',
      errorType: 'expired',
    };
  }

  // Step 2: Check email not already registered
  const existingUser = await prisma.user.findUnique({
    where: { email: invitation.email },
  });

  if (existingUser) {
    return {
      success: false,
      error: 'This email is already registered in another organization',
      errorType: 'already_registered',
    };
  }

  // Step 3: Validate password against org policy (UATH-04)
  const policy = await prisma.passwordPolicy.findUnique({
    where: { organizationId: invitation.organizationId },
  });

  const validationResult = validatePasswordAgainstPolicy(password, policy);
  if (!validationResult.valid) {
    return {
      success: false,
      error: 'Password does not meet requirements',
      errorType: 'password_policy',
      details: validationResult.errors,
    };
  }

  // Step 4: Validate name (UATH-02)
  const trimmedName = name.trim();
  if (!trimmedName) {
    return {
      success: false,
      error: 'Name is required',
      errorType: 'validation',
    };
  }
  if (trimmedName.length > 100) {
    return {
      success: false,
      error: 'Name must be less than 100 characters',
      errorType: 'validation',
    };
  }

  // Step 5: Atomic transaction -- create user + org member + session + update invitation + audit log
  try {
    const passwordHash = await hashPassword(password);
    const sessionToken = generateToken();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    const result = await prisma.$transaction(async (tx: PrismaTransactionClient) => {
      // Create user
      const user = await tx.user.create({
        data: {
          email: invitation.email,
          passwordHash,
          name: trimmedName,
          // UATH-03: avatarBase64 intentionally left null. Avatar display is UI-only:
          // the chat UI and sidebar already render initials (first letter of first + last name)
          // when avatarBase64 is null. No server-side avatar generation needed.
          // isSuperAdmin: false (default)
        },
      });

      // Create org membership
      await tx.orgMember.create({
        data: {
          userId: user.id,
          organizationId: invitation.organizationId,
          roleId: invitation.roleId,
          status: 'ACTIVE',
        },
      });

      // Update invitation status
      await tx.invitation.update({
        where: { id: invitation.id },
        data: { status: 'ACCEPTED', acceptedAt: new Date() },
      });

      // Create session (auto-login per CONTEXT.md)
      const session = await tx.session.create({
        data: {
          userId: user.id,
          token: sessionToken,
          organizationId: invitation.organizationId,
          userAgent: userAgent || null,
          ipAddress: ipAddress || null,
          expiresAt,
        },
      });

      // Audit log
      await auditLog.record(tx, {
        userId: user.id,
        action: 'user.registered',
        targetType: 'User',
        targetId: user.id,
        organizationId: invitation.organizationId,
        ipAddress,
        metadata: {
          invitationId: invitation.id,
          roleName: invitation.role.name,
          email: invitation.email,
        },
      });

      return { user, session, sessionToken };
    });

    return {
      success: true,
      user: {
        id: result.user.id,
        email: result.user.email,
        name: result.user.name,
      },
      token: result.sessionToken,
      expiresAt,
      organization: {
        id: invitation.organization.id,
        name: invitation.organization.name,
        slug: invitation.organization.slug,
      },
    };
  } catch (error: unknown) {
    // Catch Prisma P2002 (unique constraint on User.email) -- race condition fallback
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      (error as { code: string }).code === 'P2002'
    ) {
      return {
        success: false,
        error: 'This email is already registered in another organization',
        errorType: 'already_registered',
      };
    }
    throw error; // Re-throw unexpected errors
  }
}
