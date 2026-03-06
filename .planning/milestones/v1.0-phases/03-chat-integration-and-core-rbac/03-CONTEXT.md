# Phase 3: Chat Integration and Core RBAC - Context

**Gathered:** 2026-02-27
**Status:** Ready for planning

<domain>
## Phase Boundary

Wire RBAC into the existing chat system so users can only chat with role-permitted models, see role-assigned MCP tools, receive a composed 4-layer system prompt on every request, and have usage tracked per request. This phase also introduces: a Platform Model Registry managed by Super Admin (dynamic model management without code changes), an Org Admin Console shell at `{org-slug}.llmatscale.ai/admin`, and a Super Admin Dashboard shell at `admin.llmatscale.ai` — both with "Coming Soon" placeholders for future sections.

The existing chat UI (components, input, streaming, message display) is NOT modified. Phase 3 changes are backend enforcement, API filtering, admin console scaffolding, and the model registry.

</domain>

<decisions>
## Implementation Decisions

### System Prompt Composition (4-Layer Stack)

**Layer structure with per-layer token budgets enforced at save time:**
- **Platform prompt**: No strict token limit (hardcoded in `lib/system-prompts.ts`, managed by developers). Existing prompt stays as-is.
- **Org instructions**: Max 700 tokens. Enforced when Org Admin saves. Plain text only.
- **Role instructions**: Max 500 tokens. Enforced when Org Admin saves. Plain text only.
- **User custom instructions**: Max 200 tokens. Enforced when user saves. Plain text only.

**Token enforcement approach:** Per-layer validation at save time — if a layer exceeds its budget, the save is rejected with an error. The chat request never has to worry about overflow.

**XML delimiter format:** Descriptive tags — `<platform-instructions>`, `<org-instructions>`, `<role-instructions>`, `<user-context>`. Self-documenting, clear boundaries.

**Sanitization (PRMT-06):** Strip XML tags + escape special characters on all untrusted inputs (org instructions, role instructions, user custom instructions). Maximum injection prevention.

**Live token counter:** Client-side approximation showing "X / 700 tokens" updating as admin/user types. Prevents surprises at save time.

**Disabled custom instructions UX (SAFE-08):** When Org Admin disables custom instructions for a role, the user's saved text remains visible but grayed out with a message: "Custom instructions disabled by your admin." Text preserved in DB for re-enabling.

### Model Filtering

**User-facing model selector:** Show only permitted models. Restricted models are completely hidden — no grayed-out items, no hints about what's unavailable.

**Settings default model dropdown:** Also filtered to show only permitted models. Consistent with chat selector.

**Existing user-level default model setting:** Used as-is. If the saved default model becomes unpermitted, falls back to the role's first permitted model (by tier order — most capable first).

**Auto-switch on model removal:** If a conversation's model becomes unpermitted for the user's role, auto-switch to the role's default permitted model (first by tier order). Notify user of the switch.

**Thinking features:** Follow model access — no separate toggle. If Opus 4.6 is permitted, its thinking features are available. The existing extended thinking button in the chat input works as-is.

**Minimum model requirement:** At least one model must be enabled per role. Validated at save time. Prevents creating roles where users can't chat.

**API guard for restricted models:** Claude's discretion on the exact error response (balance security vs helpfulness).

### Model Registry (Platform-Level)

**New capability added to Phase 3:** Super Admin manages AI models through the UI — no code changes needed when Anthropic releases new models.

**Model entry fields:**
- **Core:** Model ID (e.g., `claude-opus-4-6`), display name, generation group (Claude 4.6 / 4.5 / 4)
- **Pricing:** Input price, output price, thinking price, cache write price, cache read price (all per token)
- **Capabilities:** Flags for adaptive/extended thinking, vision (image input), tool use support
- **Limits:** Max output tokens, context window size (researcher should investigate additional metadata)
- **Status:** Active / deprecated. Deprecated models can't be assigned to new roles.

**Admin model config grouping:** Models grouped by generation + class: "Claude 4.6" (Opus 4.6, Sonnet 4.6), "Claude 4.5" (Sonnet 4.5, Haiku 4.5, Opus 4.5), "Claude 4" (Opus 4, Sonnet 4). Org Admin sees group toggle (enable/disable entire generation) + individual model toggles within groups. Mixed-state checkbox for partial group selection.

**Seed data:** Seed script pre-populates all 7 current Claude models with correct pricing, capabilities, and context windows. Super Admin can edit or add more later.

**Super Admin UI:** Scaffold `admin.llmatscale.ai` with full sidebar (all planned sections from Phase 5 with "Coming Soon"), functional Model Registry management page. Uses shadcn + Radix UI.

### MCP Role Assignment

**Connection management:** Org Admin only — users cannot add/manage MCP servers (unless their role explicitly permits personal MCP servers).

**Assignment types (coexist):**
- Org-wide: All users in the org get access
- Role-specific: Only users in that role get access
- User's accessible tools = org-wide servers + their role's servers + personal servers (if enabled)

**Personal MCP servers per role:**
- Org Admin can enable "personal MCP servers" per role via toggle + max count
- Max count is a custom number field, pre-fills with 3 when toggled on
- When enabled, users in that role see the existing MCP settings UI
- When disabled, MCP settings section is hidden for those users

**MCP UI for admin:** Assignment UI design — Claude's discretion

**Removal behavior:** Graceful — users currently in a chat session keep tool access until they close/refresh. New sessions won't have the removed tools.

**User tool visibility:** No separate tools listing UI. When the AI uses a tool during chat, tool name + input/output display inline in the conversation (existing behavior). The backend filters which tools the AI can access based on role assignment.

### Org Admin Console

**Entry point:** Sidebar footer > profile section > "Admin Console" button (visible only to Org Admins)

**Route:** `{org-slug}.llmatscale.ai/admin` — dedicated route, full-page layout with its own sidebar. Dev routing follows Phase 1 conventions.

**Phase 3 scope:**
- Full admin console shell with shadcn + Radix UI sidebar
- All future tabs listed in sidebar (Users, Roles, MCP, Settings, Analytics, Audit Logs, etc.) with "Coming Soon" for non-Phase-3 sections
- **Functional tabs in Phase 3:** MCP management, role model assignment, system instructions (org + role), user custom instruction toggle per role
- Phase 6 extends this dashboard (adds shadcn tables, Recharts analytics, full feature set)

### Super Admin Dashboard

**Route:** `admin.llmatscale.ai` — dedicated route, full-page layout. Dev routing follows Phase 1 conventions.

**Phase 3 scope:**
- Full dashboard shell with shadcn + Radix UI sidebar
- All future tabs listed (Orgs, Users, API Keys, Models, Settings, Analytics, Audit Logs) with "Coming Soon" for non-Phase-3 sections
- **Functional tab in Phase 3:** Model Registry management
- Phase 5 extends this dashboard with full feature set

### Usage Tracking

**Fields per UsageRecord:** Input tokens, output tokens, thinking tokens (separate), cache_creation_tokens, cache_read_tokens, model ID, conversation ID, timestamp, user ID, org ID.

**Cost calculation:** Computed field — no cost stored in UsageRecord. Calculate on read by joining with Model Registry pricing: `(inputTokens * inputPrice) + (outputTokens * outputPrice) + (thinkingTokens * thinkingPrice) + (cacheWriteTokens * cacheWritePrice) + (cacheReadTokens * cacheReadPrice)`.

**Thinking tokens:** Tracked separately from output tokens. Anthropic API returns them separately, and they may have different pricing.

### Conversation Visibility Notice (UCHAT-06)

**Approach:** User onboarding agreement page during registration. Org-customizable — Org Admin can add org-specific terms on top of platform agreement.

**No in-chat indicator.** The onboarding agreement is sufficient. Chat UI stays clean.

**Implementation scope:** Claude decides based on Phase 3 scope what to build now vs defer (backend agreement model + acceptance tracking minimum; full UI may come later).

### Audit Logging (SAFE-07)

- Audit logs are immutable — cannot be edited or deleted by anyone
- Phase 3 establishes the audit trail foundation; Phase 5/6 builds the viewing UI
- Character limits enforced server-side, not just client-side (SAFE-09)

### UI Stack for Admin Consoles

- **Phase 3:** shadcn + Radix UI only (no Recharts)
- **Phase 5/6:** Add Recharts when analytics dashboards are built

### Documentation Updates Required

- ROADMAP.md: Add Model Registry requirements (MODL-xx) to Phase 3's requirement list
- REQUIREMENTS.md: Add new Model Registry requirement section with formal IDs

</decisions>

<specifics>
## Specific Ideas

- "The existing chat UI stays untouched — RBAC layers alongside it through admin panels and backend enforcement" (from roadmap overview)
- Model selector shows only permitted models — clean, no grayed-out items or upgrade hints
- Existing extended thinking button, MCP tool display in chat, and user default model setting all work as-is — Phase 3 only changes what the backend serves
- Admin Console feels like a separate app context (full-page layout), not a modal overlay
- Model Registry makes the platform future-proof — new models via UI, not code changes
- Seed script pre-populates models so development/testing works immediately

</specifics>

<deferred>
## Deferred Ideas

- **Recharts integration** — Phase 5/6 when analytics dashboards are built
- **Full Org Admin Dashboard** (TanStack Table, all management features) — Phase 6
- **Full Super Admin Dashboard** (org management, API keys, analytics, audit log views) — Phase 5
- **Usage limit enforcement with banners** (80%/100% warnings) — Phase 4 (UCHAT-03, UCHAT-04)
- **Custom role creation** — Phase 4 (OROL-xx)
- **Conversation visibility admin features** (read-only access, filtering, export) — Phase 7 (OVIS-xx)
- **Theme assignment and branding** — Phase 7
- **User agreement page full UI** — Assess during Phase 3 planning; if out of scope, defer to Phase 7 (compliance phase)

</deferred>

---

*Phase: 03-chat-integration-and-core-rbac*
*Context gathered: 2026-02-27*
