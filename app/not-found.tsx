import Link from "next/link"

/**
 * Global 404 page.
 *
 * Handles unknown subdomains (e.g., nonexistent-org.llmatscale.ai).
 * Displays "Organization not found" with a link back to the bare domain.
 * Does NOT reveal whether the organization ever existed (no info leakage).
 * Clean, minimal design consistent with the app's theme.
 */
export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="mx-auto max-w-md text-center">
        <div className="mb-6 flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <span className="text-2xl font-bold text-muted-foreground">
              404
            </span>
          </div>
        </div>
        <h1 className="mb-2 text-2xl font-bold text-foreground">
          Organization not found
        </h1>
        <p className="mb-8 text-sm text-muted-foreground">
          The organization you&apos;re looking for doesn&apos;t exist or may
          have been removed.
        </p>
        <Link
          href="/"
          className="inline-flex h-10 items-center justify-center rounded-lg bg-primary px-6 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Go to LLMatscale.ai
        </Link>
        <p className="mt-6 text-[11px] text-muted-foreground/50">
          If you believe this is an error, please contact your administrator.
        </p>
      </div>
    </div>
  )
}
