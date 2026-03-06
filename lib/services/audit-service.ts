/**
 * Audit Log Service
 *
 * Provides a thin wrapper for creating AuditLog records within Prisma transactions.
 * All admin mutations in Phase 2+ call auditLog.record() within their transaction
 * to ensure atomicity -- the audit log entry and the business action succeed or fail together.
 */

import { NextRequest } from 'next/server';
import type { PrismaClient } from '@/lib/generated/prisma/client';

/**
 * Prisma interactive transaction client type.
 * This is the `tx` parameter passed inside prisma.$transaction(async (tx) => { ... }).
 * Omits lifecycle and meta methods that are not available inside a transaction.
 */
export type PrismaTransactionClient = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

/**
 * Shape of an audit log entry to be recorded.
 */
export interface AuditLogEntry {
  userId: string | null;
  action: string; // e.g., "org.created", "org.suspended", "user.invited"
  targetType?: string; // e.g., "Organization", "User", "Invitation"
  targetId?: string;
  organizationId?: string | null;
  ipAddress?: string | null;
  metadata?: Record<string, unknown>;
}

/**
 * Audit log helper object.
 * Usage: await auditLog.record(tx, { userId, action, ... })
 */
export const auditLog = {
  /**
   * Record an audit log entry within a Prisma transaction.
   *
   * @param tx - Prisma transaction client (from prisma.$transaction callback)
   * @param entry - Audit log entry data
   */
  async record(tx: PrismaTransactionClient, entry: AuditLogEntry) {
    await tx.auditLog.create({
      data: {
        userId: entry.userId,
        action: entry.action,
        targetType: entry.targetType ?? null,
        targetId: entry.targetId ?? null,
        organizationId: entry.organizationId ?? null,
        ipAddress: entry.ipAddress ?? null,
        metadata: (entry.metadata ?? {}) as any,
      },
    });
  },
};

/**
 * Extract client IP address from a Next.js request.
 * Reads the x-forwarded-for header (first entry, trimmed) or returns null.
 */
export function getIpAddress(req: NextRequest): string | null {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0].trim();
    return first || null;
  }
  return null;
}
