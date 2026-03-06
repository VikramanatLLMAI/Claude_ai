---
status: complete
phase: 04-role-configuration-and-usage-limits
source: 04-playwright-UAT.md (fixed by 04-12-SUMMARY.md, 04-13-SUMMARY.md, 04-14-SUMMARY.md)
started: 2026-03-03T14:00:00Z
updated: 2026-03-03T15:30:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Admin Layout Blocks Non-Super-Admin Sessions
expected: When an org user (e.g. Alice from acme-corp, with a valid org session) navigates to /admin/login or any /admin/* route, they should NOT be auto-redirected into the Super Admin shell. They should be redirected to their org chat (/org/acme-corp/chat) instead.
result: pass
note: Both /admin/login and /admin/models redirected Alice to /org/acme-corp/chat. No admin shell exposed. Minor ~2-3s blank page during client-side redirect.

### 2. Super Admin Session Does Not Bleed Into Org Chat
expected: A Super Admin who visits /org/acme-corp/login should see the org login form — not be auto-redirected into acme-corp's chat. The org login page should detect the SA session and stay on the login form, not trigger a redirect to /org/[slug]/chat.
result: pass
note: SA saw the org login form with email/password fields. No auto-redirect into org chat.

### 3. Root URL / Redirects Org Users to Org Chat (Not /chat)
expected: A logged-in org user visiting localhost:3000 (bare root /) should be redirected to /org/[their-slug]/chat (e.g. /org/acme-corp/chat), NOT to the legacy flat /chat path.
result: pass
note: Redirected to /org/acme-corp/chat correctly. Legacy /chat path not used.

### 4. Deprecate Model Requires Confirmation
expected: Clicking the deprecate (circle-slash / ban icon) button on /admin/models should open an amber confirmation dialog showing the model name and a deprecation warning. The model should NOT be deprecated immediately on click — only after clicking "Deprecate" in the dialog.
result: pass
note: Amber dialog appeared with model name, warning text, Cancel (gray) and Deprecate (amber) buttons. Clicking Cancel left model Active. No API call fired without confirmation.

### 5. Alice — Model Selector (Technical Role)
expected: Alice (Technical role) should see all 7 models: claude-opus-4-6, claude-sonnet-4-6, claude-sonnet-4-5-20250929, claude-haiku-4-5-20251001, claude-opus-4-5-20251101, claude-opus-4-20250514, claude-sonnet-4-20250514
result: issue
reported: "Alice only sees 3 models (Claude 4.5 Sonnet, Haiku, Opus). Claude 4.6 Opus, Claude 4.6 Sonnet, Claude 4 Opus, Claude 4 Sonnet are missing. DB allowedModels does not match seed."
severity: major

### 6. Bob — RBAC Model Gating (Basic Role)
expected: Bob (Basic role) should see only 1 model (Claude 4.5 Haiku) and not see the Admin Console link.
result: pass
note: Bob had 1 model only (Claude 4.5 Haiku). No Admin Console link in sidebar. Usage tracking visible (3/50 requests, 12,142/100,000 tokens).

### 7. Core Chat Functionality (Send Message + Streaming)
expected: Sending a message should stream a response within seconds with proper markdown rendering.
result: pass
note: Streaming started within ~1 second. Markdown (bold headers, bullets) rendered correctly. Feedback icons present.

## Summary

total: 7
passed: 6
issues: 1
pending: 0
skipped: 0

## Gaps

- truth: "Alice (Technical role) sees all 7 models in the model selector"
  status: failed
  reason: "User reported: Alice only sees 3 models (Claude 4.5 variants). Claude 4.6 and Claude 4 models missing from DB allowedModels."
  severity: major
  test: 5
  root_cause: "Technical role's allowedModels in live DB has only 3 models — DB was not re-seeded after seed.ts was updated to include Claude 4.6 models. Fix: npm run db:reset && npx prisma db seed (WARNING: deletes all data)"
  artifacts:
    - path: "prisma/seed.ts"
      issue: "Seed has 7 models for Technical role but DB was not re-seeded after this was added"
  missing:
    - "Re-seed the database (npm run db:reset) to restore correct Technical role model list"
