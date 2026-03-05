/**
 * Conversation Visibility Service
 *
 * Provides read-only compliance access to org conversations for Org Admins.
 * Supports listing with filters, detail view, and JSON export.
 *
 * Exports:
 *   listOrgConversations(tenantDb, filters, page, pageSize)  -- Paginated, filtered list
 *   getConversationDetail(tenantDb, conversationId)           -- Full conversation with messages
 *   exportConversations(tenantDb, conversationIds)            -- Export as JSON objects
 */

import type { TenantPrismaClient } from '@/lib/tenant';

// ============================================
// Types
// ============================================

export interface ConversationListItem {
  id: string;
  title: string;
  model: string;
  userId: string;
  userName: string;
  userEmail: string;
  messageCount: number;
  lastMessageAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ConversationDetail {
  id: string;
  title: string;
  model: string;
  createdAt: Date;
  updatedAt: Date;
  user: {
    id: string;
    name: string;
    email: string;
  };
  messages: Array<{
    id: string;
    role: string;
    content: string;
    createdAt: Date;
  }>;
}

export interface ConversationExport {
  conversation: {
    id: string;
    title: string;
    model: string;
    createdAt: string;
    updatedAt: string;
  };
  user: {
    name: string;
    email: string;
  };
  messages: Array<{
    role: string;
    content: string;
    createdAt: string;
  }>;
}

export interface ConversationFilters {
  userId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  model?: string;
  search?: string;
}

export interface ConversationListResult {
  conversations: ConversationListItem[];
  total: number;
}

// ============================================
// Service Functions
// ============================================

/**
 * List org conversations with filters (paginated).
 * Uses tenantDb for automatic org scoping.
 */
export async function listOrgConversations(
  tenantDb: TenantPrismaClient,
  filters: ConversationFilters,
  page: number,
  pageSize: number
): Promise<ConversationListResult> {
  // Build where clause
  const where: Record<string, unknown> = {};

  if (filters.userId) {
    where.userId = filters.userId;
  }

  if (filters.dateFrom || filters.dateTo) {
    const dateFilter: Record<string, Date> = {};
    if (filters.dateFrom) dateFilter.gte = filters.dateFrom;
    if (filters.dateTo) dateFilter.lte = filters.dateTo;
    where.updatedAt = dateFilter;
  }

  if (filters.model) {
    where.model = filters.model;
  }

  if (filters.search) {
    where.title = { contains: filters.search, mode: 'insensitive' };
  }

  const [conversations, total] = await Promise.all([
    (tenantDb.conversation as any).findMany({
      where,
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
        _count: {
          select: { messages: true },
        },
      },
      orderBy: { updatedAt: 'desc' as const },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    (tenantDb.conversation as any).count({ where }),
  ]);

  const items: ConversationListItem[] = conversations.map(
    (c: any) => ({
      id: c.id,
      title: c.title,
      model: c.model,
      userId: c.userId,
      userName: c.user?.name ?? 'Unknown',
      userEmail: c.user?.email ?? '',
      messageCount: c._count?.messages ?? 0,
      lastMessageAt: c.lastMessageAt,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    })
  );

  return { conversations: items, total };
}

/**
 * Get full conversation detail with messages (read-only).
 * Includes all messages with role, content, createdAt.
 * NO modification endpoints (OVIS-05).
 */
export async function getConversationDetail(
  tenantDb: TenantPrismaClient,
  conversationId: string
): Promise<ConversationDetail | null> {
  const conversation = await (tenantDb.conversation as any).findFirst({
    where: { id: conversationId },
    include: {
      user: {
        select: { id: true, name: true, email: true },
      },
      messages: {
        select: {
          id: true,
          role: true,
          content: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'asc' as const },
      },
    },
  });

  if (!conversation) return null;

  return {
    id: conversation.id,
    title: conversation.title,
    model: conversation.model,
    createdAt: conversation.createdAt,
    updatedAt: conversation.updatedAt,
    user: {
      id: conversation.user.id,
      name: conversation.user.name,
      email: conversation.user.email,
    },
    messages: conversation.messages.map((m: any) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      createdAt: m.createdAt,
    })),
  };
}

/**
 * Export conversations as JSON.
 * Fetches each conversation with full messages.
 * Limited to max 100 conversations per export to prevent OOM.
 */
export async function exportConversations(
  tenantDb: TenantPrismaClient,
  conversationIds: string[]
): Promise<ConversationExport[]> {
  // Cap at 100 conversations
  const ids = conversationIds.slice(0, 100);

  const conversations = await (tenantDb.conversation as any).findMany({
    where: { id: { in: ids } },
    include: {
      user: {
        select: { name: true, email: true },
      },
      messages: {
        select: {
          role: true,
          content: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'asc' as const },
      },
    },
  });

  return conversations.map((c: any) => ({
    conversation: {
      id: c.id,
      title: c.title,
      model: c.model,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
    },
    user: {
      name: c.user?.name ?? 'Unknown',
      email: c.user?.email ?? '',
    },
    messages: c.messages.map((m: any) => ({
      role: m.role,
      content: m.content,
      createdAt: m.createdAt.toISOString(),
    })),
  }));
}
