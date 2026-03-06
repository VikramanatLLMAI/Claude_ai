# Phase 2: Organization Management and Invitations - Research

**Researched:** 2026-02-26
**Domain:** Multi-tenant org management, email invitations, RBAC service layer, audit logging
**Confidence:** HIGH

## Summary

Phase 2 builds the backend service layer for organization lifecycle management, user invitations via email, system role templates, and audit logging. The existing Phase 1 foundation provides the complete database schema (Organization, OrgMember, Role, Invitation, AuditLog models), authentication middleware (`requireSuperAdmin`, `requireOrgAuth`, `requireOrgAdmin`), tenant-scoped Prisma client, and routing infrastructure (path-based dev, subdomain-based prod). Phase 2's job is to create the API routes + service functions that exercise these models, add the invitation email flow using Resend, build the registration page for invited users, and wire up audit logging.

The core pattern is straightforward: each API route handler calls `requireSuperAdmin(req)` or `requireOrgAdmin(req)`, delegates to a service function in `lib/services/`, the service function performs business logic with Prisma transactions (for atomicity with audit logs), and returns typed results. Resend handles transactional email delivery with React Email templates for the invitation flow. The registration page at `/org/[slug]/register` is a new Next.js page that validates the invitation token, renders a form, and creates the user + org membership atomically.

**Primary recommendation:** Build a thin service layer in `lib/services/` with explicit `auditLog.record()` calls co-located with business logic (per CONTEXT.md decision), use Prisma interactive transactions for atomic operations, and integrate Resend with React Email components for the invitation email.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Invitation & Registration Flow:**
- Invitation link points to org-branded registration page: `{org-slug}.llmatscale.ai/register?token=xxx`
- Registration page shows org name + logo placeholder, email pre-filled from invitation, user sets name + password
- Invitation email: professional + warm tone. Subject: "You've been invited to [Org Name] on LLMatscale.ai". Body includes org name, inviter's name, role being assigned, clear CTA button. Style reference: Linear/Notion invite emails.
- Expired/revoked invitation links show a friendly error page: "This invitation has expired" or "This invitation was revoked" with suggestion to contact org admin. No org detail leakage beyond what's in the URL.
- After registration, user is automatically logged in and redirected to the org's chat UI. Zero friction -- invitation token already proves email validity.
- Invitation expiry: 7 days. Org Admin can resend expired invitations.
- Resend integration: sandbox/test mode first. Production domain (SPF/DKIM) configured later.

**Invitation Conflict Rules (Project-Wide):**
- One user = one organization -- this is a project-wide rule, not Phase 2 specific
- Multiple orgs CAN send invitations to the same email address (no uniqueness check at invite-send time)
- Registration/acceptance enforces email uniqueness -- if email is already registered, acceptance is blocked with "This email is already registered in another organization"
- To switch a user between orgs: delete user from current org first, then re-invite to new org
- Super Admins are platform-level accounts with no org context -- separate from org users

**Org Lifecycle & Status:**
- Org suspension takes effect immediately -- all active sessions for that org are invalidated instantly. Users see "Your organization has been suspended" on next request.
- Deleted orgs remain visible in the org list with a "Pending Deletion" badge showing days remaining + a "Restore" button. No separate trash view.
- Org creation is a combined flow: name, slug, logo upload (optional), logoDisplayMode toggle, and initial Org Admin email -- all in one form. Invitation sent immediately on creation.
- New orgs start with sensible defaults: all 3 system role templates active, default role = Basic, conversation visibility off, all assigned models available. Super Admin can adjust later.

**System Role Templates:**
- 3 platform-level templates maintained by Super Admin: Technical, Business, Basic
- Templates are blueprints -- copied into each new org on creation. Org Admin then owns and customizes the copies.
- Template edits by Super Admin only affect newly created orgs. Existing orgs keep their current versions (no propagation).
- Tiered model access defaults:
  - Technical: all 7 models
  - Business: Sonnet 4.6, Sonnet 4.5, Haiku 4.5, Sonnet 4 (no Opus models)
  - Basic: Haiku 4.5, Sonnet 4 only
- Each template includes a tailored default system instruction
- All model access and system instructions are fully customizable by Org Admin after org creation

**Audit Logging Foundation:**
- Log ALL admin mutations in Phase 2
- Rich context per entry: timestamp, actor, action type, target resource, org context, IP address, before/after snapshot
- Implementation: explicit `auditLog.record()` called in each service function. Co-located with business logic, not middleware-based.
- Storage: same PostgreSQL database (AuditLog table). Transactional consistency -- log and action succeed/fail together.
- Audit logs are immutable -- no edit or delete operations exposed

**Safety Rules:**
- Cannot delete self (SAFE-01)
- Must maintain at least 1 Org Admin per org (SAFE-02)
- Org Admin cannot delete their own org (SAFE-04)
- 30-day grace period after org deletion (SAFE-05)
- Must maintain at least 1 Super Admin (SAFE-06, from Phase 1)

### Claude's Discretion
No explicit discretion areas noted in CONTEXT.md. All major decisions are locked.

### Deferred Ideas (OUT OF SCOPE)
- Production Resend domain setup (SPF/DKIM for noreply@llmatscale.ai) -- configure before production deployment
- Template propagation to existing orgs -- intentionally deferred; only new orgs get updates for simplicity
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| SORG-01 | Super Admin can create new organizations with name, slug, and initial settings | Service layer pattern + Prisma transaction for atomic org creation (org + roles + settings + invitation) |
| SORG-02 | Super Admin can edit organization details | PATCH API route with Zod validation + audit logging |
| SORG-03 | Super Admin can suspend an organization (disables all users in that org) | Session invalidation pattern (delete org sessions on suspend) |
| SORG-04 | Super Admin can activate a suspended organization | Status update + audit log |
| SORG-05 | Super Admin can delete an organization (30-day grace period) | Soft delete via `deletedAt` timestamp, already in schema |
| SORG-06 | Super Admin can view all organizations with stats | Prisma aggregation queries (user count, status) |
| SORG-07 | Super Admin can upload or update org logo (Base64) | File upload handling, Base64 conversion, size validation |
| SUSR-01 | Super Admin can create other Super Admins | User creation + `isSuperAdmin: true` flag |
| SUSR-02 | Super Admin can assign Org Admins to specific organizations | Create OrgMember with admin role + send invitation |
| SUSR-03 | Super Admin can edit Super Admin details | User update with audit log |
| SUSR-04 | Super Admin can delete Super Admins (safety: cannot delete self, must have 1 remaining) | `ensureMinimumSuperAdmins()` already exists in auth-middleware.ts |
| STPL-01 | Super Admin can view default system role templates | Templates stored as JSON config, API to read |
| STPL-02 | Super Admin can edit default templates that apply platform-wide | Template CRUD with audit logging |
| STPL-03 | Super Admin can reset any template back to default | Reset to hardcoded defaults |
| OUSR-01 | Org Admin can invite users to the org via email (Resend API) | Resend SDK + React Email template + invitation token generation |
| OUSR-09 | Org Admin can resend or revoke pending invitations | Invitation status management + re-send email |
| ODEF-01 | Org Admin can set default role for new invitations | OrgSettings.defaultRoleId update |
| ODEF-02 | If default role deleted, field clears automatically | Cascade logic in role deletion service |
| UATH-01 | User can register via invitation acceptance flow | Registration page + token validation + user creation |
| UATH-02 | Name required at registration | Zod validation schema enforcement |
| UATH-03 | Initial-based avatar auto-generated from name | String manipulation utility for initials |
| UATH-04 | User subject to org password policy on registration | PasswordPolicy lookup during registration validation |
| SAFE-01 | No user can demote, suspend, or delete themselves | Service layer check: `if (actorId === targetId) throw` |
| SAFE-02 | Must always have at least 1 Org Admin per org | Count query before admin demotion/deletion |
| SAFE-04 | Org Admin cannot delete their own org | Route-level check in delete handler |
| SAFE-05 | 30-day grace period after org deletion | Soft delete pattern (set `deletedAt`, don't hard delete) |
</phase_requirements>

## Standard Stack

### Core (Already in Project)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 16.1.4 | App Router API routes | Already the project framework |
| Prisma | 7.4.1 | Database ORM, transactions | Already configured with PostgreSQL adapter |
| Zod | 4.3.6 | Request validation | Already used for all API input validation |
| TypeScript | 5.x | Type safety | Project language |

### New Dependencies
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| resend | ^6.9.2 | Transactional email delivery | Official Resend Node.js SDK; TypeScript-native; React Email support; sandbox mode for dev |
| @react-email/components | ^1.0.8 | Email template components | Official React Email component library; tested across email clients; works with Resend `react` param |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Resend | Nodemailer + SMTP | Resend is locked decision; simpler API, React Email integration, managed deliverability |
| @react-email/components | Raw HTML strings | React Email ensures cross-client compatibility (Gmail, Outlook, Apple Mail); component-based is maintainable |

**Installation:**
```bash
npm install resend @react-email/components
```

## Architecture Patterns

### Recommended Project Structure
```
lib/
├── services/                     # NEW: Service layer (business logic)
│   ├── org-service.ts           # Org CRUD, suspend, activate, delete, restore
│   ├── super-admin-service.ts   # Super Admin CRUD
│   ├── invitation-service.ts    # Invite, accept, revoke, resend
│   ├── role-template-service.ts # System role template management
│   └── audit-service.ts        # auditLog.record() helper
├── email/                        # NEW: Email infrastructure
│   ├── resend.ts                # Resend client singleton
│   └── templates/               # React Email templates
│       └── invitation-email.tsx # Invitation email template
├── constants/                    # NEW: Shared constants
│   └── role-templates.ts        # Default role template definitions
app/
├── api/
│   ├── admin/                    # NEW: Super Admin API routes
│   │   ├── organizations/
│   │   │   ├── route.ts         # GET list, POST create
│   │   │   └── [id]/
│   │   │       ├── route.ts     # GET, PATCH, DELETE single org
│   │   │       ├── suspend/route.ts
│   │   │       ├── activate/route.ts
│   │   │       ├── restore/route.ts
│   │   │       └── logo/route.ts # PATCH upload logo
│   │   ├── super-admins/
│   │   │   ├── route.ts         # GET list, POST create
│   │   │   └── [id]/route.ts   # GET, PATCH, DELETE
│   │   └── role-templates/
│   │       ├── route.ts         # GET list
│   │       └── [id]/route.ts   # GET, PATCH (edit), POST reset
│   ├── org/                      # NEW: Org Admin API routes (org-scoped)
│   │   └── invitations/
│   │       ├── route.ts         # GET list, POST create (send invite)
│   │       └── [id]/
│   │           ├── revoke/route.ts
│   │           └── resend/route.ts
│   └── auth/
│       └── accept-invitation/route.ts  # POST: validate token + register user
├── org/[slug]/
│   └── register/
│       └── page.tsx             # NEW: Invitation acceptance / registration page
```

### Pattern 1: Service Layer with Audit Logging
**What:** Each service function encapsulates business logic, safety checks, and audit logging in a Prisma interactive transaction.
**When to use:** Every mutation that requires audit logging (which is every admin mutation in Phase 2).
**Example:**
```typescript
// lib/services/org-service.ts
import prisma from '@/lib/db';
import { auditLog } from './audit-service';

export async function suspendOrganization(
  orgId: string,
  actorId: string,
  ipAddress: string | null
) {
  return prisma.$transaction(async (tx) => {
    // 1. Load current state for before/after snapshot
    const org = await tx.organization.findUniqueOrThrow({
      where: { id: orgId },
    });

    if (org.status === 'SUSPENDED') {
      throw new Error('Organization is already suspended');
    }

    // 2. Update org status
    const updated = await tx.organization.update({
      where: { id: orgId },
      data: { status: 'SUSPENDED' },
    });

    // 3. Invalidate all sessions for this org
    await tx.session.deleteMany({
      where: { organizationId: orgId },
    });

    // 4. Audit log (same transaction)
    await auditLog.record(tx, {
      userId: actorId,
      action: 'org.suspended',
      targetType: 'Organization',
      targetId: orgId,
      organizationId: orgId,
      ipAddress,
      metadata: {
        before: { status: org.status },
        after: { status: 'SUSPENDED' },
      },
    });

    return updated;
  });
}
```

### Pattern 2: Audit Log Helper
**What:** A thin wrapper that creates AuditLog records with consistent shape.
**When to use:** Called from within every service function's transaction.
**Example:**
```typescript
// lib/services/audit-service.ts
interface AuditLogEntry {
  userId: string | null;
  action: string;
  targetType?: string;
  targetId?: string;
  organizationId?: string | null;
  ipAddress?: string | null;
  metadata?: Record<string, unknown>;
}

export const auditLog = {
  /**
   * Record an audit log entry within a transaction context.
   * Must be called with the transaction client (tx), not the global prisma.
   */
  async record(tx: PrismaTransactionClient, entry: AuditLogEntry) {
    return tx.auditLog.create({
      data: {
        userId: entry.userId,
        action: entry.action,
        targetType: entry.targetType || null,
        targetId: entry.targetId || null,
        organizationId: entry.organizationId || null,
        ipAddress: entry.ipAddress || null,
        metadata: entry.metadata || {},
      },
    });
  },
};
```

### Pattern 3: API Route Handler Delegation
**What:** Route handlers authenticate, parse input, delegate to service, return response. No business logic in routes.
**When to use:** All Phase 2 API routes.
**Example:**
```typescript
// app/api/admin/organizations/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth-middleware';
import { createOrganization, listOrganizations } from '@/lib/services/org-service';
import { validate, CreateOrgSchema } from '@/lib/validation';

export async function POST(req: NextRequest) {
  const auth = await requireSuperAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const body = await req.json();
  const result = validate(CreateOrgSchema, body);
  if (!result.success) {
    return NextResponse.json(
      { error: formatValidationErrors(result.errors!) },
      { status: 400 }
    );
  }

  const ipAddress = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null;

  try {
    const org = await createOrganization(result.data!, auth.user.id, ipAddress);
    return NextResponse.json(org, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message.includes('already exists')) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    console.error('Create org error:', error);
    return NextResponse.json({ error: 'Failed to create organization' }, { status: 500 });
  }
}
```

### Pattern 4: Resend Email Integration
**What:** Singleton Resend client with React Email templates.
**When to use:** Sending invitation emails and any future transactional emails.
**Example:**
```typescript
// lib/email/resend.ts
import { Resend } from 'resend';

// Singleton Resend client
const globalForResend = globalThis as unknown as {
  resend: Resend | undefined;
};

export const resend = globalForResend.resend ?? new Resend(process.env.RESEND_API_KEY);

if (process.env.NODE_ENV !== 'production') {
  globalForResend.resend = resend;
}
```

```typescript
// lib/email/templates/invitation-email.tsx
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components';

interface InvitationEmailProps {
  orgName: string;
  inviterName: string;
  roleName: string;
  acceptUrl: string;
  expiresInDays: number;
}

export function InvitationEmail({
  orgName,
  inviterName,
  roleName,
  acceptUrl,
  expiresInDays,
}: InvitationEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>{inviterName} invited you to join {orgName} on LLMatscale.ai</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Join {orgName} on LLMatscale.ai</Heading>
          <Text style={text}>
            {inviterName} has invited you to join <strong>{orgName}</strong> as a{' '}
            <strong>{roleName}</strong>.
          </Text>
          <Section style={buttonContainer}>
            <Button style={button} href={acceptUrl}>
              Accept Invitation
            </Button>
          </Section>
          <Text style={smallText}>
            This invitation expires in {expiresInDays} days. If you did not expect
            this invitation, you can safely ignore this email.
          </Text>
          <Hr style={hr} />
          <Text style={footer}>LLMatscale.ai - AI Chat Platform</Text>
        </Container>
      </Body>
    </Html>
  );
}
```

### Pattern 5: System Role Template Defaults (Hardcoded Constants)
**What:** Default role templates stored as TypeScript constants, copied into orgs on creation.
**When to use:** Org creation and template reset.
**Example:**
```typescript
// lib/constants/role-templates.ts
export interface RoleTemplate {
  name: string;
  description: string;
  isSystemRole: true;
  allowedModels: string[];
  permissions: string[];
  systemInstructions: string;
  customInstructionsEnabled: boolean;
  customInstructionsMaxLength: number;
  dailyRequestLimit: number | null;
  dailyTokenLimit: number | null;
}

export const DEFAULT_ROLE_TEMPLATES: RoleTemplate[] = [
  {
    name: 'Technical',
    description: 'Full access for technical users - all models and tools',
    isSystemRole: true,
    allowedModels: [
      'claude-opus-4-6', 'claude-sonnet-4-6', 'claude-sonnet-4-5-20250929',
      'claude-haiku-4-5-20251001', 'claude-opus-4-5-20251101',
      'claude-opus-4-20250514', 'claude-sonnet-4-20250514',
    ],
    permissions: ['chat', 'mcp', 'artifacts', 'file_upload', 'web_search'],
    systemInstructions: 'You are a helpful technical assistant...',
    customInstructionsEnabled: true,
    customInstructionsMaxLength: 1000,
    dailyRequestLimit: null,
    dailyTokenLimit: null,
  },
  {
    name: 'Business',
    description: 'Business-focused access with balanced model selection',
    isSystemRole: true,
    allowedModels: [
      'claude-sonnet-4-6', 'claude-sonnet-4-5-20250929',
      'claude-haiku-4-5-20251001', 'claude-sonnet-4-20250514',
    ],
    permissions: ['chat', 'artifacts', 'file_upload'],
    systemInstructions: 'You are a helpful business assistant...',
    customInstructionsEnabled: true,
    customInstructionsMaxLength: 1000,
    dailyRequestLimit: null,
    dailyTokenLimit: null,
  },
  {
    name: 'Basic',
    description: 'Essential chat access with cost-efficient models',
    isSystemRole: true,
    allowedModels: ['claude-haiku-4-5-20251001', 'claude-sonnet-4-20250514'],
    permissions: ['chat'],
    systemInstructions: 'You are a helpful assistant...',
    customInstructionsEnabled: true,
    customInstructionsMaxLength: 500,
    dailyRequestLimit: 50,
    dailyTokenLimit: 100000,
  },
];
```

### Pattern 6: Atomic Org Creation
**What:** Create org + 3 system roles + OrgSettings + PasswordPolicy + invitation in a single transaction.
**When to use:** SORG-01 -- creating a new organization.
**Example:**
```typescript
// Inside org-service.ts createOrganization()
return prisma.$transaction(async (tx) => {
  // 1. Create organization
  const org = await tx.organization.create({
    data: { name, slug, logoBase64, logoDisplayMode },
  });

  // 2. Create 3 system roles from templates
  const roles = [];
  for (const template of DEFAULT_ROLE_TEMPLATES) {
    const role = await tx.role.create({
      data: {
        organizationId: org.id,
        name: template.name,
        description: template.description,
        isSystemRole: true,
        allowedModels: template.allowedModels,
        permissions: template.permissions,
        systemInstructions: template.systemInstructions,
        customInstructionsEnabled: template.customInstructionsEnabled,
        customInstructionsMaxLength: template.customInstructionsMaxLength,
        dailyRequestLimit: template.dailyRequestLimit,
        dailyTokenLimit: template.dailyTokenLimit,
      },
    });
    roles.push(role);
  }

  // 3. Create OrgSettings with Basic as default role
  const basicRole = roles.find(r => r.name === 'Basic')!;
  await tx.orgSettings.create({
    data: {
      organizationId: org.id,
      defaultRoleId: basicRole.id,
      conversationVisibility: false,
    },
  });

  // 4. Create PasswordPolicy with defaults
  await tx.passwordPolicy.create({
    data: { organizationId: org.id },
  });

  // 5. Create + send invitation for initial Org Admin (if email provided)
  // ... invitation creation logic ...

  // 6. Audit log
  await auditLog.record(tx, { /* ... */ });

  return org;
});
```

### Anti-Patterns to Avoid
- **Business logic in route handlers:** Route handlers should only authenticate, validate, delegate, and format responses. All business logic belongs in `lib/services/`.
- **Audit logging outside transactions:** If the audit log is not in the same transaction as the action, you can end up with phantom logs (action failed but log succeeded) or missing logs (action succeeded but log failed).
- **Middleware-based audit logging:** The CONTEXT.md explicitly says co-located with business logic, not middleware-based. Do not use Prisma middleware or Next.js middleware for audit logging.
- **Checking org suspension in route handlers:** The existing `requireOrgAuth()` middleware already checks `organization.status === 'ACTIVE'`. Don't duplicate this check.
- **Direct email content in service functions:** Keep email template rendering in the email layer, not in service functions. Services should call a `sendInvitationEmail()` function that handles template rendering internally.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Email delivery | Custom SMTP client | `resend` npm package | Deliverability, SPF/DKIM management, bounce handling, test mode |
| Email templates | Raw HTML strings | `@react-email/components` | Cross-client compatibility (Gmail, Outlook, Apple Mail), responsive, maintainable |
| Invitation tokens | Custom token format | `crypto.randomBytes(32).toString('hex')` | Already exists as `generateToken()` in `lib/encryption.ts`; cryptographically secure |
| Slug generation | Custom regex | Manual validation + slugify | Org slugs need: lowercase, alphanumeric + hyphens, no leading/trailing hyphens, unique check |
| Session invalidation | Custom cache | `prisma.session.deleteMany({ where: { organizationId } })` | Direct DB delete is simplest; sessions checked on every request anyway |
| Password hashing | Custom hashing | `hashPassword()` / `verifyPassword()` from `lib/encryption.ts` | Scrypt with timing-safe comparison already implemented |
| Avatar initials | Complex parsing | Simple string split on name | "John Doe" -> "JD", "Alice" -> "A"; store in `avatarBase64` as null initially (just use initials in UI) |

**Key insight:** The Phase 1 foundation already provides most security-critical utilities (token generation, password hashing, session management, auth middleware). Phase 2 primarily needs to wire these together with business logic and add email delivery.

## Common Pitfalls

### Pitfall 1: Org Suspension Without Session Invalidation
**What goes wrong:** Suspending an org but leaving active sessions alive. Users can continue to make API calls until their session expires naturally.
**Why it happens:** Forgetting that suspension must be immediate, not eventual.
**How to avoid:** Delete all sessions for the org in the same transaction as the status change: `tx.session.deleteMany({ where: { organizationId } })`.
**Warning signs:** Suspended org users can still access chat.

### Pitfall 2: Non-Atomic Org Creation
**What goes wrong:** Org is created but role creation or invitation fails, leaving a partially-initialized org.
**Why it happens:** Not wrapping the entire creation flow in a Prisma `$transaction()`.
**How to avoid:** Use `prisma.$transaction(async (tx) => { ... })` for the entire org creation flow (org + roles + settings + password policy + invitation + audit log).
**Warning signs:** Orgs with missing roles, settings, or invitations in the database.

### Pitfall 3: Invitation Token Reuse After Acceptance
**What goes wrong:** An already-accepted invitation token can be used again to create a second account.
**Why it happens:** Not checking invitation status before processing acceptance.
**How to avoid:** In the acceptance flow, check `status === 'PENDING'` AND `expiresAt > now()` before proceeding. Update status to `ACCEPTED` atomically with user creation.
**Warning signs:** Multiple users created from the same invitation.

### Pitfall 4: Email Uniqueness Race Condition
**What goes wrong:** Two simultaneous registrations with the same email both pass the uniqueness check.
**Why it happens:** TOCTOU (time-of-check-time-of-use) gap between checking and creating.
**How to avoid:** Rely on the database unique constraint on `User.email`. Catch the Prisma unique constraint violation error (`P2002`) and return a friendly message.
**Warning signs:** Database constraint errors in logs instead of graceful 409 responses.

### Pitfall 5: Resend Sandbox Domain Limitations
**What goes wrong:** Emails sent from `onboarding@resend.dev` only deliver to the verified email address on the Resend account.
**Why it happens:** Sandbox mode restricts recipients for abuse prevention.
**How to avoid:** During development, use `onboarding@resend.dev` as sender and test with the account's verified email. In production, configure a custom domain. Make the `FROM` address configurable via env var (`RESEND_FROM_EMAIL`).
**Warning signs:** Invitation emails not arriving for test users outside the Resend account.

### Pitfall 6: Audit Log Before/After Snapshots
**What goes wrong:** Logging the wrong "before" state because the entity was already modified.
**Why it happens:** Reading the entity after the update instead of before.
**How to avoid:** Always read the current state FIRST (before any mutation), store it, then perform the mutation, then log with both states.
**Warning signs:** Before and after snapshots are identical in audit logs.

### Pitfall 7: Slug Uniqueness with Soft Deletes
**What goes wrong:** Creating an org with a slug that belongs to a soft-deleted org, violating the partial unique index.
**Why it happens:** The schema has `@@unique([slug], where: { deletedAt: null })` -- this only prevents duplicate slugs among active orgs. A new org CAN use the same slug as a deleted org.
**How to avoid:** The partial unique index already handles this correctly. Just handle the Prisma unique constraint error (`P2002`) gracefully if a slug collision occurs with another active org.
**Warning signs:** Unexpected 500 errors when creating orgs with previously-used slugs.

### Pitfall 8: Org Admin Count Safety Check
**What goes wrong:** Removing the last Org Admin from an org, leaving no one with admin access.
**Why it happens:** Not counting remaining admins before role changes or deletions.
**How to avoid:** Before any operation that could reduce admin count (role change, member deletion, member suspension), check: `SELECT COUNT(*) FROM org_members WHERE organizationId = ? AND role.name = 'Org Admin' AND status = 'ACTIVE'`. Must be > 1 to proceed.
**Warning signs:** Orgs with zero Org Admins and no way to manage them.

## Code Examples

### Invitation Acceptance Flow (Registration)
```typescript
// app/api/auth/accept-invitation/route.ts
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { token, name, password } = body;

  // 1. Find and validate invitation
  const invitation = await prisma.invitation.findUnique({
    where: { token },
    include: { organization: true, role: true },
  });

  if (!invitation || invitation.status !== 'PENDING') {
    return NextResponse.json(
      { error: 'Invalid or expired invitation' },
      { status: 400 }
    );
  }

  if (invitation.expiresAt < new Date()) {
    // Mark as expired
    await prisma.invitation.update({
      where: { id: invitation.id },
      data: { status: 'EXPIRED' },
    });
    return NextResponse.json(
      { error: 'This invitation has expired' },
      { status: 400 }
    );
  }

  // 2. Check org is active
  if (invitation.organization.status !== 'ACTIVE' || invitation.organization.deletedAt) {
    return NextResponse.json(
      { error: 'Organization is no longer available' },
      { status: 400 }
    );
  }

  // 3. Check email not already registered
  const existingUser = await prisma.user.findUnique({
    where: { email: invitation.email },
  });

  if (existingUser) {
    return NextResponse.json(
      { error: 'This email is already registered in another organization' },
      { status: 409 }
    );
  }

  // 4. Validate password against org policy
  const policy = await prisma.passwordPolicy.findUnique({
    where: { organizationId: invitation.organizationId },
  });
  // ... validate password against policy ...

  // 5. Atomic: create user + org member + update invitation + create session
  const passwordHash = await hashPassword(password);
  const sessionToken = generateToken();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email: invitation.email,
        passwordHash,
        name,
        // avatarBase64 left null -- UI renders initials from name
      },
    });

    await tx.orgMember.create({
      data: {
        userId: user.id,
        organizationId: invitation.organizationId,
        roleId: invitation.roleId,
        status: 'ACTIVE',
      },
    });

    await tx.invitation.update({
      where: { id: invitation.id },
      data: { status: 'ACCEPTED', acceptedAt: new Date() },
    });

    const session = await tx.session.create({
      data: {
        userId: user.id,
        token: sessionToken,
        organizationId: invitation.organizationId,
        expiresAt,
      },
    });

    // Audit log
    await tx.auditLog.create({
      data: {
        userId: user.id,
        organizationId: invitation.organizationId,
        action: 'user.registered',
        targetType: 'User',
        targetId: user.id,
        metadata: { invitationId: invitation.id, roleName: invitation.role.name },
      },
    });

    return { user, session };
  });

  return NextResponse.json({
    user: { id: result.user.id, email: result.user.email, name: result.user.name },
    token: sessionToken,
    expiresAt: expiresAt.toISOString(),
    organization: {
      id: invitation.organization.id,
      name: invitation.organization.name,
      slug: invitation.organization.slug,
    },
  }, { status: 201 });
}
```

### Sending Invitation Email
```typescript
// lib/services/invitation-service.ts
import { resend } from '@/lib/email/resend';
import { InvitationEmail } from '@/lib/email/templates/invitation-email';

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'LLMatscale.ai <onboarding@resend.dev>';
const ROOT_DOMAIN = process.env.ROOT_DOMAIN || 'llmatscale.ai';

export async function sendInvitationEmail(params: {
  recipientEmail: string;
  orgName: string;
  orgSlug: string;
  inviterName: string;
  roleName: string;
  token: string;
}) {
  const isDev = process.env.NODE_ENV === 'development';
  const baseUrl = isDev
    ? `http://localhost:3000/org/${params.orgSlug}`
    : `https://${params.orgSlug}.${ROOT_DOMAIN}`;

  const acceptUrl = `${baseUrl}/register?token=${params.token}`;

  const { data, error } = await resend.emails.send({
    from: FROM_EMAIL,
    to: [params.recipientEmail],
    subject: `You've been invited to ${params.orgName} on LLMatscale.ai`,
    react: InvitationEmail({
      orgName: params.orgName,
      inviterName: params.inviterName,
      roleName: params.roleName,
      acceptUrl,
      expiresInDays: 7,
    }),
  });

  if (error) {
    console.error('Failed to send invitation email:', error);
    throw new Error(`Failed to send invitation email: ${error.message}`);
  }

  return data;
}
```

### Password Policy Validation
```typescript
// lib/services/password-validation.ts
import type { PasswordPolicy } from '@/lib/generated/prisma/client';

export function validatePasswordAgainstPolicy(
  password: string,
  policy: PasswordPolicy | null
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Default minimum length if no policy
  const minLength = policy?.minLength ?? 8;

  if (password.length < minLength) {
    errors.push(`Password must be at least ${minLength} characters`);
  }

  if (policy?.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (policy?.requireLowercase && !/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (policy?.requireNumbers && !/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  if (policy?.requireSpecialChars && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  return { valid: errors.length === 0, errors };
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Middleware-based audit logging | Explicit service-layer audit calls | Project decision | Each audit call is co-located with business logic for clarity |
| Prisma middleware for auto-logging | `$transaction` with explicit audit creates | Project decision | Better control over what gets logged and when |
| Nodemailer + SMTP for emails | Resend SDK with React Email | 2023+ | Simpler API, better deliverability management, React component templates |
| HTML email strings | @react-email/components | React Email 3.0+ (2024) | Cross-client compatible, component-based, testable |

**Deprecated/outdated:**
- Direct registration (`/api/auth/register`): Already disabled in Phase 1, returns 403. Users must register via invitation flow.
- User-level API keys: Replaced by PlatformApiKey model (platform-level, assigned to orgs).

## Open Questions

1. **System Role Template Storage Location**
   - What we know: Templates are platform-level blueprints that Super Admin can view/edit/reset. They are copied into orgs on creation.
   - What's unclear: Should templates be stored in a dedicated database table (e.g., `SystemRoleTemplate`) or as hardcoded TypeScript constants with a database override?
   - Recommendation: Use hardcoded TypeScript constants as defaults (in `lib/constants/role-templates.ts`) with a `SystemRoleTemplate` concept stored as rows in a new simple table or as a JSON config in a `PlatformSettings` table. However, since the schema is already defined and has no `SystemRoleTemplate` model, and the CONTEXT.md says "3 platform-level templates maintained by Super Admin", the pragmatic approach is to store templates as a JSON blob in a lightweight storage mechanism. **Simplest: use a JSON file or hardcoded defaults with API to override in a `platform_settings` key-value table.** Since we should not modify the schema (it's locked from Phase 1), store templates as hardcoded defaults that can be overridden via a simple key-value approach in the existing AuditLog metadata or a new small table. **Final recommendation:** Add a `PlatformSetting` model to the schema (simple key-value: `key String @unique`, `value Json`) or store templates only as hardcoded defaults that Super Admin can "edit" by viewing/modifying the constants through the API (which persists to a file or config). Given Phase 1 used `db:push` and schema changes are acceptable, the cleanest approach is adding a `SystemRoleTemplate` table with 3 rows.

2. **Resend Test Mode Behavior in Development**
   - What we know: Sandbox mode uses `onboarding@resend.dev` as sender, only delivers to the verified email on the Resend account.
   - What's unclear: Whether we should skip actual email sending in dev (log to console instead) or always send via Resend sandbox.
   - Recommendation: Make it configurable via `RESEND_API_KEY` env var. If not set, log email content to console (useful for local dev without a Resend account). If set, send via Resend (useful for integration testing).

3. **Invitation Expiry Check: Where to Enforce**
   - What we know: Invitations expire after 7 days. Expired invitations show a friendly error.
   - What's unclear: Should we mark expired invitations as `EXPIRED` lazily (check on access) or via a scheduled job?
   - Recommendation: Lazy check -- on access, check `expiresAt > now()`. If expired and status is still `PENDING`, update to `EXPIRED`. No cron job needed for Phase 2 (CRON-02 is deferred to Phase 7).

## Sources

### Primary (HIGH confidence)
- Project codebase: `prisma/schema.prisma` -- Complete database schema with all models
- Project codebase: `lib/auth-middleware.ts` -- All auth middleware patterns (requireSuperAdmin, requireOrgAuth, requireOrgAdmin)
- Project codebase: `lib/tenant.ts` -- Tenant-scoped Prisma client factory
- Project codebase: `lib/encryption.ts` -- Password hashing, token generation, AES-256 encryption
- Project codebase: `lib/validation.ts` -- Zod validation patterns
- Project codebase: `prisma/seed.ts` -- Existing role creation patterns and defaults
- Project codebase: `app/api/auth/login/route.ts` -- Session creation pattern with org context
- Project codebase: `lib/resolve-org.ts` -- Org slug resolution (dev path-based, prod subdomain-based)
- [Resend Node.js SDK GitHub](https://github.com/resend/resend-node) -- v6.9.2, TypeScript, React Email support
- [Resend API Reference](https://resend.com/docs/api-reference/emails/send-email) -- Send email API parameters

### Secondary (MEDIUM confidence)
- [Resend Send with Next.js Guide](https://resend.com/docs/send-with-nextjs) -- Official integration guide
- [React Email](https://react.email) -- Component library for email templates, v1.0.8
- [Prisma Transactions Documentation](https://www.prisma.io/docs/orm/prisma-client/queries/transactions) -- Interactive transaction API

### Tertiary (LOW confidence)
- Resend free tier limits (3,000 emails/month) -- from search results, not directly verified against current pricing page
- @react-email/components v1.0.8 -- version from npm search, needs verification at install time

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- Project already uses all core dependencies; only Resend and React Email are new (well-documented)
- Architecture: HIGH -- Service layer pattern follows existing codebase conventions; audit logging approach explicitly defined in CONTEXT.md
- Pitfalls: HIGH -- Based on direct codebase analysis (schema, auth middleware, session model) and well-known multi-tenant patterns

**Research date:** 2026-02-26
**Valid until:** 2026-03-26 (30 days -- stable domain, no fast-moving dependencies)
