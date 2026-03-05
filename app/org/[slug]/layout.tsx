import { prisma } from "@/lib/db";
import { notFound, redirect } from "next/navigation";
import { getActiveTheme } from "@/lib/services/theme-service";
import { OrgThemeProvider } from "@/components/org-theme-provider";

/**
 * Org-scoped layout - wraps all pages under /org/[slug]/*.
 *
 * Server component that:
 * - Extracts slug from route params
 * - Looks up organization by slug (unscoped -- org lookup is by slug, not orgId)
 * - If org not found or soft-deleted: triggers Next.js not-found page
 * - If org is SUSPENDED: shows suspension message
 * - Fetches active theme server-side and applies via OrgThemeProvider (no FOUC)
 */

interface OrgLayoutProps {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}

export default async function OrgLayout({ children, params }: OrgLayoutProps) {
  const { slug } = await params;

  // Look up organization by slug -- unscoped query (Organization is not tenant-scoped)
  const org = await prisma.organization.findFirst({
    where: {
      slug,
      deletedAt: null,
    },
    select: {
      id: true,
      name: true,
      slug: true,
      status: true,
      logoBase64: true,
      logoDisplayMode: true,
    },
  });

  // If org not found, trigger the not-found page
  if (!org) {
    notFound();
  }

  // If org is suspended, show suspension message
  if (org.status === "SUSPENDED") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="mx-auto max-w-md text-center">
          <div className="mb-6 flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-8 w-8 text-destructive"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
            </div>
          </div>
          <h1 className="mb-2 text-2xl font-bold text-foreground">
            Organization Suspended
          </h1>
          <p className="mb-6 text-sm text-muted-foreground">
            Access to <span className="font-medium">{org.name}</span> has been
            temporarily suspended. Please contact your organization administrator
            for more information.
          </p>
          <a
            href="/"
            className="inline-flex h-10 items-center justify-center rounded-lg bg-primary px-6 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go to LLMatscale.ai
          </a>
        </div>
      </div>
    );
  }

  // Fetch active theme from DB (server-side, no FOUC)
  const activeTheme = await getActiveTheme(org.id);

  return (
    <OrgThemeProvider activeTheme={activeTheme}>
      {children}
    </OrgThemeProvider>
  );
}
