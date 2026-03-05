/**
 * Audit Log Query Service
 *
 * Provides querying, pagination, and export capabilities for AuditLog records.
 * Uses raw prisma client (platform-level, cross-org access for Super Admin).
 *
 * Exports:
 *   listAuditLogs(filters)     — Paginated, filtered list with total count
 *   exportAuditLogs(filters, format) — Full export as CSV or JSON
 *   getAvailableActions()      — Distinct action values for filter dropdown
 *   getAuditLogUsers()         — Distinct users who appear in audit logs
 */

import prisma from '@/lib/db';
import type { AuditLogFilterInput } from '@/lib/validation';
import type { Prisma } from '@/lib/generated/prisma/client';

// ============================================
// Types
// ============================================

export interface AuditLogRow {
  id: string;
  createdAt: Date;
  action: string;
  targetType: string | null;
  targetId: string | null;
  ipAddress: string | null;
  metadata: Record<string, unknown>;
  organizationId: string | null;
  userId: string | null;
  organization: { name: string; slug: string } | null;
  user: { name: string; email: string } | null;
}

export interface AuditLogListResult {
  logs: AuditLogRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface AuditLogExportResult {
  data: string;
  contentType: string;
  filename: string;
}

export interface AuditLogUserEntry {
  userId: string;
  name: string;
  email: string;
}

// ============================================
// Helpers
// ============================================

/**
 * Build Prisma where clause from filter params.
 */
function buildWhereClause(filters: Partial<AuditLogFilterInput>): Prisma.AuditLogWhereInput {
  const where: Prisma.AuditLogWhereInput = {};

  if (filters.startDate || filters.endDate) {
    where.createdAt = {};
    if (filters.startDate) {
      (where.createdAt as Prisma.DateTimeFilter).gte = new Date(filters.startDate);
    }
    if (filters.endDate) {
      (where.createdAt as Prisma.DateTimeFilter).lte = new Date(filters.endDate);
    }
  }

  if (filters.organizationId) {
    where.organizationId = filters.organizationId;
  }

  if (filters.action) {
    where.action = { contains: filters.action, mode: 'insensitive' };
  }

  if (filters.userId) {
    where.userId = filters.userId;
  }

  return where;
}

/**
 * Escape a single CSV value.
 * Wraps in quotes if it contains commas, quotes, or newlines.
 */
function escapeCsvValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Format a Date object as a human-readable string.
 */
function formatDate(d: Date): string {
  return d.toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, ' UTC');
}

// ============================================
// Service Functions
// ============================================

/**
 * List audit logs with server-side pagination and filters.
 */
export async function listAuditLogs(filters: AuditLogFilterInput): Promise<AuditLogListResult> {
  const { page, pageSize, sortBy, sortOrder } = filters;
  const where = buildWhereClause(filters);

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: {
        organization: {
          select: { name: true, slug: true },
        },
        user: {
          select: { name: true, email: true },
        },
      },
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return {
    logs: logs as AuditLogRow[],
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

/**
 * Export audit logs matching filters as CSV or JSON.
 * Capped at 10,000 rows max for memory safety.
 */
export async function exportAuditLogs(
  filters: Omit<AuditLogFilterInput, 'page' | 'pageSize'>,
  format: 'csv' | 'json'
): Promise<AuditLogExportResult> {
  const sortBy = filters.sortBy ?? 'createdAt';
  const sortOrder = filters.sortOrder ?? 'desc';
  const where = buildWhereClause(filters);

  const logs = await prisma.auditLog.findMany({
    where,
    include: {
      organization: {
        select: { name: true, slug: true },
      },
      user: {
        select: { name: true, email: true },
      },
    },
    orderBy: { [sortBy]: sortOrder },
    take: 10000,
  }) as AuditLogRow[];

  const dateStr = new Date().toISOString().slice(0, 10);

  if (format === 'json') {
    const rows = logs.map((log) => ({
      id: log.id,
      date: log.createdAt.toISOString(),
      userName: log.user?.name ?? 'System',
      userEmail: log.user?.email ?? '',
      action: log.action,
      targetType: log.targetType ?? '',
      targetId: log.targetId ?? '',
      organization: log.organization?.name ?? 'Platform',
      ipAddress: log.ipAddress ?? '',
      metadata: log.metadata,
    }));

    return {
      data: JSON.stringify(rows, null, 2),
      contentType: 'application/json',
      filename: `audit-logs-${dateStr}.json`,
    };
  }

  // CSV format — UTF-8 BOM for Excel compatibility
  const BOM = '\uFEFF';
  const headers = [
    'Date',
    'User',
    'Email',
    'Action',
    'Target Type',
    'Target ID',
    'Organization',
    'IP Address',
    'Details',
  ];

  const rows = logs.map((log) => [
    escapeCsvValue(formatDate(log.createdAt)),
    escapeCsvValue(log.user?.name ?? 'System'),
    escapeCsvValue(log.user?.email ?? ''),
    escapeCsvValue(log.action),
    escapeCsvValue(log.targetType ?? ''),
    escapeCsvValue(log.targetId ?? ''),
    escapeCsvValue(log.organization?.name ?? 'Platform'),
    escapeCsvValue(log.ipAddress ?? ''),
    escapeCsvValue(
      log.metadata && Object.keys(log.metadata).length > 0
        ? JSON.stringify(log.metadata)
        : ''
    ),
  ]);

  const csvLines = [
    headers.map(escapeCsvValue).join(','),
    ...rows.map((row) => row.join(',')),
  ];

  return {
    data: BOM + csvLines.join('\r\n'),
    contentType: 'text/csv; charset=utf-8',
    filename: `audit-logs-${dateStr}.csv`,
  };
}

/**
 * Get distinct action values across all audit logs.
 * Used to populate the Action filter dropdown in the UI.
 */
export async function getAvailableActions(): Promise<string[]> {
  const result = await prisma.auditLog.findMany({
    select: { action: true },
    distinct: ['action'],
    orderBy: { action: 'asc' },
  });
  // Normalize action names to lowercase dot-separated format and deduplicate.
  // Handles legacy entries using UPPER_SNAKE_CASE (e.g., API_KEY_REVEALED -> api_key.revealed).
  const seen = new Set<string>();
  const actions: string[] = [];
  for (const r of result) {
    let normalized: string;
    if (r.action.includes('.')) {
      // Already dot-separated (e.g., api_key.revealed) - just lowercase
      normalized = r.action.toLowerCase();
    } else {
      // Legacy UPPER_SNAKE_CASE (e.g., API_KEY_REVEALED)
      // Convert: split into segments, find the natural category break
      // Pattern: CATEGORY_action -> category.action (e.g., API_KEY_REVEALED -> api_key.revealed)
      const lower = r.action.toLowerCase();
      const lastUnderscore = lower.lastIndexOf('_');
      normalized = lastUnderscore > 0
        ? lower.slice(0, lastUnderscore) + '.' + lower.slice(lastUnderscore + 1)
        : lower;
    }
    if (!seen.has(normalized)) {
      seen.add(normalized);
      actions.push(normalized);
    }
  }
  return actions.sort();
}

/**
 * Get distinct users who appear in audit logs (non-null userId only).
 * Used to populate the User filter dropdown in the UI.
 */
export async function getAuditLogUsers(): Promise<AuditLogUserEntry[]> {
  // Get distinct userIds from audit logs that have a user
  const logsWithUser = await prisma.auditLog.findMany({
    where: { userId: { not: null } },
    select: {
      userId: true,
      user: { select: { name: true, email: true } },
    },
    distinct: ['userId'],
    orderBy: { userId: 'asc' },
  });

  return logsWithUser
    .filter((l): l is typeof l & { userId: string; user: { name: string; email: string } } =>
      l.userId !== null && l.user !== null
    )
    .map((l) => ({
      userId: l.userId,
      name: l.user.name,
      email: l.user.email,
    }));
}
