---
status: open
phase: 04-role-configuration-and-usage-limits
source: .planning/UAT-FINAL-REPORT.md (Playwright autonomous UAT, all 4 phases)
started: 2026-03-03T09:00:00Z
updated: 2026-03-03T09:00:00Z
---

## Current Test

[pending — fix plans not yet created]

## Tests

### 1. Admin Layout Blocks Non-Super-Admin Sessions
expected: When an org user (with a valid session) navigates to /admin/login or any /admin/* route, they should NOT be auto-redirected into the Super Admin shell. They should see a redirect to their org chat instead.
result: issue
reported: "Org user Alice (with valid org session) navigated to /admin/login and was auto-redirected into /admin/models shell. The admin layout hasValidSession() check only validates token expiry — it does not check isSuperAdmin. Any valid session passes the guard."
severity: blocker

### 2. Super Admin Session Does Not Bleed Into Org Chat
expected: A Super Admin who visits /org/acme-corp/login should see the login form — not be auto-redirected into acme-corp chat. The org chat is for org members only; Super Admin has a separate session type.
result: issue
reported: "Super Admin session detected by OrgLoginPage client component, which redirects any active session to /org/[slug]/chat. Super Admin lands in org chat, triggering 9 API 403 errors (session is SA type, not org member). Model selector spins forever."
severity: blocker

### 3. Root URL / Redirects Org Users to Org Chat (Not /chat)
expected: A logged-in org user visiting localhost:3000 (bare root) should be redirected to /org/[their-slug]/chat, not to the legacy flat /chat path.
result: issue
reported: "Logged-in org user (Alice, acme-corp) visits localhost:3000. find-my-org.tsx detects active session but constructs wrong redirect URL — uses /chat instead of /org/acme-corp/chat."
severity: major

### 4. Deprecate Model Requires Confirmation
expected: Clicking the deprecate (circle-slash) button on /admin/models should show a confirmation dialog before taking action. No irreversible model state change should occur on a single click.
result: issue
reported: "Clicking the orange circle-slash icon on /admin/models immediately deprecated the model with no confirmation dialog. The deprecate handler calls the API directly without any AlertDialog step."
severity: major

## Summary

total: 4
passed: 0
issues: 4
pending: 0
skipped: 0

## Gaps

- truth: "Admin layout redirects non-super-admin sessions away from /admin/* routes"
  status: failed
  reason: "hasValidSession() in app/admin/layout.tsx only checks token expiry, not isSuperAdmin flag. Org users with valid sessions pass the guard and land in the Super Admin shell."
  severity: blocker
  test: 1
  root_cause: "app/admin/layout.tsx reads session from localStorage and calls hasValidSession() which only checks token !== null and expiresAt > now. It does NOT check session.isSuperAdmin. Fix: add isSuperAdmin === true check; if false, redirect to /org/${session.orgSlug}/chat (or /login)."
  artifacts:
    - path: "app/admin/layout.tsx"
      issue: "hasValidSession() only checks expiry — no isSuperAdmin type check; any valid session passes"
  missing:
    - "Read isSuperAdmin from parsed session JSON in hasValidSession() or inline guard"
    - "If isSuperAdmin !== true, redirect to /org/${session.orgSlug}/chat (read orgSlug from session)"

- truth: "Org login page does not redirect Super Admin sessions into org chat"
  status: failed
  reason: "OrgLoginPage client component detects any active session and redirects to /org/[slug]/chat — including Super Admin sessions. SA lands in org chat with wrong session type, causing cascade 403 errors."
  severity: blocker
  test: 2
  root_cause: "components/org-login-page.tsx session-redirect logic checks for any truthy session and redirects to chat. It does NOT check session.isSuperAdmin. Fix: if session.isSuperAdmin === true, do NOT redirect — show the login form so SA can log in as an org member."
  artifacts:
    - path: "components/org-login-page.tsx"
      issue: "Session redirect logic does not check isSuperAdmin; Super Admin sessions trigger redirect into org chat"
  missing:
    - "Add session.isSuperAdmin check before redirect — if true, skip redirect and show login form"

- truth: "Root URL / redirects logged-in org users to /org/[slug]/chat"
  status: failed
  reason: "find-my-org.tsx detects active org session but constructs redirect to /chat instead of /org/${slug}/chat."
  severity: major
  test: 3
  root_cause: "components/find-my-org.tsx session-redirect constructs wrong URL. Fix: read session.orgSlug (or session.organizationSlug) from localStorage session JSON and redirect to /org/${slug}/chat. For Super Admin sessions (isSuperAdmin === true), redirect to /admin instead."
  artifacts:
    - path: "components/find-my-org.tsx"
      issue: "Redirect constructs /chat instead of /org/${session.orgSlug}/chat"
  missing:
    - "Read orgSlug from session JSON and use /org/${orgSlug}/chat as redirect target"
    - "For isSuperAdmin sessions, redirect to /admin"

- truth: "Deprecating a model requires confirmation dialog before API call"
  status: failed
  reason: "Deprecate button on /admin/models calls API immediately on click with no AlertDialog confirmation step."
  severity: major
  test: 4
  root_cause: "app/admin/models/page.tsx deprecate handler calls the PATCH API directly without an AlertDialog. The same file already has a Delete confirmation AlertDialog — the same pattern needs to be applied to the deprecate action."
  artifacts:
    - path: "app/admin/models/page.tsx"
      issue: "Deprecate handler fires API call directly on click; no AlertDialog confirmation exists for this action"
  missing:
    - "Add AlertDialog for deprecate (same pattern as existing Delete confirmation in this file)"
    - "State: modelToDeprecate (same shape as modelToDelete); dialog shows model name + warning text"
