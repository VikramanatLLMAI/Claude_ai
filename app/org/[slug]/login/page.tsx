import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { OrgLoginPage } from "@/components/org-login-page";
import { getActiveTheme } from "@/lib/services/theme-service";
import { getLoginBranding } from "@/lib/services/login-branding-service";

/**
 * Org login page - server component that looks up org and renders the branded login.
 *
 * Route: /org/[slug]/login (dev) or {slug}.llmatscale.ai/login (prod)
 *
 * Fetches org data, login branding, and active theme server-side to avoid FOUC.
 * Passes all data to OrgLoginPage client component as props.
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
    },
  });

  if (!org) {
    notFound();
  }

  // Fetch active theme and login branding server-side
  const [activeTheme, loginBranding] = await Promise.all([
    getActiveTheme(org.id),
    getLoginBranding(org.id),
  ]);

  return (
    <OrgLoginPage
      org={{
        id: org.id,
        name: org.name,
        slug: org.slug,
        logoBase64: org.logoBase64,
        logoDisplayMode: org.logoDisplayMode,
        activeTheme,
      }}
      loginBranding={loginBranding}
    />
  );
}
