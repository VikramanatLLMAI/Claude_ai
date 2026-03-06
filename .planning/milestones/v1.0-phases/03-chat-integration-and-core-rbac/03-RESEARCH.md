# Phase 3: Chat Integration and Core RBAC - Research

**Researched:** 2026-02-27
**Domain:** RBAC enforcement on existing chat system, admin console scaffolding, platform model registry, system prompt composition, usage tracking
**Confidence:** HIGH

## Summary

Phase 3 wires RBAC into the existing chat system without modifying the chat UI itself. The work spans five technical domains: (1) a Platform Model Registry managed by Super Admin that replaces the hardcoded model list, (2) 4-layer system prompt composition with XML delimiters and per-layer token budgets, (3) model filtering and MCP tool filtering based on role assignments, (4) per-request usage tracking with token breakdown, and (5) admin console shell scaffolding for both Super Admin and Org Admin with functional management pages for Phase 3 scope.

The existing codebase is well-structured for this work. Phase 1 and 2 established service layer patterns (Prisma transactions with co-located audit logging), auth middleware (requireOrgAuth with enriched OrgAuthContext including role/permissions), tenant-scoped Prisma client, and path-based routing for dev. The chat route (`app/api/chat/route.ts`) already uses `requireOrgAuth` and has access to `auth.role.allowedModels`. The schema already has `Role.allowedModels`, `Role.systemInstructions`, `OrgSettings.systemInstructions`, `OrgMember.customInstructions`, `UsageRecord`, and `McpConnection` with role scoping fields. The main integration points are: (a) replacing the hardcoded `CLAUDE_MODELS` array with a registry fetch, (b) adding model/MCP filtering in the chat route, (c) composing the 4-layer system prompt, (d) recording usage after streaming completes, and (e) building two admin console shells with their functional pages.

**Primary recommendation:** Build the Model Registry (schema + seed + Super Admin UI) first, then wire RBAC enforcement into the chat route (model filtering, prompt composition, MCP filtering, usage tracking), then build the Org Admin functional pages (instructions, model assignment, MCP management), and finally add user-facing changes (custom instructions in settings, model selector filtering).

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**System Prompt Composition (4-Layer Stack):**
- Platform prompt: No strict token limit (hardcoded in `lib/system-prompts.ts`, managed by developers). Existing prompt stays as-is.
- Org instructions: Max 700 tokens. Enforced when Org Admin saves. Plain text only.
- Role instructions: Max 500 tokens. Enforced when Org Admin saves. Plain text only.
- User custom instructions: Max 200 tokens. Enforced when user saves. Plain text only.
- Token enforcement approach: Per-layer validation at save time -- if a layer exceeds its budget, the save is rejected with an error. The chat request never has to worry about overflow.
- XML delimiter format: Descriptive tags -- `<platform-instructions>`, `<org-instructions>`, `<role-instructions>`, `<user-context>`. Self-documenting, clear boundaries.
- Sanitization (PRMT-06): Strip XML tags + escape special characters on all untrusted inputs (org instructions, role instructions, user custom instructions). Maximum injection prevention.
- Live token counter: Client-side approximation showing "X / 700 tokens" updating as admin/user types. Prevents surprises at save time.
- Disabled custom instructions UX (SAFE-08): When Org Admin disables custom instructions for a role, the user's saved text remains visible but grayed out with a message: "Custom instructions disabled by your admin." Text preserved in DB for re-enabling.

**Model Filtering:**
- User-facing model selector: Show only permitted models. Restricted models are completely hidden -- no grayed-out items, no hints about what's unavailable.
- Settings default model dropdown: Also filtered to show only permitted models. Consistent with chat selector.
- Existing user-level default model setting: Used as-is. If the saved default model becomes unpermitted, falls back to the role's first permitted model (by tier order -- most capable first).
- Auto-switch on model removal: If a conversation's model becomes unpermitted for the user's role, auto-switch to the role's default permitted model (first by tier order). Notify user of the switch.
- Thinking features: Follow model access -- no separate toggle. If Opus 4.6 is permitted, its thinking features are available.
- Minimum model requirement: At least one model must be enabled per role. Validated at save time.
- API guard for restricted models: Claude's discretion on the exact error response (balance security vs helpfulness).

**Model Registry (Platform-Level):**
- Super Admin manages AI models through the UI -- no code changes needed when Anthropic releases new models.
- Model entry fields: Model ID, display name, generation group, pricing (input/output/thinking/cache write/cache read per token), capability flags (thinking, vision, tools), limits (max output tokens, context window), active/deprecated status.
- Admin model config grouping: Models grouped by generation + class with group toggle + individual model toggles, mixed-state checkbox for partial group selection.
- Seed data: Seed script pre-populates all 7 current Claude models with correct pricing, capabilities, and context windows.
- Super Admin UI: Scaffold `admin.llmatscale.ai` with full sidebar, functional Model Registry management page. Uses shadcn + Radix UI.

**MCP Role Assignment:**
- Connection management: Org Admin only -- users cannot add/manage MCP servers (unless their role explicitly permits personal MCP servers).
- Assignment types (coexist): Org-wide (all users), Role-specific (only users in that role). User's accessible tools = org-wide servers + their role's servers + personal servers (if enabled).
- Personal MCP servers per role: Org Admin can enable "personal MCP servers" per role via toggle + max count (pre-fills with 3).
- MCP UI for admin: Assignment UI design -- Claude's discretion.
- Removal behavior: Graceful -- users currently in a chat session keep tool access until they close/refresh.
- User tool visibility: No separate tools listing UI. Backend filters which tools the AI can access based on role assignment.

**Org Admin Console:**
- Entry point: Sidebar footer > profile section > "Admin Console" button (visible only to Org Admins).
- Route: `{org-slug}.llmatscale.ai/admin` -- dedicated route, full-page layout with its own sidebar.
- Phase 3 scope: Full admin console shell with shadcn + Radix UI sidebar. All future tabs listed with "Coming Soon" for non-Phase-3 sections. Functional tabs: MCP management, role model assignment, system instructions (org + role), user custom instruction toggle per role.

**Super Admin Dashboard:**
- Route: `admin.llmatscale.ai` -- dedicated route, full-page layout.
- Phase 3 scope: Full dashboard shell with shadcn + Radix UI sidebar. All future tabs with "Coming Soon". Functional tab: Model Registry management.

**Usage Tracking:**
- Fields per UsageRecord: Input tokens, output tokens, thinking tokens (separate), cache_creation_tokens, cache_read_tokens, model ID, conversation ID, timestamp, user ID, org ID.
- Cost calculation: Computed field -- no cost stored. Calculate on read by joining with Model Registry pricing.
- Thinking tokens: Tracked separately from output tokens.

**Conversation Visibility Notice (UCHAT-06):**
- User onboarding agreement page during registration. Org-customizable.
- No in-chat indicator.
- Implementation scope: Claude decides based on Phase 3 scope what to build now vs defer.

**Audit Logging (SAFE-07):**
- Audit logs are immutable -- cannot be edited or deleted by anyone.
- Phase 3 establishes the audit trail foundation; Phase 5/6 builds the viewing UI.
- Character limits enforced server-side, not just client-side (SAFE-09).

**UI Stack:**
- Phase 3: shadcn + Radix UI only (no Recharts).

### Claude's Discretion
- API guard error response for restricted models (balance security vs helpfulness)
- MCP assignment UI design for admin
- UCHAT-06 implementation scope (backend agreement model + acceptance tracking minimum; full UI may come later)

### Deferred Ideas (OUT OF SCOPE)
- Recharts integration -- Phase 5/6
- Full Org Admin Dashboard (TanStack Table, all management features) -- Phase 6
- Full Super Admin Dashboard (org management, API keys, analytics, audit log views) -- Phase 5
- Usage limit enforcement with banners (80%/100% warnings) -- Phase 4
- Custom role creation -- Phase 4
- Conversation visibility admin features (read-only access, filtering, export) -- Phase 7
- Theme assignment and branding -- Phase 7
- User agreement page full UI -- Assess during planning; if out of scope, defer to Phase 7
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| UCHAT-01 | User can chat with AI using role-permitted Anthropic models only | Model filtering pattern: OrgAuthContext.role.allowedModels checked against Model Registry; chat route guards + frontend model selector filtering |
| UCHAT-02 | User subject to daily request and token limits set by Org Admin | UsageRecord schema extension + per-request recording; limit checking deferred to Phase 4 but tracking infrastructure built here |
| UCHAT-05 | User cannot configure MCP servers -- access determined entirely by Org Admin | MCP connection query scoped by org-wide + role-specific assignment; existing MCP settings hidden unless role permits personal servers |
| UCHAT-06 | If conversation visibility is enabled, user acknowledges it during onboarding agreement | Backend agreement model + acceptance tracking (scope TBD during planning) |
| PRMT-01 | Platform prompt hardcoded at code level -- no one can edit via UI | Existing `lib/system-prompts.ts` BASE_PROMPT unchanged; wrapped in `<platform-instructions>` tags |
| PRMT-02 | Org system instructions stack on top of platform prompt (max 700 tokens) | OrgSettings.systemInstructions loaded in chat route; token validation at save-time API endpoint |
| PRMT-03 | Role system instructions stack on top of org instructions (max 500 tokens) | Role.systemInstructions loaded from OrgAuthContext; token validation at save-time API endpoint |
| PRMT-04 | User layer auto-injected: user's full name, role name, custom instructions (max 200 tokens) | OrgMember.customInstructions + User.name + Role.name composed into user context layer |
| PRMT-05 | Per-layer token budgets enforced at save time | Client-side live counter (character-based approximation) + server-side validation (Anthropic count-tokens API or character heuristic) |
| PRMT-06 | XML-delimited sections for injection prevention, sanitization of untrusted inputs | sanitizePromptLayer() utility: strip XML tags + escape `<`, `>`, `&` characters |
| OLLM-01 | Org Admin can select which Anthropic models the role can access | Org Admin console functional page: role model assignment UI reading from Model Registry |
| OLLM-02 | Users in that role can only use the permitted models | Backend enforcement in chat route + GET /api/chat models endpoint filtered by role |
| OMCP-01 | Org Admin can connect MCP servers | Org Admin console MCP management page; reuses existing MCP connection CRUD with org/role scoping |
| OMCP-02 | Org Admin can assign MCP server to entire org -- all users get access | McpConnection with roleId=null means org-wide; query pattern documented |
| OMCP-03 | Org Admin can assign MCP server to specific role | McpConnection with roleId set; query pattern documented |
| OMCP-04 | Both assignment types coexist -- user's MCP = org-wide + role's servers | Combined query: WHERE orgId AND (roleId IS NULL OR roleId = userRoleId OR userId = currentUserId) |
| OMCP-05 | Org Admin can remove/disconnect MCP servers per assignment type | Standard CRUD with audit logging |
| OINST-01 | Org Admin can set organization-wide system instructions | Org Admin console instructions page; PATCH OrgSettings.systemInstructions |
| OINST-02 | Token limit enforced at save time (max 700 tokens for org instructions) | Server-side validation in save endpoint; client-side live counter |
| OINST-03 | Org instructions stack on top of platform-level system prompt | 4-layer composition function in lib/system-prompts.ts |
| OINST-04 | Org instructions apply to all users in the org unless overridden at role level | Composition logic: platform + org + role + user (all additive, not override) |
| ORSI-01 | Org Admin can set role-specific system instructions | Org Admin console instructions page with role selector |
| ORSI-02 | Token limit enforced at save time (max 500 tokens for role instructions) | Server-side validation; client-side live counter |
| ORSI-03 | Role instructions stack on top of platform + org level instructions | 4-layer composition function |
| ORSI-04 | Role instructions fine-tune AI response behavior | Verified by prompt composition placing role instructions after org instructions |
| UCUST-01 | User can write personal AI behavior preferences in Settings (if enabled) | Settings modal modification: check role.customInstructionsEnabled; save to OrgMember.customInstructions via API |
| UCUST-02 | Live token counter shown while typing (max 200 tokens) | Client-side character-based approximation (~4 chars/token) |
| UCUST-03 | Instructions are org-specific -- do not carry over if user moves to different org | Already org-scoped: OrgMember.customInstructions is per org-membership |
| UCUST-04 | If Org Admin disables, user's saved text visible but grayed out | Frontend conditional rendering based on role.customInstructionsEnabled flag from auth context |
| SAFE-07 | Audit logs are immutable -- cannot be edited or deleted by anyone | Existing AuditLog model has no update/delete routes; enforce via API design (no PATCH/DELETE endpoints) |
| SAFE-08 | Custom instructions preserved but not injected when disabled | Prompt composition checks role.customInstructionsEnabled before including user layer |
| SAFE-09 | Character limits enforced server-side, not just client-side | Zod validation schemas with maxLength on all instruction fields |
| MODL-01 | Super Admin can add AI models to platform registry through UI | New Model table in schema + Super Admin Model Registry management page |
| MODL-02 | Each model entry includes full metadata | Model schema with all required fields documented in Architecture Patterns |
| MODL-03 | Super Admin can edit existing model entries | Standard CRUD API endpoint for Model table |
| MODL-04 | Super Admin can deprecate a model | Model.status field: ACTIVE/DEPRECATED; assignment validation prevents new deprecated assignments |
| MODL-05 | Model Registry is single source of truth for available models | Chat route and Org Admin UI read from Model table, not hardcoded arrays |
| MODL-06 | Seed script pre-populates all 7 current Claude models | Seed function with verified pricing and capability data |
| MODL-07 | Models grouped by generation for Org Admin config | generationGroup field on Model; frontend grouping logic + mixed-state checkbox |
</phase_requirements>

## Standard Stack

### Core (Already Installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 16.1.4 | App Router, API routes, SSR | Project framework |
| React | 19.2.3 | UI components | Project framework |
| Prisma | 7.3.0+ | Database ORM, migrations | Project ORM |
| Zod | 4.3.6 | Request validation, schema definition | Already used for all API validation |
| Vercel AI SDK (ai) | 6.0.97 | Chat streaming, useChat hook | Already integrated |
| @ai-sdk/anthropic | 3.0.46 | Anthropic provider for AI SDK | Already integrated |
| Radix UI | Various | Accessible UI primitives | Already installed (dialog, dropdown, switch, etc.) |
| class-variance-authority | 0.7.1 | Component variant styling | Already used for all UI components |
| lucide-react | 0.473.0 | Icons | Already used throughout |

### Supporting (May Need Installation)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @radix-ui/react-tabs | latest | Tabs component for admin consoles | Admin console navigation between sections |
| @radix-ui/react-checkbox | latest | Checkbox with indeterminate state | Model group selection (mixed-state) |
| @radix-ui/react-select | latest | Select dropdowns | Role selector, model assignment |
| @radix-ui/react-textarea | N/A | Already have native textarea | Use native textarea with Tailwind styling (existing pattern) |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Character-based token counting | Anthropic count-tokens API | API call adds latency to save; character heuristic (~4 chars/token) is sufficient for client-side live counter. Use server-side heuristic with generous margin for save validation. |
| Separate Model table | JSON config file | DB table is correct -- needs CRUD via UI, queryable for joins with UsageRecord |
| shadcn Tabs | Custom tabs | shadcn tabs follow project convention and are built on Radix |

**Installation (if needed):**
```bash
npm install @radix-ui/react-tabs @radix-ui/react-checkbox @radix-ui/react-select
```

Or use shadcn CLI to add components:
```bash
npx shadcn@latest add tabs checkbox select textarea
```

## Architecture Patterns

### New Files Structure
```
prisma/
  schema.prisma              # Add Model table
  seed.ts                    # Extend with model seed data

lib/
  services/
    model-registry-service.ts    # Model CRUD + validation
    system-prompt-service.ts     # 4-layer prompt composition + sanitization
    usage-tracking-service.ts    # UsageRecord creation + query helpers
    mcp-assignment-service.ts    # MCP connection CRUD with role/org scoping
    instruction-service.ts       # Org/role/user instruction save with token validation
  prompt-sanitizer.ts            # XML tag stripping + special char escaping
  token-counter.ts               # Client-exportable token estimation utility

app/api/
  admin/
    models/
      route.ts                   # GET (list), POST (create) - Super Admin
      [id]/route.ts              # GET, PATCH, DELETE - Super Admin
  org/[slug]/
    admin/
      instructions/route.ts      # GET/PATCH org instructions
      roles/
        [roleId]/
          models/route.ts        # GET/PATCH role model assignment
          instructions/route.ts  # GET/PATCH role instructions
          settings/route.ts      # GET/PATCH role settings (custom instructions toggle, personal MCP)
      mcp/
        connections/route.ts     # GET (list), POST (create) - Org Admin
        connections/[id]/
          route.ts               # GET, PATCH, DELETE
          discover/route.ts      # POST - tool discovery
          test/route.ts          # POST - connection test
    user/
      custom-instructions/route.ts  # GET/PATCH user custom instructions
    models/route.ts              # GET permitted models for current user

app/admin/
  layout.tsx                     # Replace placeholder with sidebar shell
  page.tsx                       # Dashboard home (redirect to models for Phase 3)
  models/page.tsx                # Model Registry management UI

app/org/[slug]/admin/
  layout.tsx                     # New: admin console shell with sidebar
  page.tsx                       # Replace placeholder with admin home
  instructions/page.tsx          # System instructions management
  roles/page.tsx                 # Role model assignment + settings
  mcp/page.tsx                   # MCP connection management

components/admin/
  admin-sidebar.tsx              # Reusable admin sidebar (adapts for Super Admin vs Org Admin)
  model-registry-form.tsx        # Model add/edit form
  model-registry-table.tsx       # Model list with actions
  instruction-editor.tsx         # Textarea with live token counter
  role-model-assignment.tsx      # Group toggles + individual model toggles
  mcp-assignment-panel.tsx       # MCP server assignment UI
```

### Pattern 1: Schema Extension for Model Registry

**What:** Add a `Model` table to serve as the platform-wide model registry, replacing hardcoded model arrays.

**When to use:** For MODL-01 through MODL-07 requirements.

```prisma
// New Model table - platform-level (not org-scoped)
model Model {
  id               String   @id @default(uuid())
  modelId          String   @unique @map("model_id")  // e.g., "claude-opus-4-6"
  displayName      String   @map("display_name")       // e.g., "Claude 4.6 Opus"
  generationGroup  String   @map("generation_group")   // e.g., "Claude 4.6"

  // Pricing (per token, stored as Decimal for precision)
  inputPricePerToken    Decimal  @map("input_price_per_token")    @db.Decimal(20, 12)
  outputPricePerToken   Decimal  @map("output_price_per_token")   @db.Decimal(20, 12)
  thinkingPricePerToken Decimal  @map("thinking_price_per_token") @db.Decimal(20, 12)
  cacheWritePricePerToken Decimal @map("cache_write_price_per_token") @db.Decimal(20, 12)
  cacheReadPricePerToken  Decimal @map("cache_read_price_per_token")  @db.Decimal(20, 12)

  // Capabilities
  supportsThinking  Boolean @default(false) @map("supports_thinking")
  supportsVision    Boolean @default(true)  @map("supports_vision")
  supportsTools     Boolean @default(true)  @map("supports_tools")
  thinkingType      String? @map("thinking_type")  // "adaptive" | "extended" | null

  // Limits
  maxOutputTokens   Int     @map("max_output_tokens")
  contextWindow     Int     @map("context_window")

  // Status
  status    String   @default("ACTIVE")  // ACTIVE | DEPRECATED
  sortOrder Int      @default(0) @map("sort_order")  // For display ordering

  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  @@index([status])
  @@index([generationGroup])
  @@map("models")
}
```

**Key design decisions:**
- Pricing stored as `Decimal(20, 12)` for per-token precision (e.g., $5/MTok = $0.000005/token = 0.000005000000)
- `modelId` is the Anthropic API model ID string (unique, used as the reference in Role.allowedModels)
- `thinkingType` distinguishes adaptive (4.6 models) from extended (4.5 models)
- `sortOrder` enables custom display ordering within generation groups
- NOT org-scoped: this is a platform-level table, NOT in TENANT_SCOPED_MODELS

### Pattern 2: UsageRecord Schema Extension

**What:** Extend the existing UsageRecord to track thinking tokens and cache tokens separately.

```prisma
model UsageRecord {
  id                     String   @id @default(uuid())
  organizationId         String   @map("organization_id")
  userId                 String   @map("user_id")
  orgMemberId            String   @map("org_member_id")
  conversationId         String?  @map("conversation_id")
  model                  String   // Model ID (matches Model.modelId)
  inputTokens            Int      @map("input_tokens")
  outputTokens           Int      @map("output_tokens")
  thinkingTokens         Int      @default(0) @map("thinking_tokens")
  cacheCreationTokens    Int      @default(0) @map("cache_creation_tokens")
  cacheReadTokens        Int      @default(0) @map("cache_read_tokens")
  requestDurationMs      Int?     @map("request_duration_ms")
  createdAt              DateTime @default(now()) @map("created_at")

  organization Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  user         User         @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([organizationId])
  @@index([userId])
  @@index([createdAt])
  @@index([organizationId, createdAt])
  @@index([model])
  @@map("usage_records")
}
```

### Pattern 3: 4-Layer System Prompt Composition

**What:** Compose the final system prompt from 4 layers with XML delimiters.

**Implementation in `lib/system-prompt-service.ts`:**

```typescript
// Source: Phase 3 CONTEXT.md decisions
import { getSystemPrompt, buildSystemPromptWithTools } from './system-prompts';

interface PromptLayers {
  orgInstructions: string | null;
  roleInstructions: string | null;
  userName: string;
  roleName: string;
  userCustomInstructions: string | null;
  customInstructionsEnabled: boolean;
}

/**
 * Sanitize untrusted prompt input:
 * 1. Strip any XML-like tags
 * 2. Escape < > & characters
 */
function sanitizePromptLayer(text: string): string {
  return text
    .replace(/<[^>]*>/g, '')        // Strip XML tags
    .replace(/&/g, '&amp;')         // Escape ampersand first
    .replace(/</g, '&lt;')          // Escape less-than
    .replace(/>/g, '&gt;');         // Escape greater-than
}

/**
 * Compose the 4-layer system prompt with XML delimiters.
 *
 * Layer order:
 * 1. <platform-instructions> - hardcoded platform prompt
 * 2. <org-instructions> - org-level instructions (if set)
 * 3. <role-instructions> - role-level instructions (if set)
 * 4. <user-context> - user name, role, custom instructions (if enabled)
 */
function composeSystemPrompt(
  availableTools: string[],
  mcpToolDescriptions: { name: string; description: string }[],
  layers: PromptLayers
): string {
  const parts: string[] = [];

  // Layer 1: Platform instructions (existing prompt + tools)
  const platformPrompt = buildSystemPromptWithTools(availableTools, mcpToolDescriptions);
  parts.push(`<platform-instructions>\n${platformPrompt}\n</platform-instructions>`);

  // Layer 2: Org instructions (if set)
  if (layers.orgInstructions?.trim()) {
    const sanitized = sanitizePromptLayer(layers.orgInstructions);
    parts.push(`<org-instructions>\n${sanitized}\n</org-instructions>`);
  }

  // Layer 3: Role instructions (if set)
  if (layers.roleInstructions?.trim()) {
    const sanitized = sanitizePromptLayer(layers.roleInstructions);
    parts.push(`<role-instructions>\n${sanitized}\n</role-instructions>`);
  }

  // Layer 4: User context (always present -- name/role; custom instructions if enabled)
  const userParts: string[] = [
    `User name: ${layers.userName}`,
    `User role: ${layers.roleName}`,
  ];
  if (layers.customInstructionsEnabled && layers.userCustomInstructions?.trim()) {
    const sanitized = sanitizePromptLayer(layers.userCustomInstructions);
    userParts.push(`\nUser's custom instructions:\n${sanitized}`);
  }
  parts.push(`<user-context>\n${userParts.join('\n')}\n</user-context>`);

  return parts.join('\n\n');
}
```

### Pattern 4: Usage Tracking in Chat Route

**What:** Capture token usage from the Vercel AI SDK `streamText` result and persist to UsageRecord.

```typescript
// In the onFinish callback of createUIMessageStream (existing pattern)
onFinish: async ({ responseMessage }) => {
  // ... existing message persistence code ...

  // Track usage (totalUsage aggregates across all steps for multi-step tool calls)
  try {
    const totalUsage = await result.totalUsage;
    const requestEnd = Date.now();

    await prisma.usageRecord.create({
      data: {
        organizationId: auth.organization.id,
        userId: auth.user.id,
        orgMemberId: auth.orgMember.id,
        conversationId: conversationId || null,
        model: modelId,
        inputTokens: totalUsage.inputTokens ?? 0,
        outputTokens: totalUsage.outputTokens ?? 0,
        thinkingTokens: totalUsage.reasoningTokens ?? 0,
        cacheCreationTokens: totalUsage.inputTokenDetails?.cacheWriteTokens ?? 0,
        cacheReadTokens: totalUsage.inputTokenDetails?.cacheReadTokens ?? 0,
        requestDurationMs: requestEnd - requestStart,
      },
    });
  } catch (error) {
    console.error('[Chat] Error recording usage:', error);
  }
}
```

**Key insight from Vercel AI SDK docs:** The `totalUsage` property on the streamText result aggregates tokens across all steps (important for multi-step tool use). It includes `inputTokens`, `outputTokens`, `totalTokens`, and `reasoningTokens`. The `inputTokenDetails` object provides `cacheWriteTokens` and `cacheReadTokens` breakdowns.

### Pattern 5: Model Filtering in Chat Route

**What:** Validate requested model against role's allowed models before sending to Anthropic.

```typescript
// At the top of the POST handler, after auth:
const { user, orgMember, organization, role, tenantDb } = auth;

// Get permitted model IDs from role
const permittedModelIds = Array.isArray(role.allowedModels)
  ? (role.allowedModels as string[])
  : [];

// Validate requested model
if (!permittedModelIds.includes(modelId)) {
  return NextResponse.json(
    { error: 'You do not have access to this model' },
    { status: 403 }
  );
}
```

### Pattern 6: MCP Tool Filtering

**What:** Load only MCP connections the user is authorized to access.

```typescript
// Replace direct activeMcpIds usage with filtered query
const authorizedMcpConnections = await tenantDb.mcpConnection.findMany({
  where: {
    isActive: true,
    OR: [
      { roleId: null, userId: null },          // Org-wide
      { roleId: role.id, userId: null },       // Role-specific
      { userId: user.id },                      // Personal (if enabled)
    ],
  },
  select: { id: true },
});

const authorizedMcpIds = new Set(authorizedMcpConnections.map(c => c.id));

// Filter the requested activeMcpIds against authorized set
const filteredMcpIds = (activeMcpIds || []).filter(id => authorizedMcpIds.has(id));
```

### Pattern 7: Admin Console Sidebar Shell

**What:** Reusable sidebar layout for both Super Admin and Org Admin consoles.

```typescript
// components/admin/admin-sidebar.tsx
// Uses existing components/ui/sidebar.tsx primitives:
// SidebarProvider, Sidebar, SidebarContent, SidebarGroup, SidebarMenu, SidebarMenuItem
// Each section item has: icon, label, href, isActive, isDisabled ("Coming Soon")
// Functional items in Phase 3 are not disabled; everything else shows "Coming Soon" badge

// Super Admin sidebar sections:
const SUPER_ADMIN_SECTIONS = [
  { label: 'Models', icon: Cpu, href: '/admin/models', enabled: true },
  { label: 'Organizations', icon: Building2, href: '/admin/organizations', enabled: false },
  { label: 'Super Admins', icon: Shield, href: '/admin/super-admins', enabled: false },
  { label: 'API Keys', icon: Key, href: '/admin/api-keys', enabled: false },
  { label: 'Settings', icon: Settings, href: '/admin/settings', enabled: false },
  { label: 'Analytics', icon: BarChart3, href: '/admin/analytics', enabled: false },
  { label: 'Audit Logs', icon: FileText, href: '/admin/audit-logs', enabled: false },
];

// Org Admin sidebar sections:
const ORG_ADMIN_SECTIONS = [
  { label: 'System Instructions', icon: MessageSquare, href: 'instructions', enabled: true },
  { label: 'Role Settings', icon: Users, href: 'roles', enabled: true },
  { label: 'MCP Servers', icon: Plug, href: 'mcp', enabled: true },
  { label: 'Users', icon: Users, href: 'users', enabled: false },
  { label: 'Settings', icon: Settings, href: 'settings', enabled: false },
  { label: 'Analytics', icon: BarChart3, href: 'analytics', enabled: false },
  { label: 'Audit Logs', icon: FileText, href: 'audit-logs', enabled: false },
];
```

### Pattern 8: Token Count Estimation (Client-Side)

**What:** Approximate token count for live counter in instruction editors.

```typescript
/**
 * Estimate token count from text.
 * Uses character-based heuristic: ~4 English characters per token.
 * This is an approximation -- actual tokenization may vary by ~10%.
 * Server-side validation should use a slightly more generous limit
 * (e.g., reject at 105% of stated limit using same heuristic).
 */
export function estimateTokenCount(text: string): number {
  if (!text || text.trim().length === 0) return 0;
  // ~4 characters per token for English text (Anthropic/Claude tokenizer)
  return Math.ceil(text.length / 4);
}
```

### Pattern 9: Model Seed Data

**What:** Pre-populate Model Registry with all 7 current Claude models.

```typescript
// Verified pricing from Anthropic official docs (2026-02-27)
// Source: https://platform.claude.com/docs/en/about-claude/pricing
const MODEL_SEED_DATA = [
  {
    modelId: 'claude-opus-4-6',
    displayName: 'Claude 4.6 Opus',
    generationGroup: 'Claude 4.6',
    inputPricePerToken: 0.000005,      // $5/MTok
    outputPricePerToken: 0.000025,     // $25/MTok
    thinkingPricePerToken: 0.000025,   // Same as output
    cacheWritePricePerToken: 0.00000625, // $6.25/MTok (5m cache)
    cacheReadPricePerToken: 0.0000005, // $0.50/MTok
    supportsThinking: true,
    supportsVision: true,
    supportsTools: true,
    thinkingType: 'adaptive',
    maxOutputTokens: 128000,
    contextWindow: 200000,
    sortOrder: 1,
  },
  {
    modelId: 'claude-sonnet-4-6',
    displayName: 'Claude 4.6 Sonnet',
    generationGroup: 'Claude 4.6',
    inputPricePerToken: 0.000003,      // $3/MTok
    outputPricePerToken: 0.000015,     // $15/MTok
    thinkingPricePerToken: 0.000015,   // Same as output
    cacheWritePricePerToken: 0.00000375, // $3.75/MTok
    cacheReadPricePerToken: 0.0000003, // $0.30/MTok
    supportsThinking: true,
    supportsVision: true,
    supportsTools: true,
    thinkingType: 'adaptive',
    maxOutputTokens: 64000,
    contextWindow: 200000,
    sortOrder: 2,
  },
  {
    modelId: 'claude-sonnet-4-5-20250929',
    displayName: 'Claude 4.5 Sonnet',
    generationGroup: 'Claude 4.5',
    inputPricePerToken: 0.000003,
    outputPricePerToken: 0.000015,
    thinkingPricePerToken: 0.000015,
    cacheWritePricePerToken: 0.00000375,
    cacheReadPricePerToken: 0.0000003,
    supportsThinking: true,
    supportsVision: true,
    supportsTools: true,
    thinkingType: 'extended',
    maxOutputTokens: 64000,
    contextWindow: 200000,
    sortOrder: 3,
  },
  {
    modelId: 'claude-haiku-4-5-20251001',
    displayName: 'Claude 4.5 Haiku',
    generationGroup: 'Claude 4.5',
    inputPricePerToken: 0.000001,      // $1/MTok
    outputPricePerToken: 0.000005,     // $5/MTok
    thinkingPricePerToken: 0.000005,
    cacheWritePricePerToken: 0.00000125,
    cacheReadPricePerToken: 0.0000001,
    supportsThinking: true,
    supportsVision: true,
    supportsTools: true,
    thinkingType: 'extended',
    maxOutputTokens: 64000,
    contextWindow: 200000,
    sortOrder: 4,
  },
  {
    modelId: 'claude-opus-4-5-20251101',
    displayName: 'Claude 4.5 Opus',
    generationGroup: 'Claude 4.5',
    inputPricePerToken: 0.000005,
    outputPricePerToken: 0.000025,
    thinkingPricePerToken: 0.000025,
    cacheWritePricePerToken: 0.00000625,
    cacheReadPricePerToken: 0.0000005,
    supportsThinking: true,
    supportsVision: true,
    supportsTools: true,
    thinkingType: 'extended',
    maxOutputTokens: 64000,
    contextWindow: 200000,
    sortOrder: 5,
  },
  {
    modelId: 'claude-opus-4-20250514',
    displayName: 'Claude 4 Opus',
    generationGroup: 'Claude 4',
    inputPricePerToken: 0.000015,      // $15/MTok
    outputPricePerToken: 0.000075,     // $75/MTok
    thinkingPricePerToken: 0.000075,
    cacheWritePricePerToken: 0.00001875,
    cacheReadPricePerToken: 0.0000015,
    supportsThinking: true,
    supportsVision: true,
    supportsTools: true,
    thinkingType: 'extended',
    maxOutputTokens: 32000,
    contextWindow: 200000,
    sortOrder: 6,
  },
  {
    modelId: 'claude-sonnet-4-20250514',
    displayName: 'Claude 4 Sonnet',
    generationGroup: 'Claude 4',
    inputPricePerToken: 0.000003,
    outputPricePerToken: 0.000015,
    thinkingPricePerToken: 0.000015,
    cacheWritePricePerToken: 0.00000375,
    cacheReadPricePerToken: 0.0000003,
    supportsThinking: true,
    supportsVision: true,
    supportsTools: true,
    thinkingType: 'extended',
    maxOutputTokens: 64000,
    contextWindow: 200000,
    sortOrder: 7,
  },
];
```

### Anti-Patterns to Avoid

- **Modifying the existing chat UI components:** Phase 3 explicitly states the existing chat UI stays untouched. Only the data fed to it changes (filtered model list, filtered MCP tools, composed system prompt).
- **Hardcoding model capabilities:** The Model Registry exists specifically to avoid this. Do NOT add new model arrays in code -- read from the DB.
- **Combined token budget check at chat time:** Per CONTEXT.md decisions, validation happens at save time only. The chat route assembles layers without re-checking budgets.
- **Storing computed cost in UsageRecord:** Cost is calculated on read by joining with Model Registry pricing. This keeps costs accurate when pricing changes.
- **Using localStorage for custom instructions:** The existing settings modal saves to localStorage, but Phase 3 requires DB persistence via OrgMember.customInstructions (org-scoped). Must migrate.
- **Building analytics/charts UI:** Deferred to Phase 5/6. Phase 3 admin consoles only have management forms, not dashboards.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Token counting | Custom tokenizer | Character heuristic (~4 chars/token) for client-side; same heuristic server-side with margin | Anthropic's tokenizer is not available client-side; the heuristic is within 10% accuracy which is sufficient for budget enforcement |
| XML sanitization | Regex soup | Dedicated sanitizePromptLayer() with 2-step approach (strip tags, escape chars) | Simple, testable, covers injection vectors without over-engineering |
| Admin sidebar | Custom navigation | Existing `components/ui/sidebar.tsx` (shadcn pattern) | 24KB component already in project with SidebarProvider, SidebarMenu, etc. |
| Form components | Custom inputs | Existing shadcn components (Button, Input, Switch, Dialog, Label) | All already installed and used in project |
| Tabs | Custom tab logic | shadcn Tabs (@radix-ui/react-tabs) | Handles keyboard navigation, ARIA attributes |
| Checkbox (indeterminate) | Custom mixed-state | @radix-ui/react-checkbox with `checked="indeterminate"` | Native indeterminate support for group model toggles |
| Audit logging | New audit system | Existing `auditLog.record(tx, entry)` from `lib/services/audit-service.ts` | Already established pattern from Phase 2 |

**Key insight:** This phase has minimal new library dependencies. The existing codebase already has all the UI primitives, the database schema is 90% ready (just needs Model table and UsageRecord extensions), and the auth/tenant infrastructure from Phase 1-2 provides the foundation for all RBAC enforcement.

## Common Pitfalls

### Pitfall 1: Token Count Mismatch Between Client and Server
**What goes wrong:** Client shows "195/200 tokens" but server rejects at save time because actual tokenization differs.
**Why it happens:** Character-based heuristic (~4 chars/token) is an approximation. Non-English text, special characters, and code have different token densities.
**How to avoid:** (a) Use same heuristic on both client and server. (b) Server should accept up to 105% of the stated limit to account for approximation error. (c) Client counter clearly labeled "approximate." (d) Save-time error message explains the token count exceeded the limit.
**Warning signs:** Users complain they can't save instructions that appear under the limit.

### Pitfall 2: Hardcoded Model Lists Surviving After Registry
**What goes wrong:** The CLAUDE_MODELS array in `full-chat-app.tsx` and the GET /api/chat handler still serve hardcoded models instead of reading from the registry.
**Why it happens:** Multiple places define model lists: `lib/constants/role-templates.ts`, `app/api/chat/route.ts` GET handler, `components/full-chat-app.tsx`.
**How to avoid:** Create a single API endpoint (`GET /api/org/[slug]/models`) that queries Model Registry filtered by role. Frontend fetches from this endpoint. Remove all hardcoded model arrays.
**Warning signs:** New models added via Super Admin UI don't appear in the chat model selector.

### Pitfall 3: MCP Tool Leakage Between Roles
**What goes wrong:** User sees/uses MCP tools from another role because the query doesn't properly filter.
**Why it happens:** The existing `loadActiveMcpToolsWithDescriptions` takes `activeMcpIds` from the frontend without server-side filtering.
**How to avoid:** Always intersect frontend-requested MCP IDs with server-queried authorized set. Never trust client-sent MCP IDs alone.
**Warning signs:** Users in Basic role can access tools assigned only to Technical role.

### Pitfall 4: System Prompt XML Injection
**What goes wrong:** Admin/user includes `</platform-instructions>` in their custom instructions, breaking the XML structure.
**Why it happens:** Untrusted input not sanitized before placing inside XML delimiters.
**How to avoid:** The `sanitizePromptLayer()` function strips ALL XML-like tags and escapes `<`, `>`, `&` in untrusted layers (org, role, user). Platform layer is trusted (hardcoded).
**Warning signs:** AI behavior changes unexpectedly after admin updates instructions.

### Pitfall 5: Usage Recording Fails Silently
**What goes wrong:** UsageRecord not created but chat works fine, leading to incorrect usage analytics.
**Why it happens:** Usage recording in onFinish callback fails (DB error, missing fields) but is caught silently.
**How to avoid:** (a) Log usage recording errors prominently. (b) Include essential null checks. (c) Don't wrap in fire-and-forget -- use proper try/catch with console.error. (d) Validate totalUsage fields aren't NaN before inserting.
**Warning signs:** Usage queries return fewer records than expected conversations.

### Pitfall 6: Model Table Not in Tenant Scope
**What goes wrong:** Model table accidentally added to TENANT_SCOPED_MODELS in tenant.ts, breaking platform-level queries.
**Why it happens:** Developer pattern of "add org-scoped" for all new tables.
**How to avoid:** Model table is platform-level (like User, Session). Do NOT add to TENANT_SCOPED_MODELS. Access via raw `prisma` client, not `tenantDb`.
**Warning signs:** Model queries return empty results or fail with missing organizationId.

### Pitfall 7: Role.allowedModels References Non-Registry IDs
**What goes wrong:** Existing seed data stores model IDs like `'claude-opus-4-6'` in Role.allowedModels. After Model Registry, these must match Model.modelId exactly.
**Why it happens:** The role templates in `lib/constants/role-templates.ts` use string model IDs. These must match the Model Registry seed data.
**How to avoid:** Ensure model seed runs BEFORE role/org seed. Validate Role.allowedModels against Model.modelId on save.
**Warning signs:** Users see "no models available" even though their role has allowedModels set.

### Pitfall 8: Admin Console Layout Breaks Chat Layout
**What goes wrong:** Admin console full-page layout CSS leaks into or conflicts with the chat UI.
**Why it happens:** Shared root layout applies styles that affect both contexts.
**How to avoid:** Admin console has its own `layout.tsx` with isolated styles. The admin route is a completely separate page tree (`/org/[slug]/admin/*` has its own layout, separate from `/org/[slug]/chat`).
**Warning signs:** Chat UI looks different after visiting admin console.

## Code Examples

### Token Validation at Save Time (Server-Side)

```typescript
// lib/services/instruction-service.ts
import { z } from 'zod';

const TOKEN_LIMITS = {
  org: 700,
  role: 500,
  user: 200,
} as const;

function estimateTokenCount(text: string): number {
  if (!text || text.trim().length === 0) return 0;
  return Math.ceil(text.length / 4);
}

// Server-side margin: accept up to 105% to account for approximation error
const SERVER_MARGIN = 1.05;

export const OrgInstructionsSchema = z.object({
  systemInstructions: z.string()
    .max(TOKEN_LIMITS.org * 4 * SERVER_MARGIN, 'Instructions exceed maximum character length')
    .refine(
      (val) => estimateTokenCount(val) <= Math.ceil(TOKEN_LIMITS.org * SERVER_MARGIN),
      { message: `Instructions exceed the ${TOKEN_LIMITS.org} token limit` }
    ),
});

export const RoleInstructionsSchema = z.object({
  systemInstructions: z.string()
    .max(TOKEN_LIMITS.role * 4 * SERVER_MARGIN, 'Instructions exceed maximum character length')
    .refine(
      (val) => estimateTokenCount(val) <= Math.ceil(TOKEN_LIMITS.role * SERVER_MARGIN),
      { message: `Instructions exceed the ${TOKEN_LIMITS.role} token limit` }
    ),
});

export const UserInstructionsSchema = z.object({
  customInstructions: z.string()
    .max(TOKEN_LIMITS.user * 4 * SERVER_MARGIN, 'Instructions exceed maximum character length')
    .refine(
      (val) => estimateTokenCount(val) <= Math.ceil(TOKEN_LIMITS.user * SERVER_MARGIN),
      { message: `Instructions exceed the ${TOKEN_LIMITS.user} token limit` }
    ),
});
```

### Live Token Counter Component

```typescript
// components/admin/instruction-editor.tsx
'use client';

import { useState, useCallback } from 'react';

function estimateTokenCount(text: string): number {
  if (!text || text.trim().length === 0) return 0;
  return Math.ceil(text.length / 4);
}

interface InstructionEditorProps {
  value: string;
  onChange: (value: string) => void;
  maxTokens: number;
  label: string;
  disabled?: boolean;
  disabledMessage?: string;
}

export function InstructionEditor({
  value,
  onChange,
  maxTokens,
  label,
  disabled = false,
  disabledMessage,
}: InstructionEditorProps) {
  const tokenCount = estimateTokenCount(value);
  const isOverLimit = tokenCount > maxTokens;
  const percentage = Math.min((tokenCount / maxTokens) * 100, 100);

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-foreground">{label}</label>
      <div className="relative">
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className={cn(
            "w-full min-h-[120px] rounded-lg border bg-background px-3 py-2.5 text-sm resize-y",
            disabled && "opacity-50 cursor-not-allowed",
            isOverLimit ? "border-destructive" : "border-border"
          )}
          placeholder="Enter instructions..."
        />
        {disabled && disabledMessage && (
          <p className="mt-1 text-xs text-muted-foreground">{disabledMessage}</p>
        )}
      </div>
      <div className="flex items-center justify-between text-xs">
        <span className={isOverLimit ? "text-destructive font-medium" : "text-muted-foreground"}>
          ~{tokenCount} / {maxTokens} tokens
        </span>
        <div className="h-1.5 w-24 rounded-full bg-muted overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full transition-all",
              isOverLimit ? "bg-destructive" : percentage > 80 ? "bg-amber-500" : "bg-primary"
            )}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    </div>
  );
}
```

### Model Registry Service Pattern

```typescript
// lib/services/model-registry-service.ts
import prisma from '@/lib/db';
import { auditLog, type PrismaTransactionClient } from './audit-service';

export async function getAllModels(status?: 'ACTIVE' | 'DEPRECATED') {
  return prisma.model.findMany({
    where: status ? { status } : undefined,
    orderBy: [{ sortOrder: 'asc' }],
  });
}

export async function getModelsByIds(modelIds: string[]) {
  return prisma.model.findMany({
    where: { modelId: { in: modelIds }, status: 'ACTIVE' },
    orderBy: [{ sortOrder: 'asc' }],
  });
}

export async function getModelsGroupedByGeneration() {
  const models = await getAllModels('ACTIVE');
  const groups: Record<string, typeof models> = {};
  for (const model of models) {
    if (!groups[model.generationGroup]) {
      groups[model.generationGroup] = [];
    }
    groups[model.generationGroup].push(model);
  }
  return groups;
}

export async function createModel(
  data: ModelCreateInput,
  actorId: string,
  ipAddress: string | null
) {
  return prisma.$transaction(async (tx: PrismaTransactionClient) => {
    const model = await tx.model.create({ data });
    await auditLog.record(tx, {
      userId: actorId,
      action: 'model.created',
      targetType: 'Model',
      targetId: model.id,
      metadata: { modelId: data.modelId, displayName: data.displayName },
      ipAddress,
    });
    return model;
  });
}
```

### Permitted Models API Endpoint

```typescript
// app/api/org/[slug]/models/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { requireOrgAuth } from '@/lib/auth-middleware';
import { getModelsByIds } from '@/lib/services/model-registry-service';

export async function GET(req: NextRequest) {
  const auth = await requireOrgAuth(req);
  if (auth instanceof NextResponse) return auth;

  const { role } = auth;
  const allowedModelIds = Array.isArray(role.allowedModels)
    ? (role.allowedModels as string[])
    : [];

  // Fetch full model info from registry, filtered to active + permitted
  const models = await getModelsByIds(allowedModelIds);

  return NextResponse.json({
    models: models.map(m => ({
      id: m.modelId,
      name: m.displayName,
      generationGroup: m.generationGroup,
      supportsThinking: m.supportsThinking,
      thinkingType: m.thinkingType,
      maxOutputTokens: m.maxOutputTokens,
      contextWindow: m.contextWindow,
    })),
    defaultModel: models[0]?.modelId || null,
  });
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Hardcoded CLAUDE_MODELS array | Model Registry (DB table) | Phase 3 | New models via UI, no code changes |
| Custom instructions in localStorage | Custom instructions in DB (OrgMember.customInstructions) | Phase 3 | Org-scoped, persisted, admin-controllable |
| Single system prompt | 4-layer composed prompt with XML delimiters | Phase 3 | Org/role/user customization without modifying platform prompt |
| All MCP tools visible to all users | Role-filtered MCP tool access | Phase 3 | Security: users only see authorized tools |
| No usage tracking | Per-request UsageRecord with token breakdown | Phase 3 | Foundation for analytics and limit enforcement |
| Placeholder admin pages | Functional admin console shells | Phase 3 | Super Admin Model Registry + Org Admin management pages |

**Deprecated/outdated:**
- `AVAILABLE_MODELS` in `lib/constants/role-templates.ts`: Will be replaced by Model Registry lookups. Keep temporarily for seed backward compatibility but mark as deprecated.
- `GET /api/chat` hardcoded models list: Will be replaced by `GET /api/org/[slug]/models` endpoint reading from registry.
- `CLAUDE_MODELS` in `components/full-chat-app.tsx`: Will be replaced by fetching from permitted models endpoint.
- `ADAPTIVE_THINKING_MODELS` and `MANUAL_THINKING_MODELS` in `app/api/chat/route.ts`: Will be replaced by Model.thinkingType from registry.

## Open Questions

1. **Token counting precision vs complexity**
   - What we know: Character heuristic (~4 chars/token) is within ~10% for English text. Anthropic offers a count-tokens API endpoint (free, rate-limited).
   - What's unclear: Whether to use the API for server-side validation or stick with the heuristic.
   - Recommendation: Use the character heuristic for both client and server. The 105% margin on server-side handles the approximation error. Avoids API dependency and latency. If precision becomes an issue, the count-tokens API can be added later.

2. **UCHAT-06 Onboarding Agreement Scope**
   - What we know: CONTEXT.md says "Claude decides based on Phase 3 scope what to build now vs defer."
   - What's unclear: Whether to build the full onboarding agreement UI or just the backend model.
   - Recommendation: Build the backend model (UserAgreement table or field on OrgMember) + acceptance tracking API. Defer the full onboarding UI to Phase 7 unless it naturally fits. The minimum viable implementation is a field like `agreementAcceptedAt` on OrgMember.

3. **Role.allowedModels migration to Model Registry references**
   - What we know: Currently Role.allowedModels stores an array of model ID strings (e.g., `["claude-opus-4-6"]`). The Model Registry stores the same IDs as Model.modelId.
   - What's unclear: Whether to change Role.allowedModels to reference Model table IDs (UUIDs) or keep using model ID strings.
   - Recommendation: Keep using model ID strings in Role.allowedModels. The Model.modelId is unique and stable. Adding a Prisma relation would require a junction table and complicate the existing seed data. String matching works and is simpler.

4. **Personal MCP servers: Role-level flag**
   - What we know: CONTEXT.md says "Org Admin can enable personal MCP servers per role via toggle + max count."
   - What's unclear: Whether to add `personalMcpEnabled` and `personalMcpMaxCount` fields to the Role model or use the permissions JSON array.
   - Recommendation: Add explicit fields to Role: `personalMcpEnabled Boolean @default(false)` and `personalMcpMaxCount Int @default(3)`. Explicit fields are clearer than buried in permissions JSON and easier to query.

## Sources

### Primary (HIGH confidence)
- Anthropic official pricing page: https://platform.claude.com/docs/en/about-claude/pricing -- All model pricing verified (Opus 4.6: $5/$25, Sonnet 4.6: $3/$15, etc.)
- Anthropic models overview: https://platform.claude.com/docs/en/about-claude/models/overview -- Model IDs, context windows, max output tokens, capability flags
- Vercel AI SDK streamText docs: https://ai-sdk.dev/docs/reference/ai-sdk-core/stream-text -- totalUsage, reasoningTokens, inputTokenDetails, onFinish callback

### Secondary (MEDIUM confidence)
- Vercel AI SDK Anthropic provider: https://ai-sdk.dev/providers/ai-sdk-providers/anthropic -- providerMetadata.anthropic, cacheCreationInputTokens
- Anthropic token counting guide: https://platform.claude.com/docs/en/build-with-claude/token-counting -- count-tokens API availability

### Tertiary (LOW confidence)
- Client-side token estimation accuracy (~10%): Multiple community sources agree on ~4 chars/token heuristic for English text. Needs validation if multilingual support is critical.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already installed and verified in project; only Radix tabs/checkbox/select may need adding
- Architecture: HIGH - Patterns follow established Phase 1-2 conventions (service layer, Prisma transactions, audit logging, auth middleware); schema already has most needed fields
- Pitfalls: HIGH - Based on direct codebase analysis of existing code patterns and integration points
- Pricing data: HIGH - Verified from official Anthropic pricing page (Feb 2026)
- Token counting: MEDIUM - Character heuristic is well-established but accuracy varies with content type

**Research date:** 2026-02-27
**Valid until:** 2026-03-27 (30 days -- pricing may change, model IDs stable)
