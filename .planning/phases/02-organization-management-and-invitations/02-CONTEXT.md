# Phase 2: Organization Management and Invitations - Context

**Gathered:** 2026-02-26
**Status:** Ready for planning

<domain>
## Phase Boundary

Super Admin can create and manage organizations (CRUD + suspend/activate/delete with 30-day grace period), system role templates (Technical/Business/Basic) exist as platform-level blueprints that are copied into new orgs, and users can be invited to and join organizations through a complete email-based invitation flow using Resend. This phase covers backend API + service layer + email delivery + registration pages. Dashboard UI lives in Phases 5-6.

</domain>

<decisions>
## Implementation Decisions

### Invitation & Registration Flow
- Invitation link points to org-branded registration page: `{org-slug}.llmatscale.ai/register?token=xxx`
- Registration page shows org name + logo placeholder, email pre-filled from invitation, user sets name + password
- Invitation email: professional + warm tone. Subject: "You've been invited to [Org Name] on LLMatscale.ai". Body includes org name, inviter's name, role being assigned, clear CTA button. Style reference: Linear/Notion invite emails.
- Expired/revoked invitation links show a friendly error page: "This invitation has expired" or "This invitation was revoked" with suggestion to contact org admin. No org detail leakage beyond what's in the URL.
- After registration, user is automatically logged in and redirected to the org's chat UI. Zero friction — invitation token already proves email validity.
- Invitation expiry: 7 days. Org Admin can resend expired invitations.
- Resend integration: sandbox/test mode first. Production domain (SPF/DKIM) configured later.

### Invitation Conflict Rules (Project-Wide)
- **One user = one organization** — this is a project-wide rule, not Phase 2 specific
- Multiple orgs CAN send invitations to the same email address (no uniqueness check at invite-send time)
- Registration/acceptance enforces email uniqueness — if email is already registered, acceptance is blocked with "This email is already registered in another organization"
- To switch a user between orgs: delete user from current org first, then re-invite to new org
- Super Admins are platform-level accounts with no org context — separate from org users

### Org Lifecycle & Status
- Org suspension takes effect immediately — all active sessions for that org are invalidated instantly. Users see "Your organization has been suspended" on next request.
- Deleted orgs remain visible in the org list with a "Pending Deletion" badge showing days remaining + a "Restore" button. No separate trash view.
- Org creation is a combined flow: name, slug, logo upload (optional), logoDisplayMode toggle (PLATFORM_AND_ORG vs ORG_ONLY), and initial Org Admin email — all in one form. Invitation sent immediately on creation.
- New orgs start with sensible defaults: all 3 system role templates active, default role = Basic, conversation visibility off, all assigned models available. Super Admin can adjust later.

### System Role Templates
- 3 platform-level templates maintained by Super Admin: Technical, Business, Basic
- Templates are blueprints — copied into each new org on creation. Org Admin then owns and customizes the copies.
- Template edits by Super Admin only affect newly created orgs. Existing orgs keep their current versions (no propagation).
- Tiered model access defaults:
  - Technical: all 7 models (Opus 4.6, Sonnet 4.6, Sonnet 4.5, Haiku 4.5, Opus 4.5, Opus 4, Sonnet 4)
  - Business: Sonnet 4.6, Sonnet 4.5, Haiku 4.5, Sonnet 4 (no Opus models)
  - Basic: Haiku 4.5, Sonnet 4 only
- Each template includes a tailored default system instruction:
  - Technical: encourages detailed technical explanations, code examples, debugging help
  - Business: encourages concise summaries, strategic analysis, business-friendly language
  - Basic: generic helpful assistant prompt
- All model access and system instructions are fully customizable by Org Admin after org creation
- Super Admin can view, edit, and reset templates to defaults (STPL-01/02/03)

### Audit Logging Foundation
- Log ALL admin mutations in Phase 2: org created/edited/suspended/activated/deleted/restored, user invited, invitation revoked/resent, user registered, Super Admin created/edited/deleted, role template edited/reset
- Rich context per entry: timestamp, actor (userId + name), action type, target resource (type + id), org context (if applicable), IP address, before/after snapshot for mutations
- Implementation: explicit service-layer helper function `auditLog.record()` called in each service function. Co-located with business logic, not middleware-based.
- Storage: same PostgreSQL database (AuditLog table). Transactional consistency — log and action succeed/fail together. Volume manageable at 5-20 org scale.
- Audit logs are immutable — no edit or delete operations exposed (SAFE-07)

### Safety Rules
- Cannot delete self (SAFE-01)
- Must maintain at least 1 Org Admin per org (SAFE-02)
- Org Admin cannot delete their own org (SAFE-04)
- 30-day grace period after org deletion — data recoverable (SAFE-05)
- Must maintain at least 1 Super Admin (SAFE-06, from Phase 1)

</decisions>

<specifics>
## Specific Ideas

- Invitation emails should feel like Linear or Notion invite emails — clean, professional, with clear CTA
- Org login page already shows org name + logo placeholder from Phase 1 foundation
- logoDisplayMode setting included in org creation form (PLATFORM_AND_ORG shows LLMatscale.ai logo alongside org logo, ORG_ONLY shows just the org logo)
- Auto-login after registration is the priority — invitation token already validates the email, no need for extra ceremony

</specifics>

<deferred>
## Deferred Ideas

- Production Resend domain setup (SPF/DKIM for noreply@llmatscale.ai) — configure before production deployment
- Template propagation to existing orgs — intentionally deferred; only new orgs get updates for simplicity

</deferred>

---

*Phase: 02-organization-management-and-invitations*
*Context gathered: 2026-02-26*
