/**
 * Super Admin layout - wraps all pages under /admin/*.
 *
 * Simple layout wrapper for Super Admin panel.
 * No org context (Super Admin has no org).
 * Children rendered directly.
 *
 * Route: /admin/* (dev) or admin.llmatscale.ai/* (prod)
 */

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  return <>{children}</>;
}
