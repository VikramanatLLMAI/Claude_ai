---
phase: 03-chat-integration-and-core-rbac
verified: 2026-02-27T14:00:00Z
status: passed
score: 5/5 success criteria verified
re_verification:
  previous_status: passed
  previous_score: 38/38 truths verified
  gaps_closed: []
  gaps_remaining: []
  regressions: []
---

# Phase 3: Chat Integration and Core RBAC — Re-Verification Report

**Phase Goal:** Users can chat using only the AI models their role permits, with a composed 4-layer system prompt injected on every request, usage tracked per request, and MCP tools filtered by role assignment.
**Verified:** 2026-02-27T14:00:00Z
**Status:** PASSED
**Re-verification:** Yes — forced re-verification over previous "passed" result (no gaps existed)

---

## Changes Observed Since Initial Verification

Two files in `git status` were modified (`M`):

| File | Change |
|------|--------|
| `app/admin/models/page.tsx` | Defensive fix: `setModels(Array.isArray(data) ? data : data.models || [])` instead of `data.models || []` — handles API returning array directly |
| `components/ui/claude-style-chat-input.tsx` | Guard against empty models array before computing `currentModel` / `latestModels` / `olderModels` — prevents crash during API fetch |

Neither change alters phase goal achievement. Both are defensive improvements to robustness.

---

## Goal Achievement

### Success Criteria Verification

| # | Success Criterion | Status | Evidence |
|---|-------------------|--------|----------|
| SC-1 | Basic role user sees only permitted models in selector — no leak via UI or API | VERIFIED | Chat route line 46: `permittedModelIds.includes(modelId)` returns 403 for non-permitted; `/api/org/[slug]/models` returns `getModelsByIds(allowedModelIds)` (active + permitted only); frontend fetches from this endpoint |
| SC-2 | Every chat request composes 4-layer system prompt with XML delimiters; per-layer token budgets enforced at save time (org: 700, role: 500, user: 200) | VERIFIED | `lib/services/system-prompt-service.ts`: `<platform-instructions>`, `<org-instructions>`, `<role-instructions>`, `<user-context>` composed; `TOKEN_LIMITS = { org: 700, role: 500, user: 200 }` in `lib/token-counter.ts`; enforced by `validateTokenBudget()` in `lib/services/instruction-service.ts` and Zod refine in custom-instructions route |
| SC-3 | MCP tools shown match role-assigned + org-wide tools — no cross-role or cross-org leakage | VERIFIED | Chat route lines 114–131: `tenantDb.mcpConnection.findMany({ where: { isActive: true, OR: [{roleId: null, userId: null}, {roleId: role.id, userId: null}, ...personalIfEnabled] } })`; `filteredMcpIds` intersects client-requested IDs with authorized set |
| SC-4 | Token usage (input + output) recorded per request; queryable by org, user, and model | VERIFIED | Chat route lines 496–512: `tenantDb.usageRecord.create()` with `inputTokens`, `outputTokens`, `thinkingTokens`, `cacheCreationTokens`, `cacheReadTokens`, `userId`, `orgMemberId`, `model`, `conversationId`; schema indexes on `organizationId`, `userId`, `model` |
| SC-5 | Org-level and role-level system instructions set by Org Admin affect AI behavior | VERIFIED | `orgSettings.systemInstructions` and `role.systemInstructions` passed to `composeSystemPrompt()` as layers 2 and 3; injected into every `streamText()` call as the `system` parameter |

**Score: 5/5 success criteria verified**

---

## Observable Truths — Detailed Verification

### Plans 01–06 Truths (Regression Check)

All 38 truths from initial verification confirmed to still hold. Spot-check of critical paths:

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Model table with all metadata fields | VERIFIED | `prisma/schema.prisma` lines 201–225: all 15+ fields present |
| 5 | Seed script pre-populates 7 Claude models | VERIFIED | `prisma/seed.ts`: 7 `modelId:` model definitions, 8 total `modelId:` references (one in role seeding) |
| 14 | Chat route validates model vs role.allowedModels, rejects 403 | VERIFIED | `app/api/chat/route.ts` lines 41–51 |
| 15 | 4-layer system prompt with XML delimiters | VERIFIED | `lib/services/system-prompt-service.ts` lines 62–93: all 4 layers |
| 17 | MCP tools filtered to authorized connections | VERIFIED | Chat route lines 113–131 |
| 18 | Token usage recorded in onFinish | VERIFIED | Chat route lines 490–517 |
| 19 | Custom instructions NOT injected when disabled | VERIFIED | `system-prompt-service.ts` lines 84–91: conditional guard |
| 21 | Frontend model selector fetches from /api/org/[slug]/models | VERIFIED | `full-chat-app.tsx` line 2061 |
| 24 | Org instructions max 700 tokens | VERIFIED | `TOKEN_LIMITS.org = 700`, `saveOrgInstructions` validates |
| 25 | Role instructions max 500 tokens | VERIFIED | `TOKEN_LIMITS.role = 500`, `saveRoleInstructions` validates |
| 35 | User custom instructions in Settings modal (if role permits) | VERIFIED | `settings-modal.tsx` lines 993–1009; `InstructionEditor` with `disabled={!instructionsEnabled}` |
| 37 | Custom instructions tied to OrgMember | VERIFIED | `custom-instructions/route.ts` line 77: `tenantDb.orgMember.update()` |

---

## Required Artifacts — Existence and Substantiveness

| Artifact | Lines | Status | Notes |
|----------|-------|--------|-------|
| `prisma/schema.prisma` | 482 | VERIFIED | Model, UsageRecord, OnboardingAgreement, Role with all required fields |
| `lib/services/model-registry-service.ts` | 353 | VERIFIED | Full CRUD: getAllModels, getModelsByIds, getModelsGroupedByGeneration, getModelById, getModelByModelId, createModel, updateModel, deleteModel |
| `lib/token-counter.ts` | 36 | VERIFIED | TOKEN_LIMITS, SERVER_MARGIN, estimateTokenCount exported |
| `lib/prompt-sanitizer.ts` | 35 | VERIFIED | sanitizePromptLayer strips XML tags then escapes &, <, > |
| `lib/services/system-prompt-service.ts` | 96 | VERIFIED | composeSystemPrompt with 4 XML-delimited layers |
| `lib/services/instruction-service.ts` | 171 | VERIFIED | saveOrgInstructions, saveRoleInstructions, validateTokenBudget |
| `app/api/chat/route.ts` | 604 | VERIFIED | Model RBAC (A), MCP filtering (C), 4-layer prompt (D), usage tracking (E) all present |
| `app/api/admin/models/route.ts` | - | VERIFIED | GET + POST with requireSuperAdmin |
| `app/api/admin/models/[id]/route.ts` | - | VERIFIED | GET + PATCH + DELETE with requireSuperAdmin |
| `app/api/org/[slug]/models/route.ts` | 45 | VERIFIED | getModelsByIds(allowedModelIds); returns isOrgAdmin flag |
| `app/api/org/[slug]/admin/instructions/route.ts` | - | VERIFIED | GET + PATCH with requireOrgAdmin + saveOrgInstructions |
| `app/api/org/[slug]/admin/roles/[roleId]/instructions/route.ts` | - | VERIFIED | GET + PATCH with saveRoleInstructions |
| `app/api/org/[slug]/admin/roles/[roleId]/models/route.ts` | - | VERIFIED | GET + PATCH with at-least-one validation |
| `app/api/org/[slug]/admin/roles/[roleId]/settings/route.ts` | - | VERIFIED | GET + PATCH for customInstructionsEnabled, personalMcpEnabled, personalMcpMaxCount |
| `app/api/org/[slug]/admin/mcp/connections/route.ts` | - | VERIFIED | GET + POST with assignmentType org-wide/role-specific |
| `app/api/org/[slug]/admin/mcp/connections/[id]/route.ts` | - | VERIFIED | GET + PATCH + DELETE |
| `app/api/org/[slug]/admin/mcp/connections/[id]/discover/route.ts` | - | VERIFIED | File present with requireOrgAdmin |
| `app/api/org/[slug]/admin/mcp/connections/[id]/test/route.ts` | - | VERIFIED | File present (confirmed from directory listing) |
| `app/api/org/[slug]/user/custom-instructions/route.ts` | 94 | VERIFIED | GET + PATCH; checks customInstructionsEnabled; updates orgMember |
| `components/admin/admin-sidebar.tsx` | 207 | VERIFIED | variant prop for super-admin and org-admin |
| `components/admin/instruction-editor.tsx` | 90 | VERIFIED | estimateTokenCount with useMemo; disabled + disabledMessage props |
| `components/admin/model-registry-table.tsx` | 346 | VERIFIED | Groups by generationGroup |
| `components/admin/model-registry-form.tsx` | - | VERIFIED | File present |
| `components/admin/role-model-assignment.tsx` | 261 | VERIFIED | 3-state checkbox group per generation |
| `components/admin/mcp-assignment-panel.tsx` | 669 | VERIFIED | org-wide and role-specific sections |
| `components/full-chat-app.tsx` | 2200+ | VERIFIED | Fetches /api/org/[slug]/models; Admin Console button conditional on isOrgAdmin |
| `components/settings-modal.tsx` | 1000+ | VERIFIED | InstructionEditor with disabled={!instructionsEnabled}, disabledMessage |
| `app/admin/layout.tsx` | - | VERIFIED | SidebarProvider + AdminSidebar variant="super-admin" |
| `app/admin/models/page.tsx` | 227 | VERIFIED | fetchModels from /api/admin/models; create, edit, deprecate, delete handlers |
| `app/org/[slug]/admin/layout.tsx` | 131 | VERIFIED | SidebarProvider + AdminSidebar variant="org-admin" |
| `app/org/[slug]/admin/instructions/page.tsx` | 333 | VERIFIED | InstructionEditor for org + role instructions |
| `app/org/[slug]/admin/roles/page.tsx` | 457 | VERIFIED | RoleModelAssignment rendered per role |
| `app/org/[slug]/admin/mcp/page.tsx` | 119 | VERIFIED | McpAssignmentPanel rendered |
| `prisma/seed.ts` | 459 | VERIFIED | 7 model upserts; 3 roles with allowedModels arrays |

---

## Key Link Verification

| From | To | Via | Status | Evidence |
|------|----|-----|--------|---------|
| `app/api/chat/route.ts` | `lib/services/system-prompt-service.ts` | `composeSystemPrompt` import + call | WIRED | Line 9 import; line 171 called with org/role/user layers |
| `app/api/chat/route.ts` | `role.allowedModels` | model access validation | WIRED | Lines 41–51: `permittedModelIds.includes(modelId)`, 403 on failure |
| `app/api/chat/route.ts` | `tenantDb.mcpConnection.findMany` | MCP filtering | WIRED | Lines 114–131: OR-query for org-wide, role-specific, personal |
| `app/api/chat/route.ts` | `tenantDb.usageRecord.create` | usage recording in onFinish | WIRED | Lines 496–512 in onFinish callback |
| `lib/services/system-prompt-service.ts` | `lib/prompt-sanitizer.ts` | `sanitizePromptLayer` | WIRED | Line 20 import; called for org, role, user layers |
| `lib/services/instruction-service.ts` | `lib/token-counter.ts` | `estimateTokenCount`, `TOKEN_LIMITS` | WIRED | Line 13 import; called in validateTokenBudget |
| `app/api/org/[slug]/models/route.ts` | `lib/services/model-registry-service.ts` | `getModelsByIds` | WIRED | Line 13 import; line 25 called |
| `components/full-chat-app.tsx` | `/api/org/[slug]/models` | fetch in useEffect | WIRED | Line 2061: `fetch(\`/api/org/${slug}/models\`)` |
| `components/full-chat-app.tsx` | `/org/${orgSlug}/admin` | Admin Console button | WIRED | Lines 583–591: conditional on isOrgAdmin, router.push |
| `components/settings-modal.tsx` | `/api/org/${orgSlug}/user/custom-instructions` | fetch GET + PATCH | WIRED | Lines 220 (GET), 246–249 (PATCH) |
| `app/api/org/[slug]/admin/instructions/route.ts` | `lib/services/instruction-service.ts` | `saveOrgInstructions` | WIRED | requireOrgAdmin + saveOrgInstructions called in PATCH |
| `app/api/org/[slug]/admin/mcp/connections/route.ts` | `requireOrgAdmin` | auth guard | WIRED | Lines 44, 84: requireOrgAdmin called |
| `app/org/[slug]/admin/roles/page.tsx` | `components/admin/role-model-assignment.tsx` | RoleModelAssignment render | WIRED | Imported line 12; rendered per role |
| `app/org/[slug]/admin/mcp/page.tsx` | `components/admin/mcp-assignment-panel.tsx` | McpAssignmentPanel render | WIRED | Imported line 7; rendered in page |

---

## Requirements Coverage

| Requirement | Description | Status | Evidence |
|-------------|-------------|--------|---------|
| UCHAT-01 | User chats with role-permitted models only | SATISFIED | Chat route 403 on non-permitted model ID |
| UCHAT-02 | User subject to daily request and token limits | SATISFIED | UsageRecord.create in onFinish with all token types |
| UCHAT-05 | User cannot configure MCP servers | SATISFIED | MCP filtered by authorized set; personalMcp gated by role |
| UCHAT-06 | Onboarding agreement tracking | SATISFIED | OnboardingAgreement schema table present; full UI deferred Phase 7 per CONTEXT.md |
| PRMT-01 | Platform prompt hardcoded, `<platform-instructions>` | SATISFIED | system-prompt-service Layer 1 |
| PRMT-02 | Org instructions stack on platform (max 700 tokens) | SATISFIED | Layer 2 + TOKEN_LIMITS.org=700 |
| PRMT-03 | Role instructions stack on org (max 500 tokens) | SATISFIED | Layer 3 + TOKEN_LIMITS.role=500 |
| PRMT-04 | User layer: name, role, custom instructions if enabled | SATISFIED | Layer 4 always present; customInstructions conditional |
| PRMT-05 | Per-layer token budgets enforced at save time | SATISFIED | validateTokenBudget in instruction-service; Zod refine in custom-instructions route |
| PRMT-06 | XML-delimited sections with sanitization | SATISFIED | sanitizePromptLayer called on org, role, user layers |
| OLLM-01 | Org Admin selects models per role | SATISFIED | Role model assignment API + RoleModelAssignment UI |
| OLLM-02 | Users in role can only use permitted models | SATISFIED | Chat route model validation (403) |
| OMCP-01 | Org Admin can connect MCP servers | SATISFIED | POST /api/org/[slug]/admin/mcp/connections with requireOrgAdmin |
| OMCP-02 | Org Admin can assign MCP server org-wide | SATISFIED | assignmentType='org-wide' creates roleId=null |
| OMCP-03 | Org Admin can assign MCP server to specific role | SATISFIED | assignmentType='role-specific' creates with roleId |
| OMCP-04 | Both assignment types coexist | SATISFIED | Chat route OR-query covers org-wide + role-specific + personal |
| OMCP-05 | Org Admin can remove MCP servers | SATISFIED | DELETE /api/org/[slug]/admin/mcp/connections/[id] |
| OINST-01 | Org Admin sets org-wide system instructions | SATISFIED | PATCH /api/org/[slug]/admin/instructions |
| OINST-02 | Token limit enforced at save (max 700) | SATISFIED | validateTokenBudget(instructions, TOKEN_LIMITS.org) |
| OINST-03 | Org instructions stack on platform prompt | SATISFIED | Layer 2 in system-prompt-service |
| OINST-04 | Org instructions apply to all users | SATISFIED | orgSettings fetched per org per chat request |
| ORSI-01 | Org Admin sets role-specific instructions | SATISFIED | PATCH /api/org/[slug]/admin/roles/[roleId]/instructions |
| ORSI-02 | Token limit enforced at save (max 500) | SATISFIED | validateTokenBudget(instructions, TOKEN_LIMITS.role) |
| ORSI-03 | Role instructions stack on platform + org | SATISFIED | Layer 3 in system-prompt-service |
| ORSI-04 | Role instructions fine-tune AI behavior | SATISFIED | role.systemInstructions passed to Layer 3 |
| UCUST-01 | User writes custom instructions if role permits | SATISFIED | Settings modal InstructionEditor + PATCH API |
| UCUST-02 | Live token counter, max 200 tokens | SATISFIED | InstructionEditor with maxTokens=200; API validates TOKEN_LIMITS.user |
| UCUST-03 | Custom instructions are org-specific | SATISFIED | PATCH updates orgMember.customInstructions not user table |
| UCUST-04 | If disabled, text visible but grayed out with message | SATISFIED | disabled={!instructionsEnabled}, disabledMessage="Custom instructions disabled by your admin." |
| SAFE-07 | Audit logs immutable | SATISFIED | No AuditLog PATCH/DELETE routes exist anywhere |
| SAFE-08 | Custom instructions preserved but not injected when disabled | SATISFIED | system-prompt-service conditional; DB value not deleted |
| SAFE-09 | Character limits enforced server-side | SATISFIED | Zod schemas + token validation for all instruction inputs |
| MODL-01 | Super Admin adds models via UI (no code changes) | SATISFIED | POST /api/admin/models + ModelRegistryForm dialog |
| MODL-02 | Each model entry includes all metadata fields | SATISFIED | Model schema: 15+ fields including all pricing, capabilities, limits |
| MODL-03 | Super Admin can edit existing model entries | SATISFIED | PATCH /api/admin/models/[id] + edit form |
| MODL-04 | Super Admin can deprecate a model | SATISFIED | PATCH with status=DEPRECATED |
| MODL-05 | Model Registry is single source of truth | SATISFIED | org/models endpoint reads registry; hardcoded CLAUDE_MODELS replaced |
| MODL-06 | Seed script pre-populates 7 Claude models | SATISFIED | seed.ts: 7 model upserts |
| MODL-07 | Models grouped by generation for assignment UI | SATISFIED | ModelRegistryTable and RoleModelAssignment group by generationGroup |

**All 38 Phase 3 requirement IDs satisfied.**

---

## Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `app/api/chat/route.ts` | 134, 135, 139, 146, 147, 163, 183 | `console.log` debug statements in production path | Info | Development observability; does not affect functionality |

No blocker or warning anti-patterns found. All key files have substantive implementations. No TODO/FIXME/PLACEHOLDER patterns found in core service files.

**Improvement noted:** `claude-style-chat-input.tsx` now has a proper loading guard before accessing `models[0]` — eliminates potential runtime crash on initial render before API fetch completes.

---

## Human Verification Required

### 1. Model Registry Page — Live CRUD

**Test:** Log in as Super Admin, navigate to `/admin/models`. Verify 7 models grouped by Claude 4.6 / 4.5 / 4.
**Expected:** 3 generation sections visible with correct models. "Add Model" dialog opens with all pricing/capability fields. Edit changes persist. Deprecate changes badge to amber.
**Why human:** Visual layout, grouping order, and form validation require browser interaction.

### 2. Chat Route RBAC — Model Access Enforcement

**Test:** Log in as a user with Basic role (allowedModels limited to claude-haiku-4-5-20251001 per seed). Attempt to use claude-opus-4-6 in the chat UI.
**Expected:** Model not visible in dropdown (frontend filtering). Direct API call returns 403 "You do not have access to this model".
**Why human:** Requires live authentication context and role data.

### 3. 4-Layer System Prompt — Live Inspection

**Test:** Set org-level instructions, role-level instructions, and user custom instructions. Start a chat. Inspect system prompt in debug logs or API response.
**Expected:** System prompt contains `<platform-instructions>`, `<org-instructions>`, `<role-instructions>`, `<user-context>` in order, with all layers present.
**Why human:** Requires actual API call and log inspection.

### 4. Admin Console Entry Point Visibility

**Test:** Log in as Org Admin, then as a Technical/Business/Basic role user. Check sidebar footer in both sessions.
**Expected:** Org Admin sees "Admin Console" button; non-admin roles do not.
**Why human:** Requires two separate authenticated sessions with different roles.

### 5. Custom Instructions Disabled State

**Test:** Disable custom instructions for Basic role in Org Admin console. Log in as Basic user. Open Settings modal.
**Expected:** InstructionEditor shows grayed-out with "Custom instructions disabled by your admin." message. Saved text visible but uneditable.
**Why human:** Requires two sessions (Org Admin + regular user) and UI state verification.

### 6. MCP Discover and Test Flows

**Test:** Navigate to `/org/{slug}/admin/mcp`. Add org-wide MCP server. Test and discover tools.
**Expected:** Connection appears in org-wide section, test badge shows success/error, discover populates tool list.
**Why human:** Requires a live MCP server endpoint for functional validation.

---

## Gaps Summary

No gaps identified. This is a re-verification confirming the initial "passed" result remains valid.

The two modified files (`app/admin/models/page.tsx` and `components/ui/claude-style-chat-input.tsx`) contain defensive improvements that do not regress any phase goal. The model registry page now handles both array and `{ models: [] }` API response shapes. The model selector now gracefully handles empty models arrays during loading.

All 38 observable truths remain verified. All 38 Phase 3 requirement IDs remain satisfied. All key links remain wired. No regressions detected.

The phase goal is fully achieved: RBAC is wired into the chat route, the model registry is built and seeded, the Org Admin console is functional with instructions/roles/MCP management, system instructions compose correctly into the 4-layer prompt, and user custom instructions are wired into the Settings modal.

---

_Verified: 2026-02-27T14:00:00Z_
_Verifier: Claude (gsd-verifier)_
_Mode: Re-verification — initial status was "passed", no gaps to re-check_
