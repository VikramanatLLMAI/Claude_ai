# Feature Research

**Domain:** RBAC Multi-Tenant AI Chat SaaS Platform
**Researched:** 2026-02-26
**Confidence:** HIGH

## Feature Landscape

This research maps the feature landscape for adding RBAC multi-tenancy to an existing AI chat application (LLMatscale.ai). Features are categorized based on competitive analysis of ChatGPT Enterprise/Business, Claude Enterprise/Team, and industry-standard multi-tenant SaaS patterns.

### Table Stakes (Users Expect These)

Features enterprise customers and org admins assume exist. Missing these = platform is not enterprise-ready.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Organization CRUD** | Every multi-tenant SaaS has org management. Without it, there is no tenancy. | MEDIUM | Create, edit, suspend, activate, soft delete with 30-day grace period. Industry standard grace period (Microsoft uses 30-90 days). |
| **Role Hierarchy (Super Admin / Org Admin / User)** | ChatGPT Enterprise has Owner/Admin/Member. Claude Enterprise has Primary Owner/Admin/Member. A 3-tier hierarchy is the minimum viable structure. | MEDIUM | Super Admin = platform-wide (no chat), Org Admin = org-scoped management, User = chat access. Self-protection rules (cannot demote/delete self) are standard. |
| **Data Isolation by Organization** | Non-negotiable for multi-tenancy. Every SaaS competitor enforces strict tenant isolation. A data leak between orgs is a deal-breaker. | HIGH | All queries must filter by orgId. Every table with org-scoped data needs an orgId column. This is foundational -- everything else depends on it. |
| **Invitation-Based User Management** | ChatGPT Business/Enterprise and Claude Enterprise both use invite flows. Enterprise customers expect controlled onboarding, not open registration. | MEDIUM | Invite via email (Resend API), accept flow with registration, resend/revoke invitations. No self-registration aligns with enterprise SaaS norms. |
| **Per-Role Model Access Control** | ChatGPT Enterprise uses RBAC to control which tools/models are available per custom role. This is the primary value proposition of RBAC in an AI platform. | MEDIUM | Control which Claude models each role can access. Without this, RBAC is decorative. |
| **Usage Limits (Role-Level and Org-Level)** | ChatGPT Enterprise has tiered quotas. Claude Enterprise has spend controls. Token/request limiting per role and org is how admins control AI costs. | HIGH | Role-level daily limits (requests + tokens), org-level monthly limits. Warning at 80%, hard block at 100%. Visibility of usage is critical -- "when users can see consumption, behavior changes." |
| **Session-Based Authentication with Org Context** | Existing auth works for single-user. Multi-tenant requires org context in every session. Every competitor does this. | MEDIUM | Extend existing session model to include orgId and role context. Session validation must check org membership on every request. |
| **Audit Logs** | SOC 2, GDPR, and ISO 27001 all require audit trails. ChatGPT Enterprise has a Compliance API. Claude Enterprise has audit logs. This is table stakes for any enterprise SaaS. | HIGH | Platform-level and org-level audit logs. Immutable, filterable by date/org/action/user, exportable as CSV/JSON. Log all admin actions, permission changes, and data access events. |
| **Basic Analytics (Org Admin)** | Claude Enterprise provides usage analytics. ChatGPT Enterprise has usage insights. Admins need visibility into their org's AI usage. | HIGH | User statistics, conversation/message/token counts by user/role/model, usage trend charts. Recharts for visualization. |
| **Password Policy Per Org** | Enterprise customers expect to enforce their own security policies. NIST 800-63B recommends minimum 8 chars, no forced complexity, no scheduled expiration (change only on compromise). | LOW | Per-org configurable minimum length and complexity rules. Password expiry optional. Force reset capability. Graceful enforcement (existing passwords checked on next login only). |

### Differentiators (Competitive Advantage)

Features that go beyond what ChatGPT Enterprise and Claude Enterprise offer. These create competitive advantage for a self-hosted platform.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **4-Layer System Prompt Stack** | Neither ChatGPT Enterprise nor Claude Enterprise expose a multi-layered system prompt architecture to admins. Platform prompt + Org instructions + Role instructions + User layer gives unprecedented control over AI behavior at every level. | MEDIUM | Platform (hardcoded), Org (2000 char), Role (2000 char), User (name + role + custom instructions). Combined token budget enforcement (2000 tokens max). This is a genuine differentiator -- competitors give admins minimal prompt control. |
| **Per-Role MCP Server Assignment** | Competitors do not offer MCP server access scoped by role within an organization. Controlling which tools each role can use is powerful for compliance-sensitive environments. | MEDIUM | Org-wide MCP servers + role-specific assignments. Users cannot self-configure MCP. This pairs well with model access control for complete capability gating. |
| **Custom Role Creation** | ChatGPT Enterprise added custom RBAC roles recently. Claude Enterprise has fixed roles. Allowing Org Admins to create custom roles with specific model/tool/limit configurations is a meaningful differentiator for a self-hosted platform. | MEDIUM | System role templates (Technical, Business, Basic) as starting points. Org Admins create custom roles with per-role model access, MCP assignment, system instructions, usage limits, and custom instructions toggle. |
| **Conversation Visibility Toggle** | ChatGPT Enterprise offers conversation access via Compliance API. But a simple admin-controlled toggle with user notice in the chat UI is more transparent and easier to use for smaller deployments. | LOW | Org-level toggle (default off = private). When enabled, Org Admin gets read-only access. User notice in chat UI is critical for trust. Filter and export for compliance. |
| **Org Branding and Theme Control** | Self-hosted platforms can offer white-labeling. Neither ChatGPT nor Claude allow orgs to customize themes or branding colors. | LOW | Org logo (Base64), primary/accent colors, theme assignment from platform palette. Low complexity but high perceived value for orgs wanting their own identity. |
| **Platform API Key Management** | In competitors, the platform owns the API key. In a self-hosted model, Super Admin manages API keys and assigns them to orgs. This gives flexibility that hosted competitors cannot offer. | MEDIUM | Super Admin adds/removes/tests API keys per provider (v1: Anthropic only). Assign keys to specific organizations. Decouples org billing from platform management. |
| **Platform Analytics (Super Admin)** | Self-hosted platforms need centralized visibility. Competitors don't offer this because they are the platform. For a self-hosted SaaS, Super Admin analytics across all orgs is essential for capacity planning. | HIGH | Org statistics, cross-org user stats, total token consumption by org/provider/model, usage trends via Recharts, top orgs by usage, peak hours, error rates, MCP usage trends. |
| **Session Management (User + Admin)** | ChatGPT has "log out all devices" but it is notoriously unreliable (multiple community complaints). Offering reliable per-session visibility and revocation, plus admin force-logout, is a competitive advantage. | MEDIUM | Users view all active sessions (device, last active), revoke specific sessions. Org Admin can force-logout a user from all sessions. Reliable implementation is key. |
| **User Impersonation (Read-Only)** | Enterprise support tool. Neither major competitor exposes this to org admins. Read-only impersonation with full audit logging lets support staff see what a user sees without modifying anything. | MEDIUM | Must be read-only and fully logged in audit trail. Useful for debugging user-reported issues. |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem good but create problems. Explicitly NOT building these in v1.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| **OAuth/SSO Login** | Enterprise customers eventually want it. | Massive implementation complexity (SAML, OIDC, provider-specific quirks). Blocks launch if treated as v1 requirement. At 5-20 orgs scale, email/password with strong password policies is sufficient. | Email/password with per-org password policies. Add SSO in v2 when customer demand justifies the engineering investment. |
| **Fine-Grained ABAC (Attribute-Based Access Control)** | "We need permissions based on department, region, time of day." | Exponential complexity. RBAC with custom roles covers 95% of use cases at this scale. ABAC is only justified for 1000+ user deployments. | Custom roles with per-role model access, MCP assignment, and usage limits. If a role doesn't fit, create another role. |
| **Real-Time Cross-User Chat** | "Can users chat with each other?" | This is an AI chat platform, not Slack. Adding user-to-user messaging requires WebSocket infrastructure, presence tracking, and notification systems. Completely orthogonal to core value. | Users share AI conversation links (existing share feature) for collaboration. |
| **Multiple AI Providers** | "Support OpenAI, Gemini, and Claude." | v1 is Anthropic-only. Adding providers means abstracting the chat API, handling different streaming formats, different token counting, different model capabilities. Premature generalization. | Anthropic-only in v1. Architecture should not prevent adding providers later, but do not build the abstraction until there is a second provider to abstract over. |
| **Billing/Payment Integration** | "Auto-charge orgs based on usage." | Stripe integration, metered billing, invoice generation, payment failure handling -- each is a project. At 5-20 orgs, manual billing is fine. | Manual org management. Usage analytics provide the data needed for manual invoicing. Add billing when org count exceeds what manual management can handle. |
| **Email Notifications for Usage Alerts** | "Notify admins when users hit 80% of limits." | Requires email template design, notification preferences, delivery tracking, and edge cases (user has no email, bounced emails). Dashboard alerts are sufficient for v1. | In-app warning banners at 80% and hard block at 100%. Dashboard alerts for Org Admin. Add email notifications in v2. |
| **Public API for External Integrations** | "Let other apps call our API." | API versioning, rate limiting, API key management (separate from AI provider keys), documentation, backward compatibility. Huge maintenance burden. | Internal API routes serve the frontend. No public API contract in v1. |
| **Mobile Native App** | "Users want mobile access." | React Native or Flutter app is a separate product. The web app is already responsive. | Web-only. Ensure responsive design works well on mobile browsers. |
| **User-Configurable MCP Servers** | "Let users add their own MCP tools." | Security nightmare. Users could connect to malicious MCP servers, exfiltrate data, or introduce vulnerabilities. Org admins must control the tool surface area. | MCP servers managed at org-wide and role level by Org Admin. Users consume assigned tools, not configure them. |
| **Per-User API Keys** | "Let users bring their own Anthropic API key." | Complicates token tracking (whose key, whose usage?), billing confusion, security risk (users storing keys client-side). Platform API keys assigned to orgs is cleaner. | Platform manages API keys at Super Admin level, assigned to orgs. Users use org's allocated key transparently. |

## Feature Dependencies

```
[Organization Model]
    |-- requires --> [Data Isolation (orgId on all tables)]
    |-- requires --> [Role Hierarchy (Super Admin / Org Admin / User)]
    |
    |-- [Invitation System]
    |       |-- requires --> [Organization Model]
    |       |-- requires --> [Role Hierarchy]
    |       |-- requires --> [Email Service (Resend API)]
    |
    |-- [Per-Role Model Access Control]
    |       |-- requires --> [Role Hierarchy]
    |       |-- requires --> [Custom Role Creation]
    |
    |-- [Per-Role MCP Server Assignment]
    |       |-- requires --> [Custom Role Creation]
    |       |-- requires --> [Organization Model] (org-wide MCP)
    |
    |-- [Usage Limits]
    |       |-- requires --> [Token Tracking (from Anthropic API responses)]
    |       |-- requires --> [Role Hierarchy] (role-level limits)
    |       |-- requires --> [Organization Model] (org-level limits)
    |
    |-- [System Prompt Stack]
    |       |-- requires --> [Organization Model] (org instructions)
    |       |-- requires --> [Custom Role Creation] (role instructions)
    |       |-- requires --> [User Model with Org Context] (user layer)
    |
    |-- [Audit Logs]
    |       |-- requires --> [Organization Model]
    |       |-- requires --> [Role Hierarchy] (who did what)
    |       |-- enhances --> [All Admin Actions]
    |
    |-- [Org Analytics]
    |       |-- requires --> [Token Tracking]
    |       |-- requires --> [Organization Model]
    |       |-- requires --> [Usage Limits] (for approaching/exceeding reports)
    |
    |-- [Platform Analytics]
    |       |-- requires --> [Org Analytics] (aggregates org data)
    |       |-- requires --> [Super Admin Role]
    |
    |-- [Conversation Visibility]
    |       |-- requires --> [Organization Model]
    |       |-- requires --> [Org Admin Role]
    |
    |-- [Session Management]
    |       |-- requires --> [Organization Model] (org context in session)
    |       |-- enhances --> [Security] (force logout)
    |
    |-- [Password Policy]
    |       |-- requires --> [Organization Model] (per-org settings)
    |       |-- independent of --> [Role System]
    |
    |-- [Theme & Branding]
    |       |-- requires --> [Organization Model]
    |       |-- independent of --> [Role System]

[Platform API Key Management]
    |-- requires --> [Super Admin Role]
    |-- requires --> [Organization Model] (assign keys to orgs)
    |-- enhances --> [Usage Tracking] (key-level tracking)

[User Impersonation]
    |-- requires --> [Audit Logs] (must log all impersonation)
    |-- requires --> [Session Management] (impersonation session)
```

### Dependency Notes

- **Data Isolation requires Organization Model:** Every table with org-scoped data needs an orgId. This is the foundational schema change that everything else depends on.
- **Invitation System requires Email Service:** Resend API integration is a prerequisite for invitations, password resets, and forced resets.
- **Usage Limits requires Token Tracking:** Token counts must be extracted from Anthropic API responses (input_tokens + output_tokens) and stored per-request before limits can be enforced.
- **Platform Analytics requires Org Analytics:** Platform-wide analytics aggregate org-level data. Build org analytics first, then aggregate up.
- **User Impersonation requires Audit Logs:** Impersonation without audit logging is a security liability. Build audit logs before impersonation.
- **Custom Role Creation enhances Model Access + MCP Assignment:** Custom roles are the container that holds per-role configurations. Without custom roles, model access and MCP assignment would need to be configured per-user, which does not scale.
- **Conversation Visibility conflicts with User Privacy by default:** Toggle must default to OFF. When enabled, user notice in chat UI is non-negotiable for trust.

## MVP Definition

### Launch With (v1.0)

Minimum viable multi-tenant platform -- what is needed for the first organization to onboard.

- [ ] **Organization Model + Data Isolation** -- without this, nothing works. Fresh schema with orgId on all data tables.
- [ ] **Role Hierarchy (Super Admin / Org Admin / User)** -- the three roles are the minimum structure for platform management, org management, and chat access.
- [ ] **Seed Script for Super Admin** -- no UI registration path for Super Admin; CLI-created on deployment.
- [ ] **Invitation System with Resend** -- controlled onboarding is essential for enterprise trust.
- [ ] **Per-Role Model Access Control** -- the core RBAC value proposition for AI chat. Without this, roles are meaningless.
- [ ] **Session Auth with Org Context** -- extend existing sessions to carry orgId and role.
- [ ] **System Prompt Stack (4 layers)** -- platform, org, role, user layers provide unique value.
- [ ] **Basic Usage Tracking** -- extract and store token counts from Anthropic responses per request. Needed for limits and analytics later.

### Add After Core (v1.1)

Features to add once the core multi-tenant structure is working.

- [ ] **Custom Role Creation** -- Org Admins need to define roles beyond system templates once they have more than a few users.
- [ ] **Usage Limits (Role + Org Level)** -- requires token tracking to be in place. Add warnings at 80% and hard block at 100%.
- [ ] **Audit Logs** -- log all admin actions. Start with platform and org level. Immutable, filterable, exportable.
- [ ] **Password Policy Per Org** -- configurable security settings for enterprise compliance.
- [ ] **Per-Role MCP Server Assignment** -- control which tools each role can access.
- [ ] **Session Management (User + Admin)** -- view active sessions, revoke specific sessions, admin force-logout.

### Add After Validation (v1.2)

Features to add once orgs are actively using the platform.

- [ ] **Org Analytics Dashboard** -- user stats, token usage by user/role/model, usage trends with Recharts.
- [ ] **Platform Analytics Dashboard** -- cross-org statistics, total consumption, growth trends.
- [ ] **Conversation Visibility Toggle** -- org-level compliance feature with user notice.
- [ ] **Theme & Branding** -- org logos, colors, theme assignment from platform palette.
- [ ] **Platform API Key Management** -- Super Admin manages API keys, assigns to orgs.
- [ ] **User Impersonation (Read-Only)** -- support tool with full audit logging.

### Future Consideration (v2+)

Features to defer until product-market fit is established.

- [ ] **SSO/OAuth** -- add when customer demand justifies the engineering cost at scale beyond 20 orgs.
- [ ] **Email Notifications** -- in-app alerts are sufficient for v1 at 5-20 orgs scale.
- [ ] **Billing/Payment Integration** -- manual invoicing is fine until org count grows significantly.
- [ ] **Multiple AI Providers** -- Anthropic-only in v1. Don't build provider abstraction until there is a second provider.
- [ ] **Public API** -- no external API contract until internal patterns are stable.

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Organization Model + Data Isolation | HIGH | HIGH | P1 |
| Role Hierarchy (3-tier) | HIGH | MEDIUM | P1 |
| Seed Script for Super Admin | HIGH | LOW | P1 |
| Invitation System (Resend) | HIGH | MEDIUM | P1 |
| Per-Role Model Access Control | HIGH | MEDIUM | P1 |
| Session Auth with Org Context | HIGH | MEDIUM | P1 |
| System Prompt Stack (4 layers) | HIGH | MEDIUM | P1 |
| Basic Usage/Token Tracking | HIGH | MEDIUM | P1 |
| Custom Role Creation | HIGH | MEDIUM | P2 |
| Usage Limits (Role + Org) | HIGH | HIGH | P2 |
| Audit Logs | HIGH | HIGH | P2 |
| Password Policy Per Org | MEDIUM | LOW | P2 |
| Per-Role MCP Server Assignment | MEDIUM | MEDIUM | P2 |
| Session Management (User + Admin) | MEDIUM | MEDIUM | P2 |
| Org Analytics Dashboard | MEDIUM | HIGH | P3 |
| Platform Analytics Dashboard | MEDIUM | HIGH | P3 |
| Conversation Visibility Toggle | MEDIUM | LOW | P3 |
| Theme & Branding | LOW | LOW | P3 |
| Platform API Key Management | MEDIUM | MEDIUM | P3 |
| User Impersonation | LOW | MEDIUM | P3 |

**Priority key:**
- P1: Must have for launch -- the platform is not multi-tenant without these
- P2: Should have -- adds enterprise credibility and operational control
- P3: Nice to have -- polish, analytics, and advanced admin features

## Competitor Feature Analysis

| Feature | ChatGPT Enterprise | Claude Enterprise | LLMatscale.ai (Planned) |
|---------|-------------------|-------------------|------------------------|
| Role hierarchy | Owner / Admin / Member + custom RBAC roles | Primary Owner / Admin / Member | Super Admin / Org Admin / User + custom roles |
| Invite system | Admin invites, SCIM provisioning | SSO + SCIM provisioning | Email invites via Resend (v1), SSO deferred to v2 |
| Model access control | Custom roles control tool/model access | Admin controls at workspace level | Per-role model access (granular per custom role) |
| Usage limits | Tiered quotas per subscription plan | Org + user-level spend controls | Per-role daily limits + org monthly limits |
| System prompt control | Custom instructions per GPT | Workspace-level instructions | 4-layer stack (platform/org/role/user) -- unique |
| Audit logs | Compliance API with archiving | Compliance API with SOC 2 alignment | Immutable logs, filterable, exportable CSV/JSON |
| Analytics | Usage insights dashboard | Usage analytics (lines accepted, patterns) | Org-level + Platform-level dashboards with Recharts |
| MCP/Tool control | RBAC controls app/connector access | Admin plugin marketplace control | Per-role MCP server assignment -- unique |
| Conversation visibility | Compliance API access to conversations | Compliance API for conversation data | Simple admin toggle with user notice -- simpler UX |
| Session management | "Log out all devices" (often broken) | Standard session management | Per-session view/revoke + admin force-logout |
| Branding | No org branding | No org branding | Org logo, colors, theme assignment -- unique |
| Data isolation | Workspace isolation | Workspace isolation | orgId-based row filtering, fresh schema design |
| SSO/SCIM | SAML, SCIM | SAML 2.0, OIDC, SCIM | v2 (email/password only in v1) |
| Self-hosted | No (OpenAI hosted) | No (Anthropic hosted) | Yes -- primary deployment model (Docker) |
| Password policy | Managed by SSO/IdP | Managed by SSO/IdP | Per-org configurable (length, complexity, expiry) |

**Key competitive positioning:**
- LLMatscale.ai's primary differentiator is self-hosted deployment with full admin control.
- The 4-layer system prompt stack is genuinely unique -- no competitor offers this level of AI behavior customization at org/role granularity.
- Per-role MCP server assignment is not available in competitors.
- Theme/branding customization is not offered by hosted competitors.
- The trade-off is no SSO/SCIM in v1, which is acceptable at 5-20 org scale but will become a blocker for larger deployments.

## Sources

- [ChatGPT Enterprise Workspace Roles](https://help.openai.com/en/articles/8266431-what-is-the-difference-between-different-roles-on-my-chatgpt-enterprise-workspace) -- MEDIUM confidence (official docs, fetched via search)
- [ChatGPT Enterprise RBAC](https://help.openai.com/en/articles/11750701-rbac) -- MEDIUM confidence
- [ChatGPT Enterprise Admin Controls](https://help.openai.com/en/articles/11509118-admin-controls-security-and-compliance-in-apps-enterprise-edu-and-business) -- MEDIUM confidence
- [Claude Enterprise Plan Features](https://support.claude.com/en/articles/9797531-what-is-the-enterprise-plan) -- MEDIUM confidence
- [Claude Code Admin Controls](https://www.anthropic.com/news/claude-code-on-team-and-enterprise) -- MEDIUM confidence
- [WorkOS RBAC for Multi-Tenant SaaS](https://workos.com/blog/top-rbac-providers-for-multi-tenant-saas-2025) -- MEDIUM confidence
- [Frontegg Audit Logs for SaaS](https://frontegg.com/blog/audit-logs-for-saas-enterprise-customers) -- MEDIUM confidence
- [NIST 800-63B Password Guidelines](https://secureframe.com/blog/password-policy) -- MEDIUM confidence (secondary source)
- [WorkOS Session Revocation](https://workos.com/blog/session-revocation-sign-out-everywhere) -- MEDIUM confidence
- [Multi-Tenant RLS with PostgreSQL](https://aws.amazon.com/blogs/database/multi-tenant-data-isolation-with-postgresql-row-level-security/) -- HIGH confidence (AWS official)
- [Discourse AI LLM Usage Quotas](https://meta.discourse.org/t/configuring-llm-usage-quotas-in-discourse-ai/348125?tl=en) -- LOW confidence (community source, but shows real-world pattern)
- [SaaS Invite-Only Registration](https://www.datadab.com/blog/invite-only-saas-growth/) -- LOW confidence
- [Userpilot Invited User Onboarding](https://userpilot.com/blog/onboard-invited-users-saas/) -- LOW confidence

---
*Feature research for: RBAC Multi-Tenant AI Chat SaaS Platform*
*Researched: 2026-02-26*
