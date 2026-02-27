/**
 * Tenant-scoped Prisma Client Extension factory.
 *
 * Use `tenantPrisma(orgId)` for ALL org-scoped data access.
 * Use the raw `prisma` client from `./db` ONLY for platform-level queries
 * (User, Session, Super Admin operations).
 *
 * How it works:
 * - Intercepts every Prisma query via `$allModels.$allOperations`
 * - For models in TENANT_SCOPED_MODELS, auto-injects `organizationId` into:
 *   - WHERE clauses (reads, updates, deletes)
 *   - DATA objects (creates)
 *   - Both WHERE and CREATE for upserts
 * - For non-tenant-scoped models (User, Session, PasswordResetToken), passes through unmodified
 *
 * KNOWN LIMITATION: Prisma Client Extensions `$allModels.$allOperations` do NOT
 * intercept nested operations (include, select with nested creates/updates).
 * - Nested reads via `include` are safe because FK relationships enforce org scope.
 * - For nested writes, always use separate top-level operations.
 *
 * @example
 * ```typescript
 * import { tenantPrisma } from '@/lib/tenant';
 *
 * const db = tenantPrisma(organization.id);
 *
 * // All queries automatically scoped to this org:
 * const conversations = await db.conversation.findMany({
 *   where: { userId: user.id },
 * });
 * // organizationId is auto-injected into the WHERE clause
 *
 * const newConvo = await db.conversation.create({
 *   data: { userId: user.id, title: 'Hello', model: 'claude-sonnet-4-6' },
 * });
 * // organizationId is auto-injected into the data
 * ```
 */

import prisma from './db';

/**
 * Models that have an `organizationId` field and need automatic tenant scoping.
 * Models NOT in this set (User, Session, PasswordResetToken) pass through unmodified.
 */
const TENANT_SCOPED_MODELS = new Set([
  'Conversation',
  'Message',
  'Artifact',
  'McpConnection',
  'OrgMember',
  'Role',
  'Invitation',
  'AuditLog',
  'UsageRecord',
  'OnboardingAgreement',
  'OrgSettings',
  'OrgThemeAssignment',
  'PasswordPolicy',
  'PlatformApiKey',
]);

/** Operations that read data and need WHERE filter injection. */
const READ_OPS = new Set([
  'findUnique',
  'findUniqueOrThrow',
  'findFirst',
  'findFirstOrThrow',
  'findMany',
  'count',
  'aggregate',
  'groupBy',
]);

/** Operations that write data and need WHERE/DATA injection. */
const WRITE_OPS = new Set([
  'create',
  'createMany',
  'update',
  'updateMany',
  'delete',
  'deleteMany',
  'upsert',
]);

/**
 * Creates a tenant-scoped Prisma client that auto-injects `organizationId`
 * into every query on org-scoped models.
 *
 * This is the SINGLE enforcement point for data isolation across the platform.
 *
 * @param orgId - The organization ID to scope all queries to.
 * @returns An extended Prisma client with automatic tenant scoping.
 */
export function tenantPrisma(orgId: string) {
  return prisma.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          // Non-tenant-scoped models pass through unmodified
          if (!model || !TENANT_SCOPED_MODELS.has(model)) {
            return query(args);
          }

          // Inject organizationId into WHERE for read operations
          if (READ_OPS.has(operation)) {
            args.where = {
              ...args.where,
              organizationId: orgId,
            };
          }

          // Inject organizationId into DATA for single create
          if (operation === 'create') {
            args.data = {
              ...args.data,
              organizationId: orgId,
            };
          }

          // Inject organizationId into each item for batch create
          if (operation === 'createMany') {
            if (Array.isArray(args.data)) {
              args.data = args.data.map((d: Record<string, unknown>) => ({
                ...d,
                organizationId: orgId,
              }));
            } else {
              args.data = { ...args.data, organizationId: orgId };
            }
          }

          // Inject organizationId into WHERE for update/delete operations
          if (['update', 'updateMany', 'delete', 'deleteMany'].includes(operation)) {
            args.where = {
              ...args.where,
              organizationId: orgId,
            };
          }

          // Inject organizationId into both WHERE and CREATE for upsert
          if (operation === 'upsert') {
            args.where = { ...args.where, organizationId: orgId };
            args.create = { ...args.create, organizationId: orgId };
          }

          return query(args);
        },
      },
    },
  });
}

/**
 * Type alias for the tenant-scoped Prisma client.
 * Use this when typing function parameters that accept a scoped client.
 *
 * @example
 * ```typescript
 * import { type TenantPrismaClient } from '@/lib/tenant';
 *
 * async function getConversations(db: TenantPrismaClient, userId: string) {
 *   return db.conversation.findMany({ where: { userId } });
 * }
 * ```
 */
export type TenantPrismaClient = ReturnType<typeof tenantPrisma>;
