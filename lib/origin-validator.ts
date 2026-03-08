/**
 * Origin header validation for mutation requests
 *
 * Validates the Origin header on non-safe HTTP methods to prevent
 * cross-origin attacks. Bearer token auth provides CSRF immunity,
 * but origin validation adds defense-in-depth.
 *
 * Exports: validateOrigin, originDeniedResponse
 */

import { NextRequest, NextResponse } from 'next/server';

// Safe HTTP methods that do not require origin validation
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Validate the Origin header for mutation requests.
 *
 * Rules:
 * - GET, HEAD, OPTIONS are always allowed (safe methods)
 * - If Origin header is absent, allow (same-origin requests may omit it; Bearer token auth is CSRF-immune)
 * - If Origin is present, check against allowed origins list
 * - Allowed: localhost:3000, ROOT_DOMAIN, any subdomain of ROOT_DOMAIN
 *
 * @param req - Next.js request object
 * @returns true if origin is valid or not required, false if origin is disallowed
 */
export function validateOrigin(req: NextRequest): boolean {
  // Safe methods don't need origin validation
  if (SAFE_METHODS.has(req.method)) {
    return true;
  }

  const origin = req.headers.get('Origin');

  // No Origin header — same-origin requests may not include it.
  // Bearer token auth provides CSRF immunity, so this is safe.
  if (!origin) {
    return true;
  }

  // Build allowed origins list
  const allowedOrigins: string[] = ['http://localhost:3000'];

  const rootDomain = process.env.ROOT_DOMAIN;
  if (rootDomain) {
    allowedOrigins.push(`https://${rootDomain}`);
  }

  // Exact match check
  if (allowedOrigins.includes(origin)) {
    return true;
  }

  // Subdomain match: allow https://*.ROOT_DOMAIN
  if (rootDomain) {
    const subdomainSuffix = `.${rootDomain}`;
    try {
      const originUrl = new URL(origin);
      if (
        originUrl.protocol === 'https:' &&
        originUrl.hostname.endsWith(subdomainSuffix)
      ) {
        return true;
      }
    } catch {
      // Invalid origin URL — reject
      return false;
    }
  }

  return false;
}

/**
 * Create a 403 Forbidden response for disallowed origins.
 */
export function originDeniedResponse(): NextResponse {
  return NextResponse.json(
    { error: 'Origin not allowed' },
    { status: 403 }
  );
}
