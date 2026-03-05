/**
 * Theme Service
 *
 * Manages theme assignment and selection for organizations.
 * Super Admin assigns available themes to an org; Org Admin picks one as active.
 * Fallback chain: activeTheme -> default assignment -> null (platform default = claude).
 *
 * Covers: SORG-08, SORG-09, OTHM-05, OTHM-06, OTHM-07
 */

import prisma from '@/lib/db';
import { auditLog, type PrismaTransactionClient } from './audit-service';

// ============================================
// Constants & Types
// ============================================

export const VALID_THEMES = ['claude', 'vercel', 'solar-dusk', 'twitter', 'violet-bloom'] as const;
export type ThemeName = typeof VALID_THEMES[number];

export interface ThemeAssignment {
  id: string;
  themeName: string;
  isDefault: boolean;
  createdAt: Date;
}

export interface AssignedThemesResult {
  themes: ThemeAssignment[];
  activeTheme: string | null;
}

// ============================================
// Validation
// ============================================

/**
 * Validate that a theme name is one of the supported themes.
 */
export function isValidTheme(name: string): name is ThemeName {
  return VALID_THEMES.includes(name as ThemeName);
}

// ============================================
// Super Admin: Set assigned themes for an org
// ============================================

/**
 * Replace the set of themes assigned to an organization.
 *
 * - Validates all theme names against VALID_THEMES
 * - Deletes existing OrgThemeAssignment rows for org
 * - Creates new rows, marking one as isDefault
 * - If current activeTheme in OrgSettings is not in new assigned set, clears it (fallback)
 * - Audit log: "theme_assignment_updated"
 *
 * (SORG-08, SORG-09)
 */
export async function setOrgThemes(
  orgId: string,
  themes: string[],
  defaultTheme: string | null,
  actorId: string,
  ipAddress: string | null
): Promise<ThemeAssignment[]> {
  // Validate all theme names
  const invalidThemes = themes.filter((t) => !isValidTheme(t));
  if (invalidThemes.length > 0) {
    throw new Error(`Invalid theme names: ${invalidThemes.join(', ')}`);
  }

  // Validate default theme is in the assigned set (if provided)
  if (defaultTheme !== null && !themes.includes(defaultTheme)) {
    throw new Error('Default theme must be one of the assigned themes');
  }

  return await prisma.$transaction(async (tx: PrismaTransactionClient) => {
    // Delete existing assignments
    await tx.orgThemeAssignment.deleteMany({
      where: { organizationId: orgId },
    });

    // Create new assignments
    const created: ThemeAssignment[] = [];
    for (const themeName of themes) {
      const assignment = await tx.orgThemeAssignment.create({
        data: {
          organizationId: orgId,
          themeName,
          isDefault: themeName === defaultTheme,
        },
      });
      created.push({
        id: assignment.id,
        themeName: assignment.themeName,
        isDefault: assignment.isDefault,
        createdAt: assignment.createdAt,
      });
    }

    // If current activeTheme is not in new assigned set, clear it (OTHM-05 fallback)
    const settings = await tx.orgSettings.findUnique({
      where: { organizationId: orgId },
      select: { activeTheme: true },
    });

    if (settings?.activeTheme && !themes.includes(settings.activeTheme)) {
      await tx.orgSettings.update({
        where: { organizationId: orgId },
        data: { activeTheme: null },
      });
    }

    // Audit log
    await auditLog.record(tx, {
      userId: actorId,
      action: 'theme_assignment_updated',
      targetType: 'Organization',
      targetId: orgId,
      organizationId: orgId,
      ipAddress,
      metadata: {
        assignedThemes: themes,
        defaultTheme,
      },
    });

    return created;
  });
}

// ============================================
// Super Admin: Get assigned themes for an org
// ============================================

/**
 * Return the list of themes assigned to an org and the current active theme.
 */
export async function getAssignedThemes(orgId: string): Promise<AssignedThemesResult> {
  const [themes, settings] = await Promise.all([
    prisma.orgThemeAssignment.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.orgSettings.findUnique({
      where: { organizationId: orgId },
      select: { activeTheme: true },
    }),
  ]);

  return {
    themes: themes.map((t) => ({
      id: t.id,
      themeName: t.themeName,
      isDefault: t.isDefault,
      createdAt: t.createdAt,
    })),
    activeTheme: settings?.activeTheme ?? null,
  };
}

// ============================================
// Org Admin: Set active theme from assigned themes
// ============================================

/**
 * Set the active theme for an org. Must be one of the assigned themes.
 * (OTHM-07: server-side validation)
 */
export async function setActiveTheme(
  orgId: string,
  themeName: string,
  actorId: string,
  ipAddress: string | null
): Promise<void> {
  // Validate the theme is in the org's assigned set
  const assignment = await prisma.orgThemeAssignment.findFirst({
    where: {
      organizationId: orgId,
      themeName,
    },
  });

  if (!assignment) {
    throw new Error('Theme is not assigned to this organization');
  }

  await prisma.$transaction(async (tx: PrismaTransactionClient) => {
    await tx.orgSettings.update({
      where: { organizationId: orgId },
      data: { activeTheme: themeName },
    });

    await auditLog.record(tx, {
      userId: actorId,
      action: 'theme_changed',
      targetType: 'Organization',
      targetId: orgId,
      organizationId: orgId,
      ipAddress,
      metadata: { themeName },
    });
  });
}

// ============================================
// User-facing: Get active theme for org (with fallback chain)
// ============================================

/**
 * Get the active theme for an org with fallback chain:
 * 1. OrgSettings.activeTheme (if still in assigned set)
 * 2. Default theme from OrgThemeAssignment (isDefault=true)
 * 3. null (platform default = claude applied by frontend)
 *
 * (OTHM-05: active theme removed -> falls back to default)
 * (OTHM-06: all themes removed -> returns null -> frontend uses platform default)
 */
export async function getActiveTheme(orgId: string): Promise<string | null> {
  const [settings, assignments] = await Promise.all([
    prisma.orgSettings.findUnique({
      where: { organizationId: orgId },
      select: { activeTheme: true },
    }),
    prisma.orgThemeAssignment.findMany({
      where: { organizationId: orgId },
    }),
  ]);

  // No assignments at all -> null (OTHM-06)
  if (assignments.length === 0) {
    return null;
  }

  const assignedNames = assignments.map((a) => a.themeName);

  // Check if activeTheme is still in the assigned set
  if (settings?.activeTheme && assignedNames.includes(settings.activeTheme)) {
    return settings.activeTheme;
  }

  // Fallback to default assignment (OTHM-05)
  const defaultAssignment = assignments.find((a) => a.isDefault);
  if (defaultAssignment) {
    return defaultAssignment.themeName;
  }

  // No default set -> null (platform default)
  return null;
}
