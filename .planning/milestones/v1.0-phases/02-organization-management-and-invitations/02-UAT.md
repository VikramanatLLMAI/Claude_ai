---
status: complete
phase: 02-organization-management-and-invitations
source: [02-01-SUMMARY.md, 02-02-SUMMARY.md, 02-03-SUMMARY.md]
started: 2026-02-27T10:00:00Z
updated: 2026-02-27T02:55:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Super Admin - Create Organization
expected: POST /api/admin/organizations with org name, slug, and admin email creates the org atomically (3 default roles, settings, password policy, invitation). Returns 201 with org JSON.
result: pass

### 2. Super Admin - List and Get Organizations
expected: GET /api/admin/organizations returns a list of orgs. GET /api/admin/organizations/[id] returns a single org with its details.
result: pass

### 3. Super Admin - Suspend and Activate Organization
expected: POST /api/admin/organizations/[id]/suspend sets org status to SUSPENDED (invalidates active sessions). POST /api/admin/organizations/[id]/activate sets it back to ACTIVE. Both return updated org JSON.
result: pass

### 4. Super Admin - Soft Delete and Restore Organization
expected: DELETE /api/admin/organizations/[id] sets deletedAt timestamp (soft delete). POST /api/admin/organizations/[id]/restore clears deletedAt if within 30-day grace period.
result: pass

### 5. Super Admin - CRUD Super Admins with Safety Rules
expected: POST /api/admin/super-admins creates a new Super Admin. DELETE rejects if deleting self (SAFE-01) or if it's the last Super Admin (SAFE-06).
result: pass

### 6. Super Admin - View and Edit Role Templates
expected: GET /api/admin/role-templates returns 3 default templates (Technical: 7 models, Business: 4, Basic: 2). PATCH updates a template. POST reset reverts to defaults.
result: pass

### 7. Org Admin - Create and List Invitations
expected: POST /api/org/invitations creates a PENDING invitation. GET /api/org/invitations returns invitation list with lazy expiry check.
result: issue
reported: "Org-scoped API routes (/api/org/*) are unreachable in dev mode. requireOrgAdmin calls resolveOrgSlug which only matches /org/:slug/ path prefix, but API routes are at /api/org/. Returns 400 Organization context required."
severity: major

### 8. Org Admin - Revoke and Resend Invitation
expected: POST /api/org/invitations/[id]/revoke sets invitation to REVOKED (blocked if last admin - SAFE-02). POST /api/org/invitations/[id]/resend generates new token.
result: issue
reported: "Same dev-mode routing gap as test 7. Org-scoped routes cannot resolve org context from /api/org/* path in development."
severity: major

### 9. Org Admin - Set Default Role
expected: GET /api/org/settings/default-role returns current default role. PATCH updates it.
result: issue
reported: "Same dev-mode routing gap as tests 7-8. All /api/org/* routes affected."
severity: major

### 10. Registration - Validate Invitation Token
expected: GET /api/auth/validate-invitation?token=VALID returns invitation details (org name, email, role, password requirements). Invalid/expired/revoked/already-accepted tokens return appropriate error reasons.
result: pass

### 11. Registration - Accept Invitation and Auto-Login
expected: POST /api/auth/accept-invitation with valid token, name, and password creates user + org member + session atomically. Returns session token. Invitation status updates to ACCEPTED.
result: pass

### 12. Registration Page UI
expected: Visiting /org/[slug]/register?token=VALID shows a branded registration form with pre-filled email, password field, org name. Invalid tokens show friendly error pages.
result: pass

## Summary

total: 12
passed: 9
issues: 3
pending: 0
skipped: 0

## Gaps

- truth: "Org Admin can create and list invitations via POST/GET /api/org/invitations"
  status: failed
  reason: "User reported: Org-scoped API routes (/api/org/*) are unreachable in dev mode. requireOrgAdmin calls resolveOrgSlug which only matches /org/:slug/ path prefix, but API routes are at /api/org/. Returns 400 Organization context required."
  severity: major
  test: 7
  root_cause: "resolveOrgSlug() in lib/resolve-org.ts uses regex /^\\/org\\/([^/]+)/ to extract slug from path. API routes at /api/org/* don't match this pattern. In dev mode, there's no subdomain rewriting, so org context is never resolved for these routes."
  artifacts:
    - path: "lib/resolve-org.ts"
      issue: "DEV_ORG_PATH_REGEX only matches /org/:slug/* not /api/org/*"
    - path: "lib/auth-middleware.ts"
      issue: "requireOrgAuth calls resolveOrgSlug which returns null for /api/org/* paths"
  missing:
    - "Dev-mode org context resolution for /api/org/* routes (e.g., X-Org-Slug header, session-stored orgId, or API path convention /api/org/:slug/*)"
  debug_session: ""

- truth: "Org Admin can revoke and resend invitations via POST /api/org/invitations/[id]/revoke and /resend"
  status: failed
  reason: "User reported: Same dev-mode routing gap as test 7. Org-scoped routes cannot resolve org context from /api/org/* path in development."
  severity: major
  test: 8
  root_cause: "Same as test 7 - resolveOrgSlug cannot extract org from /api/org/* paths in dev mode"
  artifacts:
    - path: "lib/resolve-org.ts"
      issue: "DEV_ORG_PATH_REGEX only matches /org/:slug/* not /api/org/*"
  missing:
    - "Same fix as test 7"
  debug_session: ""

- truth: "Org Admin can get and set default role via GET/PATCH /api/org/settings/default-role"
  status: failed
  reason: "User reported: Same dev-mode routing gap as tests 7-8. All /api/org/* routes affected."
  severity: major
  test: 9
  root_cause: "Same as tests 7-8 - all /api/org/* routes affected by the same resolveOrgSlug limitation"
  artifacts:
    - path: "lib/resolve-org.ts"
      issue: "DEV_ORG_PATH_REGEX only matches /org/:slug/* not /api/org/*"
  missing:
    - "Same fix as test 7"
  debug_session: ""
