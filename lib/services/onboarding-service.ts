/**
 * Onboarding Service
 *
 * Manages org-level onboarding text and user acceptance tracking.
 * Org Admins configure onboarding text; version bumps re-trigger for all users.
 *
 * Exports:
 *   checkOnboardingRequired(userId, orgMemberId, orgId) -- Check if user needs onboarding
 *   acceptOnboarding(userId, orgMemberId, orgId, ipAddress) -- Record acceptance
 *   getOnboardingConfig(orgId) -- Get config for Org Admin
 *   updateOnboardingConfig(orgId, text, actorId, ipAddress) -- Update text + bump version
 */

import prisma from '@/lib/db';
import { auditLog } from '@/lib/services/audit-service';

// ============================================
// Service Functions
// ============================================

/**
 * Check if user needs onboarding for an org.
 * Compares current OrgSettings.onboardingVersion against OnboardingAgreement records.
 * Returns true if no matching agreement found for the current version.
 */
export async function checkOnboardingRequired(
  userId: string,
  orgMemberId: string,
  orgId: string
): Promise<boolean> {
  // Get current onboarding version from OrgSettings
  const settings = await prisma.orgSettings.findUnique({
    where: { organizationId: orgId },
    select: { onboardingVersion: true, onboardingText: true },
  });

  // If no settings or no onboarding text configured, onboarding not required
  if (!settings || !settings.onboardingText) {
    return false;
  }

  // Check if user has accepted the current version
  const agreement = await prisma.onboardingAgreement.findUnique({
    where: {
      orgMemberId_agreementVersion: {
        orgMemberId,
        agreementVersion: settings.onboardingVersion,
      },
    },
  });

  // Required if no matching agreement found
  return !agreement;
}

/**
 * Record onboarding acceptance.
 * Creates OnboardingAgreement record for the current version.
 */
export async function acceptOnboarding(
  userId: string,
  orgMemberId: string,
  orgId: string,
  ipAddress: string | null
): Promise<void> {
  // Get current onboarding version
  const settings = await prisma.orgSettings.findUnique({
    where: { organizationId: orgId },
    select: { onboardingVersion: true },
  });

  if (!settings) {
    throw new Error('Organization settings not found');
  }

  await prisma.$transaction(async (tx) => {
    // Create agreement record
    await tx.onboardingAgreement.create({
      data: {
        userId,
        orgMemberId,
        organizationId: orgId,
        agreementVersion: settings.onboardingVersion,
        ipAddress,
      },
    });

    // Audit log
    await auditLog.record(tx, {
      userId,
      action: 'onboarding.accepted',
      targetType: 'OnboardingAgreement',
      targetId: orgMemberId,
      organizationId: orgId,
      ipAddress,
      metadata: { version: settings.onboardingVersion },
    });
  });
}

/**
 * Get onboarding config for Org Admin.
 * Returns current text and version.
 */
export async function getOnboardingConfig(
  orgId: string
): Promise<{ text: string | null; version: number }> {
  const settings = await prisma.orgSettings.findUnique({
    where: { organizationId: orgId },
    select: { onboardingText: true, onboardingVersion: true },
  });

  return {
    text: settings?.onboardingText ?? null,
    version: settings?.onboardingVersion ?? 1,
  };
}

/**
 * Update onboarding config (Org Admin).
 * Updates OrgSettings.onboardingText and increments onboardingVersion.
 * Version bump re-triggers onboarding for all users.
 */
export async function updateOnboardingConfig(
  orgId: string,
  text: string,
  actorId: string,
  ipAddress: string | null
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    // Get current version
    const settings = await tx.orgSettings.findUnique({
      where: { organizationId: orgId },
      select: { onboardingVersion: true },
    });

    const newVersion = (settings?.onboardingVersion ?? 0) + 1;

    // Update text and bump version
    await tx.orgSettings.update({
      where: { organizationId: orgId },
      data: {
        onboardingText: text,
        onboardingVersion: newVersion,
      },
    });

    // Audit log
    await auditLog.record(tx, {
      userId: actorId,
      action: 'onboarding.config_updated',
      targetType: 'OrgSettings',
      targetId: orgId,
      organizationId: orgId,
      ipAddress,
      metadata: { newVersion },
    });
  });
}
