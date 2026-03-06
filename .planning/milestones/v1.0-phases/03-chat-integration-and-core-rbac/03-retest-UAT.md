---
status: complete
phase: 03-chat-integration-and-core-rbac
source: 03-UAT.md (re-test of Tests 7-13 after 03-07 gap closure)
started: 2026-02-27T15:00:00Z
updated: 2026-02-27T16:30:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Admin Console Entry Point
expected: As admin@acme-corp.test, open chat page. Sidebar footer should show "Admin Console" button. Non-admin users should NOT see it.
result: pass
notes: Admin Console button (gear icon + text) visible in sidebar footer for admin user. Clicking navigates to /org/acme-corp/admin/instructions. Non-admin user (Bob) correctly does NOT see the button. Screenshots: test1_01-04.
saas_improvements:
  - Gear icon slightly clipped by viewport edge — add left padding
  - Console 400 errors on /api/conversations and /api/mcp/connections during page load
  - Model dropdown shows "Loading models..." for seconds while sidebar loads instantly (inconsistent loading states)
  - "Now using Claude 4.5 Haiku" notification banner only appears for non-default model — inconsistent UX

### 2. Org Admin Console Access
expected: Navigate to /org/acme-corp/admin. You should see the Org Admin sidebar with org name header, 7 navigation items (Instructions, Role Settings, MCP enabled; others "Coming Soon"), and a "Back to Chat" link. Non-admin users should be redirected away.
result: pass
notes: Admin console loads correctly. Sidebar shows Acme Corp header, 3 enabled items (Instructions, Role Settings, MCP Servers), 4 Coming Soon items (Users, Settings, Analytics, Audit Logs), Back to Chat + Sign Out in footer. Non-admin redirected to chat with 403 response. Screenshots: test2_01-04.
saas_improvements:
  - No toast/notification when non-admin is silently redirected from admin — confusing UX
  - "Coming Soon" badges could be more muted to reduce visual noise
  - Sign Out button same style as Back to Chat — risk of accidental sign-out, needs destructive/secondary styling
  - No breadcrumb navigation (e.g., "Admin Console > System Instructions")
  - No admin dashboard/overview landing page at /admin root — goes straight to Instructions
  - Sidebar density — verify scroll behavior when more items added

### 3. System Instructions - Org Level
expected: Navigate to /org/acme-corp/admin/instructions. You should see an org-level system instructions editor with a live token counter and color-coded progress bar. Token limit should be 700 tokens.
result: pass
notes: Page loads correctly. Org-level editor shows textarea, live token counter (~0/700), green progress bar, Save button. Typed test text, counter updated to ~20/700 in real-time. Save showed brief "Saved" checkmark. Persisted after reload. Screenshots: test3_01-07.
saas_improvements:
  - Save confirmation fades too quickly — SaaS standard is 3-5 sec toast or persistent state
  - Progress bar barely visible at low usage (tiny dot) — should fill proportionally like Vercel/Linear quota bars
  - No unsaved changes indicator (dirty state dot or button color change)
  - Save button styling inconsistent (org=filled coral, roles=outlined ghost)
  - No "Last saved: X ago" timestamp
  - Textarea height too generous for short content — use auto-growing textarea
  - No character count alongside token count for non-technical admins
  - Missing tooltip explaining "~" prefix on approximate token count
  - No Ctrl+S / Cmd+S keyboard shortcut for save
  - Unclear chat icon in page header area

### 4. System Instructions - Role Level
expected: On the same instructions page, below org instructions, you should see per-role instruction editors (one for each role). Each has a 500-token limit with its own live counter. Save changes and they should persist on reload.
result: pass
notes: Three role editors found (Technical, Business, Basic). Each has: role name header, ~0/500 token counter, textarea, progress bar, individual Save button. Typed test text in Technical role, counter updated to ~34/500. Saved successfully. Persisted after reload. Screenshots: test4_01-12.
saas_improvements:
  - Save button style inconsistency with org-level Save (ghost vs filled)
  - No role badge/color coding to visually differentiate roles at a glance
  - Generic role descriptions — show user count per role instead
  - No collapse/expand accordion for role cards (page gets long)
  - No "Reset to default" or "Clear" button
  - Vertical spacing between cards too large (~40-50px) — reduce to ~24px
  - No preview of combined instructions (org + role merged prompt)
  - Save button always active — should disable when no unsaved changes
  - No "Save All" button for bulk editing
  - 3-4 second loading with no skeleton loader — feels broken
  - Progress bar shows empty track for 0 tokens — hide or show subtle base state

### 5. Role Settings - Model Assignment
expected: Navigate to /org/acme-corp/admin/roles. You should see a card for each role with model assignment using generation-grouped checkboxes (Claude 4.6, 4.5, 4). Group headers have 3-state checkboxes. At least 1 model must be assigned per role. Save button appears only when changes detected.
result: issue
reported: "All three role cards show 'Failed to fetch models' in red. Console shows 403 Forbidden for GET /api/admin/models?status=ACTIVE. RoleModelAssignment component calls super-admin-only endpoint /api/admin/models instead of an org-admin-accessible endpoint. Cannot test model checkboxes, generation grouping, 3-state headers, validation, or save/persistence."
severity: blocker
root_cause: "components/admin/role-model-assignment.tsx line 59 fetches /api/admin/models?status=ACTIVE (requires requireSuperAdmin) instead of an org-scoped endpoint like /api/org/[slug]/admin/models"
artifacts:
  - path: "components/admin/role-model-assignment.tsx"
    issue: "Line 59 uses super-admin endpoint /api/admin/models instead of org-admin endpoint"
missing:
  - "Create org-scoped endpoint GET /api/org/[slug]/admin/models or modify component to use existing org models endpoint"
  - "Add retry button on model fetch failure"
  - "Show descriptive error message distinguishing auth errors from network errors"
saas_improvements:
  - Error state is plain text — needs styled alert with icon and retry button
  - Loading skeleton shape doesn't match actual content (generic bars vs checkbox rows)
  - Role cards lack descriptions — should show user count and role purpose
  - "System" badge too small (10px) — increase for readability
  - Member count should be clickable link to Users page
  - No visual differentiation for 0-member roles

### 6. Role Settings - Custom Instructions and MCP Toggles
expected: On role settings page, each role card shows toggles for "Custom Instructions Enabled" and "Personal MCP Enabled" with max count input. Changing settings and saving should persist on reload.
result: pass
notes: All 3 roles show Custom Instructions toggle and Personal MCP toggle. Toggled Custom Instructions OFF for Basic — description changed to "disabled for this role". Toggled MCP ON — max servers input appeared (default 3, min 0, max 20). Save Settings button appears only on dirty state. Saved, reloaded — changes persisted. Other roles unaffected. Screenshots: testC_07-17.
functional_issues:
  - No success toast after save — button just disappears silently
  - No error handling visible on save failure — only console.error
  - No confirmation dialog for destructive changes (disabling features for roles with active users)
  - Max MCP input allows 0 when MCP enabled — contradictory state (enabled but 0 servers)
saas_improvements:
  - Add success toast notification after save (e.g., "Settings saved for Basic role")
  - Add unsaved changes warning on page navigation
  - Add undo capability in success toast
  - Toggle needs subtle transition animation
  - Save button should be more prominent or sticky within card
  - Confusing dual save mechanism (Save Models vs Save Settings per card) — unify or clarify
  - Max servers input too small — use +/- stepper control
  - Add help tooltips explaining each setting's implications
  - No visible focus rings for keyboard navigation — verify accessibility
  - Wide-screen layout gap between label and toggle — cap content width

### 7. MCP Server Management
expected: Navigate to /org/acme-corp/admin/mcp. You should see a page for managing MCP server connections with sections for org-wide and role-specific assignments. You can add/test/delete connections.
result: pass
notes: Page loads with "Org-wide Servers (0)" and "Role-specific Servers (0)" sections. Add dialog has Name, URL, Auth (None/API Key/OAuth), Assignment (Org-wide/Role-specific with role dropdown). Successfully added org-wide server — card shows name, badge, URL, auth type, status, and 3 action buttons (test/discover/delete). Test connection correctly fails for fake URL with "Error" status. Added role-specific server with API Key auth for Technical role. Form validation works (required fields, invalid URL). Delete uses confirm dialog. Responsive at 768px and 480px. No console errors. Screenshots: test7_01-19.
functional_issues:
  - Native browser confirm() for delete — not styled, breaks design consistency
  - No loading spinner during Add Server submission
  - No success toast after add/delete operations
  - "Discover tools" button disabled with no tooltip explaining why
  - API Key field should use type="password" explicitly
  - No Edit functionality for existing MCP connections — must delete and recreate
saas_improvements:
  - Replace native confirm() with styled destructive modal or undo-toast pattern
  - Empty state needs illustration, description of MCP, and inline CTA button
  - Status indicators need color-coded dots (green/yellow/red/gray) + pulse animation for connecting
  - Error messages too generic — need actionable text and retry button
  - Action buttons (icon-only) need visible tooltips on hover
  - Add field descriptions/help text in add form
  - Role dropdown uses native select — replace with styled combobox
  - Add "Test connection before saving" option in add dialog
  - Server cards need last-tested timestamp and discovered tools count
  - Wide gap between labels and values in cards — hard to visually connect
  - Add loading skeletons for initial page load
  - Add note about API key encryption at rest
  - No edit functionality — significant gap for production SaaS

## Summary

total: 7
passed: 6
issues: 1
pending: 0
skipped: 0

## Gaps

- truth: "Role settings page shows model assignment checkboxes grouped by generation"
  status: failed
  reason: "All role cards show 'Failed to fetch models' — component calls super-admin endpoint /api/admin/models instead of org-admin endpoint"
  severity: blocker
  test: 5
  root_cause: "components/admin/role-model-assignment.tsx line 59 fetches /api/admin/models?status=ACTIVE which requires requireSuperAdmin(). Org admins get 403."
  artifacts:
    - path: "components/admin/role-model-assignment.tsx"
      issue: "Uses super-admin endpoint /api/admin/models instead of org-scoped endpoint"
  missing:
    - "Create GET /api/org/[slug]/admin/models endpoint with requireOrgAdmin() that returns all active models from the registry"
    - "Update RoleModelAssignment component to use org-scoped endpoint"

## SaaS Readiness Audit — Cross-Cutting Issues

### Critical (Must fix before production)
1. **Wrong API endpoint in Role Model Assignment** — blocker bug, models don't load for org admins
2. **No Edit for MCP connections** — users must delete and recreate to change any setting
3. **Native browser confirm() for deletes** — breaks SaaS design consistency

### High Priority (Expected by SaaS customers)
4. **No success/error toast notifications** — saves succeed silently across Instructions, Roles, MCP pages
5. **No unsaved changes warnings** — no dirty state indicator or beforeunload prompt
6. **Silent admin redirect** — non-admin users redirected with no explanation
7. **No loading skeletons** — Instructions page takes 3-4 sec with blank content area
8. **Save button inconsistency** — org instructions (filled coral) vs role instructions (outlined ghost)
9. **Max MCP input allows 0 when enabled** — contradictory state
10. **No confirmation for destructive role changes** — disabling features for roles with active users

### Medium Priority (SaaS polish)
11. **No breadcrumb navigation** in admin console
12. **No admin dashboard/overview** landing page at /admin root
13. **No "Last saved" timestamps** on forms
14. **No Ctrl+S keyboard shortcut** for save
15. **Empty states lack illustrations and CTAs** — plain text only
16. **Role cards lack descriptions and user counts**
17. **No combined instructions preview** (org + role merged prompt)
18. **Connection status indicators not color-coded**
19. **Progress bar barely visible at low token usage**
20. **Toggle animations missing** — switches change state instantly

### Low Priority (Nice-to-have polish)
21. **Gear icon slightly clipped** in chat sidebar
22. **"Coming Soon" badges could be more muted**
23. **Sign Out button same style as Back to Chat** — risk of accidental sign-out
24. **Role dropdown in MCP form uses native select** — should be styled combobox
25. **Action buttons (icon-only) need visible tooltips**
26. **Auto-growing textareas** for instruction editors
27. **Token count tooltip** explaining approximate (~) prefix
