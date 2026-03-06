---
status: complete
phase: 04-role-configuration-and-usage-limits
source: 04-12-SUMMARY.md, 04-13-SUMMARY.md
started: 2026-03-03T12:30:00Z
updated: 2026-03-03T12:45:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Admin Layout Blocks Org Users
expected: Log in as an org member (e.g. Alice on /org/acme-corp/login). Then navigate to /admin/dashboard or any /admin/* URL. You should be redirected to /org/acme-corp/chat — NOT shown the admin shell or an admin login page.
result: issue
reported: "Org user Alice navigated to /admin/dashboard and received a 404 'Organization not found' error page (URL stayed at /admin/dashboard). Admin content was NOT leaked, but the redirect to /org/acme-corp/chat did not occur. The admin layout appears to be parsing 'dashboard' as an org slug instead of redirecting the org user to their chat."
severity: major

### 2. Super Admin Sees Org Login Form
expected: Log in as Super Admin (/admin/login). Then navigate to /org/acme-corp/login. You should see the org login form — NOT be auto-redirected to org chat. The Super Admin can see the form and leave without being forced into an org session.
result: pass

### 3. Root URL Redirects Org User to Org Chat
expected: With an active org session (logged in as Alice), navigate to the root URL /. You should be redirected to /org/acme-corp/chat (the org-scoped chat path) — NOT to a flat /chat path that causes model-selector issues.
result: pass

### 4. Deprecate Model Shows Confirmation Dialog
expected: As Super Admin on /admin/models, click the Deprecate (Ban icon) button on any model. An amber-styled confirmation dialog appears showing the model name and deprecation warning. The API call does NOT fire immediately on button click — it fires only after clicking the amber "Deprecate" button in the dialog.
result: pass

### 5. Deprecate Confirmation Can Be Cancelled
expected: On the deprecate confirmation dialog, clicking "Cancel" closes the dialog without making any API call and leaves the model status unchanged.
result: pass

## Summary

total: 5
passed: 4
issues: 1
pending: 0
skipped: 0

## Gaps

- truth: "Org user navigating to /admin/* is redirected to /org/{slug}/chat"
  status: failed
  reason: "User reported: Admin layout parses route segment as org slug, returning 404 'Organization not found' instead of redirecting to /org/acme-corp/chat. Admin content not leaked but redirect broken."
  severity: major
  test: 1
  root_cause: ""
  artifacts:
    - path: "app/admin/layout.tsx"
      issue: "Guard redirects org users but the destination URL or route matching may be incorrectly routing /admin/dashboard as an org slug"
  missing:
    - "Investigate admin layout guard logic — ensure redirect to /org/{slug}/chat fires before route rendering treats 'dashboard' as org slug"
