---
status: complete
phase: 04-role-configuration-and-usage-limits
source: 04-07-SUMMARY.md, 04-08-SUMMARY.md, 04-09-SUMMARY.md
started: 2026-03-03T00:00:00Z
updated: 2026-03-03T00:30:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Create Role (Zod Fix)
expected: Clicking "Create Role" and filling in the 4-tab form should save successfully even when Personal MCP is disabled (count = 0). No HTTP 400 validation error. New role card appears in the grid.
result: pass

### 2. Edit Role (Zod Fix + Description Pre-fill)
expected: Clicking Edit on a role opens the pre-filled 4-tab modal. Saving with MCP disabled (count = 0) succeeds without HTTP 400 error. Description field is pre-populated correctly.
result: pass

### 3. Delete Role (Now Unblocked)
expected: With a custom role created in Test 1, clicking Delete shows a confirmation prompt. Confirming removes the role from the grid. System roles have no Delete button.
result: pass

### 4. Chat Input Visually Disabled at 100% Usage
expected: When a user's daily usage limit is reached (100%), the chat textarea shows cursor-not-allowed styling, placeholder reads "Daily usage limit reached...", and submit button is non-interactive.
result: issue
reported: "UsageBanner never mounts on welcome screen — it is gated by !isWelcomeVisible. Since org member API calls fail with 400 (flat /api/* paths don't carry org slug for requireOrgAuth), conversations never load, isWelcomeVisible stays true, usageBlocked remains false. Chat input is never disabled. Also discovered: ALL org member API calls (conversations, chat, MCP connections) fail with 400 Organization context required."
severity: blocker

### 5. Auto-Redirect to Force-Password-Change After Login
expected: After an admin force-resets a user's password, that user logs in via the org login page and is automatically redirected to /org/[slug]/force-password-change. No stuck "Loading models..." screen.
result: pass

### 6. Force-Password-Change Page Shows Org Policy
expected: On the force-password-change page, the live requirements checklist shows all org-configured requirements — not just the default "At least 8 characters".
result: pass

### 7. Sessions Tab Current Session UX
expected: Settings > Sessions tab highlights the current session with a green border/badge and shows "Active now". The current session's Revoke button is hidden. Other sessions show relative timestamps.
result: pass

## Summary

total: 7
passed: 6
issues: 1
pending: 0
skipped: 0

## Gaps

- truth: "Chat textarea input is visually disabled and usage banner shown when daily limit reached"
  status: failed
  reason: "User reported: UsageBanner never mounts because it is gated by !isWelcomeVisible. Org member API calls (conversations, chat, MCP) return 400 Organization context required because resolveOrgSlug() only extracts slug from /api/org/:slug/... URL patterns, but frontend calls flat /api/* paths. isWelcomeVisible stays true permanently, usageBlocked never becomes true, disabled prop never fires."
  severity: blocker
  test: 4
  root_cause: "Two compounding issues: (1) resolveOrgSlug() in lib/resolve-org.ts cannot extract org from flat /api/conversations, /api/chat paths — these paths don't carry slug, requireOrgAuth fails; (2) UsageBanner conditional in full-chat-app.tsx is gated by !isWelcomeVisible, so blocked users on the welcome screen never see the banner or trigger the disabled state."
  artifacts:
    - path: "lib/resolve-org.ts"
      issue: "resolveOrgSlug() only handles /api/org/:slug/... path pattern; frontend calls flat /api/* paths which carry no slug"
    - path: "components/full-chat-app.tsx"
      issue: "UsageBanner gated by orgSlug && !isWelcomeVisible — welcome-screen users (whose conversations fail to load) never see banner or blocked state"
  missing:
    - "Org context must be resolved from session (not URL) for flat API paths, OR frontend must call /api/org/:slug/* scoped paths"
    - "UsageBanner (or at minimum usageBlocked state) must initialize on mount regardless of welcome-screen visibility"
