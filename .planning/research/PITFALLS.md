# Pitfalls Research

**Domain:** Multi-tenant RBAC AI Chat SaaS (layered onto existing single-user Next.js application)
**Researched:** 2026-02-26
**Confidence:** HIGH

---

## Critical Pitfalls

### Pitfall 1: Incomplete Tenant Scoping on Existing Data Access Functions

**What goes wrong:**
The existing `storage.ts` has ~30 data access functions. Most fetch by primary key without tenant context: `getConversation(id)`, `getArtifact(id)`, `getMcpConnection(id)`, `getMessages(conversationId)`. The current codebase compensates by doing ownership checks in each API route (e.g., `conversation.userId !== user.id`). When multi-tenancy is added, every single one of these functions must gain an `organizationId` parameter AND the API routes must check org membership -- not just user ownership. Missing even one creates a cross-tenant data leak where User A in Org 1 accesses Conversation X belonging to Org 2 by guessing the UUID.

**Why it happens:**
The existing authorization model is "user owns resource" with checks scattered across ~15 API route files. When adding `organizationId` to the schema, developers update the schema and most routes, but miss edge cases: the `addMessage` function does not verify conversation ownership, the `getArtifact` check lives in the route handler not the data layer, the `toUIMessage` helper never checks anything. One missed route = full cross-tenant breach.

**How to avoid:**
1. Move tenant scoping into the data access layer itself, not route handlers. Every `storage.ts` function that reads or writes data should require `organizationId` as a mandatory parameter and include it in the Prisma `where` clause. This creates a single enforcement point.
2. Consider using Prisma client extensions to automatically inject `organizationId` into every query, making it impossible to forget.
3. Write integration tests that attempt cross-tenant access for every API endpoint. A test that creates data in Org A and tries to read/update/delete it authenticated as a user in Org B.

**Warning signs:**
- Any `storage.ts` function that takes only a resource ID without org context
- Any API route that fetches a resource by ID and then checks ownership in a separate `if` statement (the "fetch then check" anti-pattern)
- Missing org filter on `findMany` calls (e.g., `getAllConversations` currently only filters by `userId`)

**Phase to address:**
Database schema redesign phase (Phase 1). This is foundational -- every subsequent feature depends on tenant-scoped data access being correct. Do not build RBAC permissions on top of a data layer that lacks tenant isolation.

---

### Pitfall 2: Authorization Check Inconsistency Between Route-Level and Data-Level

**What goes wrong:**
The existing app has two authorization layers that need to become three:
- **Layer 1 (Authentication):** `requireAuth()` validates session token and returns user
- **Layer 2 (Ownership):** Route handlers check `resource.userId === user.id`

Multi-tenancy adds:
- **Layer 2.5 (Org membership):** User must belong to the org that owns the resource
- **Layer 3 (RBAC permission):** User's role in that org must have the required permission

Developers commonly implement Layer 3 (role checks) while forgetting Layer 2.5 (org membership). A Super Admin user who also has a Regular User account in Org A could theoretically access Org B's data if the route only checks "is this user an Admin?" without checking "is this user a member of the org that owns this resource?"

**Why it happens:**
The existing `requireAuth()` returns a flat `User` object with no org context. Developers add role checking logic but forget that `user.role === 'admin'` is meaningless without scoping it to "admin in which org?" The three-tier role hierarchy (Super Admin / Org Admin / User) further confuses because Super Admin is platform-wide while Org Admin is org-scoped.

**How to avoid:**
1. Replace `requireAuth()` with `requireOrgAuth(req, orgId)` that returns `{ user, orgMember, role, permissions }` for org-scoped routes. This forces every route to declare what org context it operates in.
2. Create a separate `requireSuperAdmin(req)` for platform-level routes that explicitly rejects org-scoped operations.
3. Never check role names directly (`if (role === 'admin')`). Instead check permissions (`if (permissions.includes('manage_users'))`).

**Warning signs:**
- API routes that call `requireAuth()` but never check org membership
- Role checks using string comparison instead of permission lookups
- Routes that accept `organizationId` from the request body rather than deriving it from the authenticated user's session/membership

**Phase to address:**
Auth middleware redesign phase (Phase 1-2). Must be implemented before any RBAC-gated feature is built.

---

### Pitfall 3: System Prompt Stack Injection and Cross-Tenant Prompt Leakage

**What goes wrong:**
The 4-layer prompt stack (Platform -> Org -> Role -> User) concatenates text from multiple sources into a single system prompt sent to the Anthropic API. If any layer is user-controllable (org system instructions, role instructions, custom instructions), a malicious Org Admin or user can inject prompt content that:
1. Overrides platform-level safety instructions
2. Extracts the org-level or role-level prompt content (which may contain proprietary instructions)
3. Manipulates the AI's behavior to bypass usage restrictions

The current `buildSystemPromptWithTools()` does simple string concatenation. With 4 layers, each potentially containing adversarial content, naive concatenation becomes dangerous.

**Why it happens:**
System prompt construction treats all layers as trusted text. But Org Admins control org instructions and role instructions. Users control custom instructions. These are untrusted inputs being mixed with trusted platform instructions. The "semantic gap" (instructions and data share the same format) means the AI cannot reliably distinguish between "follow this instruction" and "ignore previous instructions."

**How to avoid:**
1. Use XML-delimited sections in the system prompt with clear labels: `<platform_instructions>`, `<org_instructions>`, `<role_instructions>`, `<user_context>`. This gives the model structural cues about instruction hierarchy.
2. Sanitize org/role/user instructions by stripping known injection patterns (e.g., "ignore previous instructions", "system prompt:", "you are now").
3. Enforce character limits strictly (the 2000-char limits per layer are good) AND a combined token budget (the 2000-token cap is good). Validate these server-side, never trust client-side limits.
4. Log the full assembled prompt for audit purposes so prompt injection attempts can be detected retroactively.
5. Place the platform prompt LAST in the concatenation, not first. Models give higher weight to recent instructions, so the safety layer should be the final word.

**Warning signs:**
- Org Admins reporting that their system instructions "don't work" (may indicate they are trying injection patterns)
- AI responses that reference internal prompt structure
- Unusual token consumption patterns from specific orgs (may indicate prompt extraction attempts)

**Phase to address:**
System prompt stack implementation phase. Must have sanitization and structure before exposing org/role instruction editing to Org Admins.

---

### Pitfall 4: Soft Delete + Auto-Purge Creates Data Integrity Nightmares

**What goes wrong:**
The project specifies soft delete for organizations with 30-day auto-purge and Super Admin restore. This interacts catastrophically with:
1. **Unique constraints:** A soft-deleted org still holds its name. Creating a new org with the same name fails. Users in the deleted org still hold their emails. They cannot be re-invited to a new org.
2. **Cascade behavior:** Prisma's `onDelete: Cascade` triggers on hard delete. Soft delete means related data (conversations, messages, artifacts, MCP connections, sessions, audit logs) all remain in the database, consuming storage and potentially appearing in queries that forget to filter `deletedAt`.
3. **Restore edge cases:** Restoring an org after 25 days -- what about users who were re-invited to other orgs? Their email is now in two orgs. What about roles that were modified in templates during the deletion period?

**Why it happens:**
Soft delete feels safer than hard delete but introduces massive complexity. Every query across the entire application must filter out soft-deleted records. Prisma does not have built-in soft delete support -- you must implement it manually via middleware or extensions. One missed filter = deleted org's data leaks into active org's views.

**How to avoid:**
1. Use Prisma client extensions or middleware to automatically apply `deletedAt IS NULL` filters globally. Never rely on individual queries remembering to filter.
2. For unique constraints, use partial unique indexes in PostgreSQL: `CREATE UNIQUE INDEX ... WHERE deleted_at IS NULL`. This allows soft-deleted records to coexist with new records that share the same unique field.
3. Define the restore policy explicitly before implementation: What happens to users? To data created during deletion? To role templates? Document every edge case.
4. Set the auto-purge to be a hard delete that uses database-level cascades for clean removal after 30 days. The soft delete period is only a "recycle bin."
5. Limit soft delete to the Organization model only. Users, conversations, messages, etc. do NOT need soft delete -- they cascade with the org.

**Warning signs:**
- Queries returning unexpected results (soft-deleted data leaking through)
- Unique constraint violations when creating new orgs or inviting users
- Storage growth that does not correlate with active usage
- "Ghost" data appearing in analytics dashboards

**Phase to address:**
Database schema design phase (Phase 1). The soft delete strategy must be decided and implemented in the schema before any CRUD operations are built on top of it.

---

### Pitfall 5: Token/Usage Tracking Race Conditions and Inaccurate Limits

**What goes wrong:**
The project requires per-role daily limits (requests and tokens) and per-org monthly limits. Token counts come from Anthropic API responses (`input_tokens + output_tokens`). With streaming responses, the final token count is only available after the stream completes. Multiple concurrent requests from the same user create race conditions:
1. User has 100 tokens remaining. Sends 3 requests simultaneously. Each checks the limit (100 remaining), each proceeds, each consumes 50 tokens. Actual usage: 150 tokens, limit: 100.
2. Stream fails mid-way. Tokens were consumed by Anthropic but never recorded in the database. Usage tracking drifts from reality.
3. Request-level daily limits checked at request start, but long-running streams can span midnight. Does the request count against today or tomorrow?

**Why it happens:**
The existing chat endpoint (`app/api/chat/route.ts`) saves messages after streaming completes. Token tracking would follow the same pattern -- record after completion. But limit checking happens before the request starts. This check-then-act pattern is inherently racy without locking.

**How to avoid:**
1. Use optimistic locking with atomic database operations: `UPDATE usage SET tokens = tokens + $consumed WHERE org_id = $orgId AND tokens + $consumed <= $limit RETURNING tokens`. If the update returns 0 rows, the limit was exceeded.
2. For request limits, use `INCREMENT` and check atomically: the counter check and increment must be a single database transaction, not a read-then-write.
3. Accept that token limits will be approximate. Document this: "Limits are enforced within a margin of one request. A request that starts within limits will complete even if it exceeds the limit." This is the standard approach used by OpenAI, Anthropic, and other API providers.
4. For failed streams, still record the tokens consumed (Anthropic charges for them). Use the `onFinish` callback from `streamText` which provides usage data even on partial completions.
5. Reset daily counters using a timezone-aware cron job or lazy evaluation (check date on each request, reset if new day).

**Warning signs:**
- Usage dashboard shows different numbers than what users experience
- Users able to send requests after hitting their limit
- Token counts in the database do not match Anthropic billing
- Complaints about limits being "unfair" (hit by one user's burst affecting the whole org)

**Phase to address:**
Usage limits implementation phase. This should come AFTER the basic chat flow works with org context, but BEFORE the analytics dashboards (which depend on accurate usage data).

---

### Pitfall 6: Frontend Role-Gating Without Backend Enforcement

**What goes wrong:**
The existing frontend (`full-chat-app.tsx` at 86KB, `settings-modal.tsx` at 42.7KB) needs conditional rendering based on roles: hide admin panels from users, disable model selectors for models not in the role's allowed list, show/hide MCP configuration. Developers implement these UI restrictions but forget or inconsistently implement the corresponding backend checks. Result: a user who inspects the network tab, copies a cURL command, and hits the API directly bypasses all frontend restrictions.

**Why it happens:**
The existing app has no role concept. Adding conditional rendering to a massive 86KB component file is error-prone. Developers hide a button and feel done. The API endpoint behind that button still works for anyone with a valid session token. This is OWASP #1 (Broken Access Control) and the most common web vulnerability, affecting 94% of tested applications.

**How to avoid:**
1. Implement backend permission checks FIRST, frontend hiding SECOND. Every API endpoint must check permissions. The frontend just makes the UI cleaner by hiding things the backend would reject anyway.
2. Create a centralized permissions middleware: `requirePermission(req, 'models.select', { modelId })` that checks the user's role in their org and validates the specific permission.
3. Return available permissions with the session/user API response so the frontend has a definitive list: `GET /api/auth/me` returns `{ user, permissions: ['chat.send', 'models.select.opus', ...] }`. Frontend gates UI based on this server-provided list.
4. Test every API endpoint independently with different role levels. Do not rely on "the button is hidden so users cannot reach this endpoint."

**Warning signs:**
- API endpoints that do not check permissions (only check authentication)
- Frontend components that check `user.role` directly instead of using a permissions list from the server
- Any endpoint that works when called with cURL by a user who should not have access

**Phase to address:**
Every phase that adds role-gated features. But the permissions middleware must be built in the auth/RBAC foundation phase (Phase 1-2) before any role-gated UI is implemented.

---

### Pitfall 7: Invitation Token Security Gaps

**What goes wrong:**
The invitation system (invite via email, accept with registration) has multiple well-documented vulnerability classes:
1. **Token reuse:** The same invitation link can be used multiple times, allowing one invite to onboard multiple unauthorized users.
2. **Token not bound to email:** If the token is not cryptographically bound to the invited email address, anyone who obtains the link (via forwarding, URL sharing, email interception) can use it to register a different email.
3. **Expired token acceptance:** Tokens that should be expired still work because expiry is checked client-side or the server check has off-by-one errors.
4. **Role escalation via invite manipulation:** The invitation includes the target role. If the accept endpoint trusts the role from the request body instead of looking it up from the stored invitation, an attacker can modify the role during acceptance.
5. **Resend creates new token without invalidating old one:** Multiple valid tokens exist for the same invitation.

**Why it happens:**
The existing `PasswordResetToken` model provides a template, but password reset and invitation have different security requirements. Password reset tokens are for existing users; invitation tokens create new users with specific org membership and role assignment. Developers copy the password reset pattern without adding the additional checks.

**How to avoid:**
1. Store invitations with: `email` (exact match required), `organizationId`, `roleId`, `token` (cryptographically random), `expiresAt`, `usedAt`, `revokedAt`. On acceptance, verify ALL fields match.
2. Single-use tokens: set `usedAt` on first use, reject any token where `usedAt IS NOT NULL`.
3. On resend: revoke the existing token (set `revokedAt`) and generate a new one.
4. During acceptance: the email in the registration form MUST match the email on the invitation. Do not allow registering with a different email.
5. Role comes from the stored invitation record, NEVER from the acceptance request body.
6. Add rate limiting to the invitation acceptance endpoint to prevent brute-force token guessing.

**Warning signs:**
- Invitation tokens that are sequential or predictable (use UUID v4 or crypto.randomBytes)
- Accept endpoint that reads `role` or `organizationId` from the request body
- No `usedAt` field on the invitation model
- Multiple valid tokens for the same email+org combination

**Phase to address:**
Invitation system phase. Must be implemented correctly before any user onboarding flow is exposed.

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Checking `user.role === 'admin'` in route handlers | Fast to implement | Role names change, no permission granularity, scattered checks impossible to audit | Never -- use permission-based checks from day 1 |
| Storing role permissions as a JSON blob on the Role model | No join table needed, flexible | Cannot query "which roles have permission X", no referential integrity, schema drift between roles | MVP only, migrate to a RolePermission join table before custom roles |
| Skipping audit logs for "read" operations | Less database writes, simpler | Cannot investigate data access patterns, compliance gaps | Acceptable for v1 if audit logs cover all writes and admin actions |
| Using `localStorage` for role/permission caching on frontend | Reduces API calls | Stale permissions after admin changes, user sees options they no longer have access to | Acceptable with short TTL (5 min) and cache invalidation on 403 responses |
| Single API key shared across all orgs | Simple setup, one env var | One org's abuse gets the key rate-limited for everyone, no per-org billing attribution | Only acceptable at <5 orgs scale, must add per-org key assignment for growth |

## Integration Gotchas

Common mistakes when connecting to external services in this domain.

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Resend (email) | Using a single API key and `from` address for all orgs, making invitation emails look generic | Use a single Resend API key but customize the email template per org (include org name, logo). Do NOT allow orgs to configure their own from address (SPF/DKIM complications). |
| Anthropic API | Trusting the `model` field from the request body without checking if the user's role allows that model | Validate `model` against the user's role permissions server-side. The existing chat route trusts `requestedModel` from the body. |
| Anthropic API (token tracking) | Only tracking `output_tokens` and missing `input_tokens`, or ignoring tokens from `thinking` blocks | Track `input_tokens + output_tokens` from the usage object. Extended thinking tokens count separately -- include `cache_creation_input_tokens` and `cache_read_input_tokens` if present. |
| Prisma (soft delete) | Using `prisma.organization.delete()` thinking it soft-deletes | Prisma has no built-in soft delete. Must use `update({ data: { deletedAt: new Date() } })`. Wrap in a helper function to prevent accidental hard deletes. |

## Performance Traps

Patterns that work at small scale but fail as usage grows.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Loading all org conversations on sidebar mount | Sidebar loads instantly with 10 conversations | Paginate conversations, load only recent 50, implement infinite scroll | 500+ conversations per org (heavy users after ~3 months) |
| Counting token usage with `SUM()` on every chat request | Imperceptible at low volume | Use a pre-aggregated `daily_usage` table updated atomically on each request, not computed on-the-fly | 100+ requests/day per org |
| Fetching all audit logs without pagination | Works in development | Mandatory pagination, cursor-based for large datasets, time-range filtering | 10,000+ audit entries (~1 month of active org) |
| Assembling the 4-layer system prompt on every request | Negligible overhead | Cache the assembled org+role prompt, invalidate only when org/role instructions change | Not a performance issue, but a correctness issue -- stale cache means prompt changes do not take effect |
| Loading all org members for admin dashboard | Instant with 5 users | Paginate, add search/filter server-side | 100+ users per org |

## Security Mistakes

Domain-specific security issues beyond general web security.

| Mistake | Risk | Prevention |
|---------|------|------------|
| Org Admin can see other orgs' data via API parameter manipulation | Full cross-tenant data breach | Derive `organizationId` from the authenticated user's membership, never from request parameters. The org context comes from the session, not the URL. |
| Super Admin dashboard exposes all conversation content | Privacy violation, legal liability | Super Admin sees metadata only (org names, user counts, usage stats). Conversation content is never exposed to Super Admin. The "conversation visibility" feature is org-scoped and controlled by Org Admin. |
| Password policy enforced only on registration, not on password change | Users bypass policy by changing password to a weak one after initial setup | Enforce password policy on all password operations: registration, change, reset, forced reset. |
| Audit log entries can be modified by the user who created them | Audit trail is untrustworthy, compliance failure | Make audit log table append-only. Remove UPDATE and DELETE permissions at the database level. Use a separate database user for audit writes if possible. |
| MCP server credentials shared across org roles without scoping | User in a low-privilege role can trigger MCP calls to servers they should not access | MCP servers assigned to roles, not globally. The chat endpoint must verify that the user's role has access to each `activeMcpId` before including those tools. |
| Session tokens survive org suspension | Suspended org's users can continue using the platform until their sessions expire | On org suspension, immediately invalidate all sessions for all users in that org. On user suspension, invalidate all their sessions. |

## UX Pitfalls

Common user experience mistakes in this domain.

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Showing raw permission denied errors ("403 Forbidden") | Users confused about why an action failed | Show contextual messages: "Your role does not have access to Claude Opus. Contact your admin to request access." Include the specific missing permission. |
| Admin changes role permissions but user's UI does not update | User sees buttons that no longer work, gets repeated errors | Push permission changes to active sessions via polling or SSE. At minimum, re-fetch permissions on 403 response and update UI immediately. |
| Conversation visibility enabled silently | Users unaware their conversations are being monitored, erodes trust | Show a persistent, non-dismissable banner in the chat UI: "Conversation visibility is enabled. Your admin can view conversations." Users must acknowledge this. |
| Password expiry enforced mid-conversation | User loses unsaved work when forced to re-authenticate | Check password expiry at login time only. Once authenticated, the session is valid for its duration. Show a warning banner "Your password expires in X days" starting 7 days before expiry. |
| Usage limit hit during streaming response | Partial response cut off, context lost | Check limits BEFORE starting the stream. If the user is within 10% of their limit, show a warning. Never cut off a stream mid-response. |

## "Looks Done But Isn't" Checklist

Things that appear complete but are missing critical pieces.

- [ ] **Tenant isolation:** Routes return 200 with correct data for the authenticated user -- but verify they return 403/404 for users in OTHER orgs. Test cross-tenant access explicitly for every endpoint.
- [ ] **Role permission checks:** Admin UI is hidden for regular users -- but verify the API endpoints behind the admin UI also reject non-admin requests. Test every admin endpoint with a regular user token.
- [ ] **Invitation flow:** User can accept invite and log in -- but verify: token single-use, email binding, role assignment from stored invite (not request body), expiry enforcement, revocation works.
- [ ] **Soft delete:** Organization disappears from listings -- but verify: conversations not visible, users cannot log in, related data filtered from all queries, unique constraints do not conflict, restore actually works and restores all related data.
- [ ] **Usage limits:** Counter increments correctly -- but verify: concurrent requests do not bypass, counter resets at correct timezone boundary, streaming failures still count, limit applies to the correct scope (role vs org).
- [ ] **Audit logs:** Actions are logged -- but verify: logs are immutable (cannot UPDATE or DELETE), all admin actions covered, log includes before/after state for data changes, export works, filter by date/org/action type works.
- [ ] **Session invalidation:** Session management UI shows sessions -- but verify: revoking a session immediately invalidates it (not just marks it), org suspension invalidates all org sessions, password change invalidates other sessions.
- [ ] **System prompt stack:** Prompts concatenate correctly -- but verify: injection attempts in org/role/user instructions are mitigated, total token budget enforced server-side, prompt changes take effect on next request (no stale cache).

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Cross-tenant data leak discovered | HIGH | 1. Immediately patch the leaking endpoint. 2. Audit access logs to determine exposure scope. 3. Notify affected organizations. 4. Conduct full security audit of all endpoints. 5. Add automated cross-tenant tests to CI. |
| Role permission bypass via API | MEDIUM | 1. Add permission middleware to the bypassed endpoint. 2. Audit all endpoints for missing permission checks. 3. Add integration tests for every role level on every endpoint. |
| Prompt injection by Org Admin | LOW | 1. Sanitize the offending prompt. 2. Add input validation rules for system instructions. 3. Review audit logs for the org's instruction changes. 4. Consider restricting instruction editing if pattern repeats. |
| Soft delete data leakage | HIGH | 1. Identify all queries missing the `deletedAt` filter. 2. Apply Prisma middleware to enforce filtering globally. 3. Audit what soft-deleted data was exposed. 4. Consider switching to hard delete with backup/restore instead. |
| Usage tracking drift | LOW | 1. Reconcile usage records against Anthropic API billing. 2. Fix the tracking gap (usually failed streams not recording). 3. Run a one-time correction script. 4. Add monitoring for tracking discrepancies. |
| Invitation token reuse | MEDIUM | 1. Invalidate all existing invitation tokens. 2. Resend fresh invitations. 3. Audit which accounts were created via reused tokens. 4. Add single-use enforcement. |

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Incomplete tenant scoping (Pitfall 1) | Schema & Data Access (Phase 1) | Cross-tenant integration tests pass for every endpoint |
| Authorization inconsistency (Pitfall 2) | Auth Middleware Redesign (Phase 1-2) | Every route uses `requireOrgAuth()` or `requireSuperAdmin()`, never bare `requireAuth()` |
| Prompt injection (Pitfall 3) | System Prompt Stack (Phase 3-4) | Injection test suite passes: known injection patterns in org/role instructions do not override platform prompt |
| Soft delete complexity (Pitfall 4) | Schema Design (Phase 1) | Soft-deleted org's data invisible in all queries; restore test passes; unique constraint test passes |
| Usage tracking races (Pitfall 5) | Usage Limits (Phase 3-4) | Concurrent request test: 10 simultaneous requests from a user at 90% limit do not exceed 110% |
| Frontend-only gating (Pitfall 6) | Every feature phase | cURL tests for every role-gated endpoint at every role level in CI |
| Invitation token gaps (Pitfall 7) | Invitation System (Phase 2) | Token reuse test fails, email binding test passes, role escalation test fails |

## Sources

- [OWASP Top 10: Broken Access Control (A01)](https://owasp.org/Top10/A01_2021-Broken_Access_Control/) -- HIGH confidence
- [OWASP Authorization Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html) -- HIGH confidence
- [OWASP LLM Prompt Injection Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/LLM_Prompt_Injection_Prevention_Cheat_Sheet.html) -- HIGH confidence
- [Oso: 10 RBAC Best Practices 2025](https://www.osohq.com/learn/rbac-best-practices) -- MEDIUM confidence
- [Prisma Multi-Tenant with RLS (GitHub)](https://github.com/prisma/prisma-client-extensions/tree/main/row-level-security) -- HIGH confidence
- [ZenStack: Multi-Tenant Approaches with Prisma](https://zenstack.dev/blog/multi-tenant) -- MEDIUM confidence
- [AWS: Fairness in Multi-Tenant Systems](https://aws.amazon.com/builders-library/fairness-in-multi-tenant-systems/) -- HIGH confidence
- [DreamFactory: Rate Limiting in Multi-Tenant APIs](https://blog.dreamfactory.com/rate-limiting-in-multi-tenant-apis-key-strategies) -- MEDIUM confidence
- [Brandur: Soft Deletion Probably Isn't Worth It](https://brandur.org/soft-deletion) -- MEDIUM confidence
- [Medium: Invitation Hijacking](https://medium.com/@kshunya/invitation-hijacking-4d6467f418cc) -- MEDIUM confidence
- [Authentik: Token Reuse in Invitation URLs (GHSA)](https://github.com/goauthentik/authentik/security/advisories/GHSA-9qwp-jf7p-vr7h) -- HIGH confidence
- [PortSwigger: Access Control Vulnerabilities](https://portswigger.net/web-security/access-control) -- HIGH confidence
- [Sombrainc: LLM Security Risks 2026](https://sombrainc.com/blog/llm-security-risks-2026) -- LOW confidence
- Existing codebase analysis (`lib/storage.ts`, `lib/auth-middleware.ts`, `app/api/` routes, `prisma/schema.prisma`) -- HIGH confidence

---
*Pitfalls research for: Multi-tenant RBAC AI Chat SaaS*
*Researched: 2026-02-26*
