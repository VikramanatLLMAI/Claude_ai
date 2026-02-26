/**
 * proxy.ts - Subdomain-to-path rewriting for production multi-tenancy.
 *
 * Next.js 16 proxy file (replaces deprecated middleware.ts).
 * Handles subdomain-to-path rewriting ONLY in production.
 * Development uses path-based routing directly (/org/:slug/..., /admin/...).
 *
 * CRITICAL: This file does NO authentication, NO database queries.
 * It is a thin URL rewriter only. Auth is enforced at route handler level
 * per AUTH-07 (CVE-2025-29927 defense-in-depth).
 *
 * Production routing:
 *   admin.llmatscale.ai/* -> /admin/*
 *   {org-slug}.llmatscale.ai/* -> /org/{slug}/*
 *   llmatscale.ai (bare domain) -> serves bare domain pages as-is
 *   www.llmatscale.ai -> serves bare domain pages as-is
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const ROOT_DOMAIN = process.env.ROOT_DOMAIN || 'llmatscale.ai';

/** Platform-owned subdomains that are NOT org slugs. */
const PLATFORM_SUBDOMAINS = new Set(['www', 'api']);

export function proxy(request: NextRequest) {
  const host = request.headers.get('host') || '';
  const { pathname } = request.nextUrl;

  // Skip API routes and static files -- they don't need rewriting
  if (pathname.startsWith('/api/') || pathname.startsWith('/_next/')) {
    return NextResponse.next();
  }

  // Development mode: path-based routing works natively, no rewriting needed
  if (process.env.NODE_ENV === 'development') {
    return NextResponse.next();
  }

  // Bare domain or www: serve the "find my org" landing page as-is
  if (host === ROOT_DOMAIN || host === `www.${ROOT_DOMAIN}`) {
    return NextResponse.next();
  }

  // Extract subdomain from host
  // e.g., "acme-corp.llmatscale.ai" -> "acme-corp"
  // e.g., "admin.llmatscale.ai" -> "admin"
  if (!host.endsWith(`.${ROOT_DOMAIN}`)) {
    return NextResponse.next();
  }

  const subdomain = host.replace(`.${ROOT_DOMAIN}`, '').split('.')[0];

  if (!subdomain) {
    return NextResponse.next();
  }

  // admin.llmatscale.ai -> /admin/... (ROUTE-01)
  if (subdomain === 'admin') {
    const url = request.nextUrl.clone();
    url.pathname = `/admin${pathname}`;
    return NextResponse.rewrite(url);
  }

  // Platform subdomains (www, api) are already handled or pass through
  if (PLATFORM_SUBDOMAINS.has(subdomain)) {
    return NextResponse.next();
  }

  // {org-slug}.llmatscale.ai -> /org/{slug}/... (ROUTE-02)
  const url = request.nextUrl.clone();
  url.pathname = `/org/${subdomain}${pathname}`;

  // Pass org slug as header for server components
  const response = NextResponse.rewrite(url);
  response.headers.set('x-org-slug', subdomain);
  return response;
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
