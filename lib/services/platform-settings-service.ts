/**
 * Platform Settings Service
 *
 * Manages the singleton PlatformSettings record for platform-level configuration.
 * Uses upsert pattern to ensure the singleton always exists.
 *
 * All mutations are wrapped in prisma.$transaction() with co-located audit logging.
 *
 * Covers: SSET-01, SSET-02
 */

import prisma from '@/lib/db';
import { auditLog } from '@/lib/services/audit-service';
import type { PlatformSettings } from '@/lib/generated/prisma/client';

// ============================================
// Types
// ============================================

export interface PlatformSettingsInput {
  platformName?: string;
  sessionExpiryDays?: number;
  maintenanceMode?: boolean;
  featureToggles?: {
    webSearch?: boolean;
    fileUploads?: boolean;
    mcpTools?: boolean;
    artifactGeneration?: boolean;
    extendedThinking?: boolean;
  };
  platformPrompt?: string | null;
}

// ============================================
// Service Functions
// ============================================

/**
 * Get the platform settings singleton.
 * Creates it with defaults if it doesn't exist.
 */
export async function getPlatformSettings(): Promise<PlatformSettings> {
  return prisma.platformSettings.upsert({
    where: { id: 'singleton' },
    update: {},
    create: { id: 'singleton' },
  });
}

/**
 * Update the platform settings singleton.
 * Logs the change with before/after diff in audit log.
 *
 * @param data - Fields to update
 * @param userId - Super Admin user ID performing the change
 * @param ipAddress - Client IP for audit log
 */
export async function updatePlatformSettings(
  data: PlatformSettingsInput,
  userId: string,
  ipAddress: string | null
): Promise<PlatformSettings> {
  return prisma.$transaction(async (tx) => {
    const current = await tx.platformSettings.findUnique({
      where: { id: 'singleton' },
    });

    const updated = await tx.platformSettings.upsert({
      where: { id: 'singleton' },
      update: data,
      create: { id: 'singleton', ...data },
    });

    await auditLog.record(tx, {
      action: 'platform_settings.updated',
      userId,
      ipAddress,
      metadata: {
        before: current
          ? {
              platformName: current.platformName,
              sessionExpiryDays: current.sessionExpiryDays,
              maintenanceMode: current.maintenanceMode,
              featureToggles: current.featureToggles,
              platformPrompt: current.platformPrompt,
            }
          : null,
        after: {
          platformName: updated.platformName,
          sessionExpiryDays: updated.sessionExpiryDays,
          maintenanceMode: updated.maintenanceMode,
          featureToggles: updated.featureToggles,
          platformPrompt: updated.platformPrompt,
        },
        changedFields: Object.keys(data),
      },
    });

    return updated;
  });
}
