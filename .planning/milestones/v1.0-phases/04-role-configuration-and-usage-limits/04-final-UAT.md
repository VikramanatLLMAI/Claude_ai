---
status: complete
phase: 04-role-configuration-and-usage-limits
source: 04-10-SUMMARY.md
started: 2026-03-03T08:00:00Z
updated: 2026-03-03T09:30:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Org Chat Loads Without 400 Errors
expected: As an org user (non-admin), log in via the org login page. The chat interface loads with conversation history in the sidebar. No network errors on /api/conversations, /api/chat, or /api/mcp/connections. The welcome screen is NOT permanently stuck — if you have previous conversations, they appear. The app does not show "Loading models..." forever.
result: pass
note: "CONDITIONAL - direct /org/acme-corp/chat URL works perfectly (all APIs return 200). Auto-redirect from / goes to flat /chat path where model selector gets stuck. Org-scoped URL is the correct entry point and works as expected."

### 2. Org User Can Send a Chat Message
expected: As an org user in the chat UI, type a message and send it. The message is sent successfully and a streaming response comes back from Claude. No 400 or 403 errors logged to the browser console.
result: pass

### 3. Usage Banner Mounts on Welcome Screen
expected: Even on the welcome screen (no conversations yet), usage polling runs without 400 errors. Banner appears if usage is near/at limit.
result: issue
reported: "UsageBanner is present in DOM but has Tailwind 'hidden' class on its parent container on the welcome screen, resulting in display: none. Banner IS visible inside an existing conversation view. Blocked user on welcome screen sees only disabled textarea with no explanatory banner or context."
severity: major

### 4. Chat Input Disabled at 100% Usage (If Testable)
expected: Chat textarea shows cursor-not-allowed, placeholder "Daily usage limit reached...", submit non-interactive. UsageBanner shows red blocked state.
result: issue
reported: "In conversation view: PASS — textarea correctly disabled (disabled attr, cursor-not-allowed, placeholder text). But UsageBanner in conversation view shows wrong blocking metric: reports '1 of 50 daily requests' instead of the token limit that actually triggered the block (4100 of 100 tokens)."
severity: minor

## Summary

total: 4
passed: 2
issues: 2
pending: 0
skipped: 0

## Gaps

- truth: "UsageBanner visible on welcome/new-chat screen when user is blocked"
  status: failed
  reason: "User reported: Banner parent div has 'hidden' class on welcome screen, banner is invisible. Blocked user has no visual explanation."
  severity: major
  test: 3
  root_cause: "full-chat-app.tsx UsageBanner wrapper still has conditional hidden class based on isWelcomeVisible state. The 04-10 fix removed the !isWelcomeVisible gate from the mount condition but the hidden class was not fully removed for the welcome-screen wrapper."
  artifacts:
    - path: "components/full-chat-app.tsx"
      issue: "UsageBanner parent wrapper div has 'hidden' Tailwind class when on welcome/new-chat screen"
  missing:
    - "Remove the hidden class from the UsageBanner wrapper when user is blocked (usageBlocked=true), regardless of welcome screen state"

- truth: "UsageBanner shows the metric that caused the block (tokens or requests)"
  status: failed
  reason: "Banner reports request count (1/50) instead of token count (4100/100) as the blocking reason when token limit is the trigger"
  severity: minor
  test: 4
  root_cause: "UsageBanner component always displays request metric regardless of which limit (requests vs tokens) triggered the blocked state"
  artifacts:
    - path: "components/full-chat-app.tsx"
      issue: "UsageBanner renders request metric; no logic to show the metric that caused blocking"
  missing:
    - "Display the metric with the highest percentage (requests% vs tokens%) as the primary blocking reason"
