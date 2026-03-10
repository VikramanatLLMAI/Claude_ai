# Phase 13: Control Inventory

**Audited:** 2026-03-09
**Methodology:** Code-first scan of all interactive UI controls, cross-referenced with API route handlers

Status values: `pass` (works end-to-end), `pass*` (works but localStorage-only), `no-backend` (UI exists, no backend handler), `fix-needed` (mismatch found), `removed` (removed during audit), `fixed` (fixed during audit), `redirect` (page redirects elsewhere)

---

## Super Admin Controls

### Login (`/super-admin/login`)

| # | Control | Type | API Endpoint | Method | Status |
|---|---------|------|-------------|--------|--------|
| 1 | Email/password login form | Form submit | `/api/auth/login` | POST | pass |

### Dashboard (`/super-admin`)

| # | Control | Type | API Endpoint | Method | Status |
|---|---------|------|-------------|--------|--------|
| 2 | Page redirect to /models | Redirect | N/A | N/A | redirect |

### Organizations (`/super-admin/organizations`)

| # | Control | Type | API Endpoint | Method | Status |
|---|---------|------|-------------|--------|--------|
| 3 | List organizations | Data load | `/api/super-admin/organizations` | GET | pass |
| 4 | Create organization (dialog form) | Form submit | `/api/super-admin/organizations` | POST | pass |
| 5 | Edit organization (dialog form) | Form submit | `/api/super-admin/organizations/{id}` | PATCH | pass |
| 6 | Suspend organization | Button + confirm | `/api/super-admin/organizations/{id}/suspend` | POST | pass |
| 7 | Activate organization | Button + confirm | `/api/super-admin/organizations/{id}/activate` | POST | pass |
| 8 | Delete organization | Button + confirm | `/api/super-admin/organizations/{id}` | DELETE | pass |
| 9 | Restore organization | Button + confirm | `/api/super-admin/organizations/{id}/restore` | POST | pass |

### API Keys (`/super-admin/api-keys`)

| # | Control | Type | API Endpoint | Method | Status |
|---|---------|------|-------------|--------|--------|
| 10 | List API keys | Data load | `/api/super-admin/api-keys` | GET | pass |
| 11 | Create API key + test + assign | Multi-step form | `/api/super-admin/api-keys` | POST | pass |
| 12 | Test API key | Button | `/api/super-admin/api-keys/{id}/test` | POST | pass |
| 13 | Reveal API key | Button | `/api/super-admin/api-keys/{id}/reveal` | GET | pass |
| 14 | Delete API key | Button + confirm | `/api/super-admin/api-keys/{id}` | DELETE | pass |
| 15 | Edit assignments (org assign/unassign) | Checkbox + save | `/api/super-admin/api-keys/{id}` | PATCH | pass |
| 16 | Load organizations for assignment | Data load | `/api/super-admin/organizations` | GET | pass |

### Models (`/super-admin/models`)

| # | Control | Type | API Endpoint | Method | Status |
|---|---------|------|-------------|--------|--------|
| 17 | List models | Data load | `/api/super-admin/models` | GET | pass |
| 18 | Create model (dialog form) | Form submit | `/api/super-admin/models` | POST | pass |
| 19 | Edit model (dialog form) | Form submit | `/api/super-admin/models/{id}` | PATCH | pass |
| 20 | Delete model | Button + confirm | `/api/super-admin/models/{id}` | DELETE | pass |
| 21 | Toggle model status (active/deprecated) | Button | `/api/super-admin/models/{id}` | PATCH | pass |

### Users (`/super-admin/users`)

| # | Control | Type | API Endpoint | Method | Status |
|---|---------|------|-------------|--------|--------|
| 22 | Search users | Search input | `/api/super-admin/users?search=...` | GET | pass |
| 23 | Impersonate user | Button + confirm | `/api/super-admin/users/{id}/impersonate` | POST | pass |

### Super Admins (`/super-admin/super-admins`)

| # | Control | Type | API Endpoint | Method | Status |
|---|---------|------|-------------|--------|--------|
| 24 | List super admins | Data load | `/api/super-admin/super-admins` | GET | pass |
| 25 | Create super admin (dialog form) | Form submit | `/api/super-admin/super-admins` | POST | pass |
| 26 | Edit super admin (dialog form) | Form submit | `/api/super-admin/super-admins/{id}` | PATCH | pass |
| 27 | Delete super admin | Button + confirm | `/api/super-admin/super-admins/{id}` | DELETE | pass |

### Analytics (`/super-admin/analytics`)

| # | Control | Type | API Endpoint | Method | Status |
|---|---------|------|-------------|--------|--------|
| 28 | Load analytics data | Data load | `/api/super-admin/analytics` | GET | pass |
| 29 | Time range filter | Select | `/api/super-admin/analytics?range=...` | GET | pass |

### Audit Logs (`/super-admin/audit-logs`)

| # | Control | Type | API Endpoint | Method | Status |
|---|---------|------|-------------|--------|--------|
| 30 | Load audit logs + meta | Data load | `/api/super-admin/audit-logs?meta=true` | GET | pass |
| 31 | Filter/paginate audit logs | Filters | `/api/super-admin/audit-logs?...` | GET | pass |
| 32 | Export audit logs (CSV/JSON) | Button | `/api/super-admin/audit-logs/export?format=...` | GET | pass |

### Settings (`/super-admin/settings`)

| # | Control | Type | API Endpoint | Method | Status |
|---|---------|------|-------------|--------|--------|
| 33 | Load platform settings | Data load | `/api/super-admin/settings` | GET | pass |
| 34 | Save platform settings | Form submit | `/api/super-admin/settings` | PATCH | pass |

### System Prompt (`/super-admin/system-prompt`)

| # | Control | Type | API Endpoint | Method | Status |
|---|---------|------|-------------|--------|--------|
| 35 | Load system prompt | Data load | `/api/super-admin/system-prompt` | GET | pass |
| 36 | Save system prompt | Button | `/api/super-admin/system-prompt` | PATCH | pass |
| 37 | Enhance prompt (AI) | Button | `/api/enhance-prompt` | POST | pass |

### Catch-All (`/super-admin/*`)

| # | Control | Type | API Endpoint | Method | Status |
|---|---------|------|-------------|--------|--------|
| 38 | Unknown paths redirect to /models | Redirect | N/A | N/A | redirect |

### Impersonation Banner (global component)

| # | Control | Type | API Endpoint | Method | Status |
|---|---------|------|-------------|--------|--------|
| 39 | Check impersonation status | Data load | `/api/super-admin/impersonation` | GET | pass |
| 40 | End impersonation | Button | `/api/super-admin/impersonation` | DELETE | pass |

**Super Admin Total: 40 controls. All pass.**

---

## Org Admin Controls

### Dashboard (`/org/{slug}/admin`)

| # | Control | Type | API Endpoint | Method | Status |
|---|---------|------|-------------|--------|--------|
| 1 | Quick links to admin sections | Navigation links | N/A | N/A | pass |

### Users (`/org/{slug}/admin/users`)

| # | Control | Type | API Endpoint | Method | Status |
|---|---------|------|-------------|--------|--------|
| 2 | List org members | Data load | `/api/org/{slug}/admin/users` | GET | pass |
| 3 | Suspend user (detail panel) | Button | `/api/org/{slug}/admin/users/{userId}` | PATCH | pass |
| 4 | Activate user (detail panel) | Button | `/api/org/{slug}/admin/users/{userId}` | PATCH | pass |
| 5 | Delete user (detail panel) | Button + confirm | `/api/org/{slug}/admin/users/{userId}` | DELETE | pass |
| 6 | Change user role (detail panel) | Select + save | `/api/org/{slug}/admin/users/{userId}` | PATCH | pass |
| 7 | Force password reset | Button | `/api/org/{slug}/admin/users/{userId}/force-reset` | POST | pass |
| 8 | Force logout | Button | `/api/org/{slug}/admin/users/{userId}/force-logout` | POST | pass |

### Roles (`/org/{slug}/admin/roles`)

| # | Control | Type | API Endpoint | Method | Status |
|---|---------|------|-------------|--------|--------|
| 9 | List roles | Data load | `/api/org/{slug}/admin/roles` | GET | pass |
| 10 | Create role (modal form) | Form submit | `/api/org/{slug}/admin/roles` | POST | pass |
| 11 | Edit role (modal form) | Form submit | `/api/org/{slug}/admin/roles/{roleId}` | PUT | pass |
| 12 | Delete role | Button + confirm | `/api/org/{slug}/admin/roles/{roleId}` | DELETE | pass |
| 13 | Model assignment (in role form) | Checkboxes | `/api/org/{slug}/admin/models` | GET | pass |

### Invitations (`/org/{slug}/admin/invitations`)

| # | Control | Type | API Endpoint | Method | Status |
|---|---------|------|-------------|--------|--------|
| 14 | List invitations | Data load | `/api/org/{slug}/invitations` | GET | pass |
| 15 | Load roles for invite form | Data load | `/api/org/{slug}/admin/roles` | GET | pass |
| 16 | Send invitation (dialog form) | Form submit | `/api/org/{slug}/invitations` | POST | pass |
| 17 | Resend invitation | Button | `/api/org/{slug}/invitations/{id}/resend` | POST | pass |
| 18 | Revoke invitation | Button | `/api/org/{slug}/invitations/{id}/revoke` | POST | pass |

### Analytics (`/org/{slug}/admin/analytics`)

| # | Control | Type | API Endpoint | Method | Status |
|---|---------|------|-------------|--------|--------|
| 19 | Load analytics data | Data load | `/api/org/{slug}/admin/analytics` | GET | pass |
| 20 | Time range filter | Select | `/api/org/{slug}/admin/analytics?range=...` | GET | pass |
| 21 | CSV export | Button | `/api/org/{slug}/admin/analytics?...&format=csv` | GET | pass |

### Audit Logs (`/org/{slug}/admin/audit-logs`)

| # | Control | Type | API Endpoint | Method | Status |
|---|---------|------|-------------|--------|--------|
| 22 | Load audit logs + meta | Data load | `/api/org/{slug}/admin/audit-logs?meta=true` | GET | pass |
| 23 | Filter/paginate audit logs | Filters | `/api/org/{slug}/admin/audit-logs?...` | GET | pass |
| 24 | Export audit logs (CSV/JSON) | Button | `/api/org/{slug}/admin/audit-logs/export?format=...` | GET | pass |

### Conversations (`/org/{slug}/admin/conversations`)

| # | Control | Type | API Endpoint | Method | Status |
|---|---------|------|-------------|--------|--------|
| 25 | Check visibility toggle | Data load | `/api/org/{slug}/admin/settings/visibility` | GET | pass |
| 26 | Toggle conversation visibility | Switch | `/api/org/{slug}/admin/settings/visibility` | PATCH | pass |
| 27 | List conversations | Data load | `/api/org/{slug}/admin/conversations` | GET | pass |
| 28 | View conversation (dialog) | Button | `/api/org/{slug}/admin/conversations/{id}` | GET | pass |
| 29 | Export conversations | Button | `/api/org/{slug}/admin/conversations/export` | POST | pass |

### Instructions (`/org/{slug}/admin/instructions`)

| # | Control | Type | API Endpoint | Method | Status |
|---|---------|------|-------------|--------|--------|
| 30 | Load org instructions | Data load | `/api/org/{slug}/admin/instructions` | GET | pass |
| 31 | Load roles for role-level instructions | Data load | `/api/org/{slug}/admin/roles` | GET | pass |
| 32 | Save org-level instructions | Button | `/api/org/{slug}/admin/instructions` | PATCH | pass |
| 33 | Load role-specific instructions | Data load | `/api/org/{slug}/admin/roles/{roleId}/instructions` | GET | pass |
| 34 | Save role-specific instructions | Button | `/api/org/{slug}/admin/roles/{roleId}/instructions` | PATCH | pass |
| 35 | Load role-specific restrictions | Data load | `/api/org/{slug}/admin/roles/{roleId}/settings` | GET | pass |
| 36 | Save role-specific restrictions | Button | `/api/org/{slug}/admin/roles/{roleId}/settings` | PATCH | pass |
| 37 | Enhance prompt (AI) | Button | `/api/enhance-prompt` | POST | pass |

### MCP (`/org/{slug}/admin/mcp`)

| # | Control | Type | API Endpoint | Method | Status |
|---|---------|------|-------------|--------|--------|
| 38 | Load roles for MCP scoping | Data load | `/api/org/{slug}/admin/roles` | GET | pass |
| 39 | Load MCP connections | Data load | `/api/org/{slug}/admin/mcp/connections` | GET | pass |
| 40 | Create MCP connection (dialog) | Form submit | `/api/org/{slug}/admin/mcp/connections` | POST | pass |
| 41 | Edit MCP connection (dialog) | Form submit | `/api/org/{slug}/admin/mcp/connections/{id}` | PATCH | pass |
| 42 | Delete MCP connection | Button + confirm | `/api/org/{slug}/admin/mcp/connections/{id}` | DELETE | pass |
| 43 | Test MCP connection | Button | `/api/org/{slug}/admin/mcp/connections/{id}/test` | POST | pass |
| 44 | Discover MCP tools | Button | `/api/org/{slug}/admin/mcp/connections/{id}/discover` | POST | pass |

### Security (`/org/{slug}/admin/security`)

| # | Control | Type | API Endpoint | Method | Status |
|---|---------|------|-------------|--------|--------|
| 45 | Load password policy | Data load | `/api/org/{slug}/admin/security/password-policy` | GET | pass |
| 46 | Save password policy | Form submit | `/api/org/{slug}/admin/security/password-policy` | PATCH | pass |
| 47 | Force all users reset | Button + confirm | `/api/org/{slug}/admin/security/force-reset` | POST | pass |

### Settings (`/org/{slug}/admin/settings`)

| # | Control | Type | API Endpoint | Method | Status |
|---|---------|------|-------------|--------|--------|
| 48 | Load assigned API keys | Data load | `/api/org/{slug}/admin/settings/api-keys` | GET | pass |
| 49 | Test API key | Button | `/api/org/{slug}/admin/settings/api-keys/{id}/test` | POST | pass |
| 50 | Load login page settings | Data load | `/api/org/{slug}/admin/settings/login-page` | GET | pass |
| 51 | Save login page settings | Form submit | `/api/org/{slug}/admin/settings/login-page` | PUT | pass |
| 52 | Load onboarding settings | Data load | `/api/org/{slug}/admin/onboarding` | GET | pass |
| 53 | Save onboarding settings | Form submit | `/api/org/{slug}/admin/onboarding` | PUT | pass |
| 54 | Upload org logo | File upload | `/api/org/{slug}/admin/logo` | POST | pass |
| 55 | Remove org logo | Button | `/api/org/{slug}/admin/logo` | DELETE | pass |

### Branding (`/org/{slug}/admin/branding`)

| # | Control | Type | API Endpoint | Method | Status |
|---|---------|------|-------------|--------|--------|
| 56 | Load branding config | Data load | `/api/org/{slug}/admin/branding` | GET | pass |
| 57 | Save branding config | Form submit | `/api/org/{slug}/admin/branding` | PUT | pass |

### Usage (`/org/{slug}/admin/usage`)

| # | Control | Type | API Endpoint | Method | Status |
|---|---------|------|-------------|--------|--------|
| 58 | Redirect to /analytics | Redirect | N/A | N/A | redirect |

**Org Admin Total: 58 controls. All pass.**

---

## User Settings Controls

### Profile Tab

| # | Control | Persistence | API Endpoint | Method | Status |
|---|---------|-------------|-------------|--------|--------|
| 1 | Display name input + Save | API-backed | `/api/user/settings` | PATCH | pass |
| 2 | Email display (read-only) | N/A | N/A | N/A | pass |
| 3 | Load profile data | API-backed | `/api/auth/me` | GET | pass |

### General Tab

| # | Control | Persistence | API Endpoint | Method | Status |
|---|---------|-------------|-------------|--------|--------|
| 4 | Default model select | In-memory (prop callback) | N/A | N/A | pass |
| 5 | ~~Default reasoning level~~ | ~~None~~ | N/A | N/A | removed |
| 6 | ~~Language select~~ | ~~None~~ | N/A | N/A | removed |
| 7 | ~~Send with Enter toggle~~ | ~~Local state only~~ | N/A | N/A | removed |
| 8 | ~~Show code results toggle~~ | ~~Local state only~~ | N/A | N/A | removed |
| 9 | Display name input + Save | API-backed | `/api/user/settings` | PATCH | pass |
| 10 | Email display (read-only) | N/A | N/A | N/A | pass |
| 11 | Change password form | API-backed | `/api/auth/change-password` | POST | pass |

### Appearance Tab

| # | Control | Persistence | API Endpoint | Method | Status |
|---|---------|-------------|-------------|--------|--------|
| 12 | Theme select (light/dark/system) | localStorage + API | `/api/user/preferences` | PATCH | pass |
| 13 | Font size slider | localStorage + API | `/api/user/preferences` | PATCH | fixed |
| 14 | Code theme select | localStorage + API | `/api/user/preferences` | PATCH | fixed |

### API Keys Tab

| # | Control | Persistence | API Endpoint | Method | Status |
|---|---------|-------------|-------------|--------|--------|
| 15 | Load API key status | API-backed | `/api/user/anthropic` | GET | pass |
| 16 | Save API key | API-backed | `/api/user/anthropic` | POST | pass |
| 17 | Test API key | API-backed | `/api/user/anthropic/test` | POST | pass |
| 18 | Remove API key | API-backed | `/api/user/anthropic` | POST (empty) | pass |

### MCP Tab

| # | Control | Persistence | API Endpoint | Method | Status |
|---|---------|-------------|-------------|--------|--------|
| 19 | List MCP connections | API-backed | `/api/mcp/connections` | GET | pass |
| 20 | Add MCP connection (dialog) | API-backed | `/api/mcp/connections` | POST | pass |
| 21 | Edit MCP connection (dialog) | API-backed | `/api/mcp/connections/{id}` | PATCH | pass |
| 22 | Delete MCP connection | API-backed | `/api/mcp/connections/{id}` | DELETE | pass |
| 23 | Test MCP connection | API-backed | `/api/mcp/connections/{id}/test` | POST | pass |
| 24 | Discover MCP tools | API-backed | `/api/mcp/connections/{id}/discover` | POST | pass |

### Instructions Tab

| # | Control | Persistence | API Endpoint | Method | Status |
|---|---------|-------------|-------------|--------|--------|
| 25 | Load custom instructions | API-backed | `/api/org/{slug}/user/custom-instructions` | GET | pass |
| 26 | Save custom instructions | API-backed | `/api/org/{slug}/user/custom-instructions` | PATCH | pass |

### Sessions Tab

| # | Control | Persistence | API Endpoint | Method | Status |
|---|---------|-------------|-------------|--------|--------|
| 27 | List active sessions | API-backed | `/api/org/{slug}/sessions` | GET | pass |
| 28 | Revoke specific session | API-backed | `/api/org/{slug}/sessions/{id}` | DELETE | pass |
| 29 | Revoke all other sessions | API-backed | `/api/org/{slug}/sessions/{id}` (loop) | DELETE | pass |

### Advanced Tab

| # | Control | Persistence | API Endpoint | Method | Status |
|---|---------|-------------|-------------|--------|--------|
| 30 | "Coming soon" placeholder | N/A | N/A | N/A | pass |

**User Settings Total: 30 controls. 2 fix-needed, 3 no-backend, 25 pass.**

---

## Issues Found (all resolved)

### Fixed: Backend persistence added

1. **Font size (Appearance tab)**: Was localStorage-only. FIXED: Added fire-and-forget PATCH to `/api/user/preferences` with fontSize field. Server syncs on modal open.

2. **Code theme (Appearance tab)**: Was localStorage-only. FIXED: Added fire-and-forget PATCH to `/api/user/preferences` with codeTheme field. Server syncs on modal open.

### Fixed: Non-functional controls removed

3. **Default reasoning level (General tab)**: Removed. Three buttons with no state management at all.

4. **Language select (General tab)**: Removed. No state, no onChange, app is English-only.

5. **Send with Enter toggle (General tab)**: Removed. Local state only, reset on mount, not wired to chat input.

6. **Show code results toggle (General tab)**: Removed. Local state only, reset on mount, not wired to rendering.

---

## Tech Debt Verification (5 items from v1.0 Milestone Audit)

| # | Item | Status | Evidence |
|---|------|--------|----------|
| 1 | Console.log in chat route | RESOLVED | `grep console.log app/api/chat/route.ts` = 0 matches |
| 2 | `as any` on usageRecord.aggregate() | RESOLVED | `grep "as any" app/api/org/[slug]/admin/usage/route.ts` = 0 matches |
| 3 | tenantDb.artifact type unknown | RESOLVED | Artifact route uses `tenantDb.artifact.findUnique/create/update/delete` without `as any` |
| 4 | Rate limiting TODO in find-org | RESOLVED | `grep TODO app/api/auth/find-org/route.ts` = 0 matches |
| 5 | Stale REQUIREMENTS.md entries | RESOLVED | SUI-01, OUI-01, OTHM-01-04 marked `[x]` complete; OBRN-02/03/04 marked `[~] DROPPED` |

---

## Removed Controls

| # | Location | Control | Reason |
|---|----------|---------|--------|
| 1 | Settings > General | Default Reasoning Level (Low/Med/High buttons) | No state management at all -- buttons were purely decorative |
| 2 | Settings > General | Language select | No state, no onChange handler -- app is English-only |
| 3 | Settings > General | Send with Enter toggle | Local state only, reset on mount, not wired to chat input |
| 4 | Settings > General | Show code execution results toggle | Local state only, reset on mount, not wired to rendering logic |

---

**Summary (final):**
- Super Admin: 40 controls, 0 issues
- Org Admin: 58 controls, 0 issues
- User Settings: 30 controls -- 2 fixed (server persistence added), 4 removed (non-functional), 24 pass
- Tech Debt: 5/5 verified resolved
- Total: 128 controls catalogued, 0 remaining issues
- Zero "fail" or "fix-needed" entries remain
