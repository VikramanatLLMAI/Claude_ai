import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { OrgLoginPage } from "@/components/org-login-page";
import { getActiveTheme } from "@/lib/services/theme-service";

/**
 * Org login page - server component that looks up org and renders the branded login.
 *
 * Route: /org/[slug]/login (dev) or {slug}.llmatscale.ai/login (prod)
 *
 * This server component:
 * - Extracts slug from params
 * - Looks up org by slug via unscoped prisma (Organization is not tenant-scoped)
 * - Fetches OrgSettings for tagline, welcome message, and active theme
 * - If org not found or soft-deleted: triggers 404
 * - Passes org data + branding to OrgLoginPage client component
 */

interface OrgLoginPageProps {
  params: Promise<{ slug: string }>;
}

export default async function OrgLoginRoute({ params }: OrgLoginPageProps) {
  const { slug } = await params;

  const org = await prisma.organization.findFirst({
    where: {
      slug,
      deletedAt: null,
    },
    select: {
      id: true,
      name: true,
      slug: true,
      logoBase64: true,
      logoDisplayMode: true,
      settings: {
        select: {
          loginTagline: true,
          loginWelcomeMessage: true,
        },
      },
    },
  });

  if (!org) {
    notFound();
  }

  // Fetch active theme server-side for the login page
  const activeTheme = await getActiveTheme(org.id);

  return (
    <OrgLoginPage
      org={{
        id: org.id,
        name: org.name,
        slug: org.slug,
        logoBase64: org.logoBase64,
        logoDisplayMode: org.logoDisplayMode,
        tagline: org.settings?.loginTagline ?? null,
        welcomeMessage: org.settings?.loginWelcomeMessage ?? null,
        activeTheme,
      }}
    />
  );
}
