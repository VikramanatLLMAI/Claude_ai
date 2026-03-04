/**
 * Org Context Resolution
 *
 * Resolves organization context from the incoming request URL.
 * - Development: path-based routing for both page and API paths:
 *   - Page paths: `/org/:slug/...`
 *   - API paths: `/api/org/:slug/...`
 * - Production: subdomain-based routing (`{slug}.llmatscale.ai/...`)
 *
 * Also detects Super Admin context:
 * - Development: path starts with `/admin`
 * - Production: host is `admin.{ROOT_DOMAIN}`
 */

import { NextRequest } from 'next/server';

/** Root domain for subdomain extraction in production. */
const ROOT_DOMAIN = process.env.ROOT_DOMAIN || 'llmatscale.ai';

/** Subdomains that are NOT org slugs (reserved for platform use). */
const PLATFORM_SUBDOMAINS = new Set(['admin', 'super-admin', 'www', 'api', 'app']);

/** Regex for extracting org slug from dev path: /org/:slug/... */
const DEV_ORG_PATH_REGEX = /^\/org\/([^/]+)/;

/** Regex for extracting org slug from dev API path: /api/org/:slug/... */
const DEV_API_ORG_PATH_REGEX = /^\/api\/org\/([^/]+)/;

/**
 * Resolve the organization slug from the request URL.
 *
 * In development (NODE_ENV === 'development'):
 *   Extract slug from path `/org/:slug/...` using regex.
 *
 * In production:
 *   Extract subdomain from host header. Parse `host.replace('.{ROOT_DOMAIN}', '')`.
 *   Skip platform subdomains ('admin', 'www', 'api', 'app').
 *   Check both `host` and `x-forwarded-host` headers (for proxy/load balancer).
 *
 * @returns The org slug, or null if no org context found.
 */
export function resolveOrgSlug(req: NextRequest): string | null {
  if (process.env.NODE_ENV === 'development') {
    // Development: extract slug from path /org/:slug/... or /api/org/:slug/...
    const pathname = req.nextUrl.pathname;
    // Try page path first: /org/:slug/...
    const pageMatch = pathname.match(DEV_ORG_PATH_REGEX);
    if (pageMatch) return pageMatch[1];
    // Try API path: /api/org/:slug/...
    const apiMatch = pathname.match(DEV_API_ORG_PATH_REGEX);
    if (apiMatch) return apiMatch[1];
    return null;
  }

  // Production: extract subdomain from host header
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || '';

  // Strip port if present (e.g., "acme.llmatscale.ai:3000" -> "acme.llmatscale.ai")
  const hostname = host.split(':')[0];

  // Check if hostname ends with ROOT_DOMAIN
  if (!hostname.endsWith(ROOT_DOMAIN)) {
    return null;
  }

  // Extract subdomain: "acme.llmatscale.ai" -> "acme"
  const subdomain = hostname.replace(`.${ROOT_DOMAIN}`, '');

  // If subdomain equals the full hostname (no dot prefix), it's the bare domain
  if (subdomain === hostname || subdomain === '') {
    return null;
  }

  // Skip platform-reserved subdomains
  if (PLATFORM_SUBDOMAINS.has(subdomain.toLowerCase())) {
    return null;
  }

  return subdomain.toLowerCase();
}

/**
 * Check if the request is targeting the Super Admin context.
 *
 * In development: path starts with `/super-admin`
 * In production: host is `super-admin.{ROOT_DOMAIN}`
 *
 * @returns true if this is a Super Admin context request.
 */
export function isSuperAdminContext(req: NextRequest): boolean {
  if (process.env.NODE_ENV === 'development') {
    return req.nextUrl.pathname.startsWith('/super-admin');
  }

  const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || '';
  const hostname = host.split(':')[0];
  return hostname === `super-admin.${ROOT_DOMAIN}`;
}
