/**
 * Login Branding Service
 *
 * CRUD operations for per-org login page branding (headline, badge, description, feature cards).
 * Uses unscoped prisma since this is org-level config accessed by admin routes.
 */

import prisma from '@/lib/db';

export interface FeatureCard {
  icon: string;
  title: string;
  subtitle: string;
}

export interface LoginBrandingData {
  loginHeadline?: string | null;
  loginBadge?: string | null;
  loginDescription?: string | null;
  loginFeatureCards?: FeatureCard[];
}

/**
 * Get login branding for an organization.
 * Returns null if no branding has been configured.
 */
export async function getLoginBranding(organizationId: string) {
  const branding = await prisma.loginBranding.findUnique({
    where: { organizationId },
  });

  if (!branding) return null;

  return {
    loginHeadline: branding.loginHeadline,
    loginBadge: branding.loginBadge,
    loginDescription: branding.loginDescription,
    loginFeatureCards: (branding.loginFeatureCards as unknown as FeatureCard[]) || [],
  };
}

/**
 * Create or update login branding for an organization.
 */
export async function upsertLoginBranding(
  organizationId: string,
  data: LoginBrandingData
) {
  const updateData: Record<string, unknown> = {};

  if (data.loginHeadline !== undefined) updateData.loginHeadline = data.loginHeadline;
  if (data.loginBadge !== undefined) updateData.loginBadge = data.loginBadge;
  if (data.loginDescription !== undefined) updateData.loginDescription = data.loginDescription;
  if (data.loginFeatureCards !== undefined) updateData.loginFeatureCards = data.loginFeatureCards as any;

  const branding = await prisma.loginBranding.upsert({
    where: { organizationId },
    create: {
      organizationId,
      loginHeadline: data.loginHeadline ?? null,
      loginBadge: data.loginBadge ?? null,
      loginDescription: data.loginDescription ?? null,
      loginFeatureCards: (data.loginFeatureCards as any) ?? [],
    },
    update: updateData,
  });

  return {
    loginHeadline: branding.loginHeadline,
    loginBadge: branding.loginBadge,
    loginDescription: branding.loginDescription,
    loginFeatureCards: (branding.loginFeatureCards as unknown as FeatureCard[]) || [],
  };
}
