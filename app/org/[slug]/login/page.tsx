import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { OrgLoginPage } from "@/components/org-login-page";

/**
 * Org login page - server component that looks up org and renders the branded login.
 *
 * Route: /org/[slug]/login (dev) or {slug}.llmatscale.ai/login (prod)
 *
 * This server component:
 * - Extracts slug from params
 * - Looks up org by slug via unscoped prisma (Organization is not tenant-scoped)
 * - If org not found or soft-deleted: triggers 404
 * - Passes org data to OrgLoginPage client component
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

  return (
    <OrgLoginPage
      org={{
        id: org.id,
        name: org.name,
        slug: org.slug,
        logoBase64: org.logoBase64,
        logoDisplayMode: org.logoDisplayMode,
      }}
    />
  );
}
