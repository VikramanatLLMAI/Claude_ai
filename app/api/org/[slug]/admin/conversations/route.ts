/**
 * Org Admin Conversations API - List with Pagination and Filters
 *
 * GET /api/org/[slug]/admin/conversations
 *
 * Returns paginated, filtered conversation list for compliance viewing.
 * Requires conversationVisibility to be enabled in OrgSettings.
 *
 * Query params:
 *   userId    - Filter by user ID
 *   dateFrom  - ISO date string (inclusive)
 *   dateTo    - ISO date string (inclusive)
 *   model     - Filter by model ID
 *   search    - Search in conversation title
 *   page      - Page number (default: 1)
 *   pageSize  - Rows per page: 10, 25, 50 (default: 25)
 *
 * Special:
 *   ?meta=true - Returns org members and models for filter dropdowns
 *
 * Covers: OVIS-01, OVIS-02, OVIS-03
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireOrgAdmin } from '@/lib/auth-middleware';
import prisma from '@/lib/db';
import { listOrgConversations } from '@/lib/services/conversation-visibility-service';
import type { OrgMember, User } from '@/lib/generated/prisma/client';
import { checkRateLimit, RATE_LIMITS, rateLimitResponse } from '@/lib/rate-limiter';
import { validateOrigin, originDeniedResponse } from '@/lib/origin-validator';

export async function GET(req: NextRequest) {
  const auth = await requireOrgAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const { user, organization, tenantDb } = auth;

  // Rate limiting: 60 requests per minute per user (api tier)
  const rlGet = checkRateLimit(`api:${user.id}`, RATE_LIMITS.api);
  if (!rlGet.allowed) return rateLimitResponse(rlGet.retryAfterSeconds);

  try {
    // Check visibility is enabled
    const settings = await prisma.orgSettings.findUnique({
      where: { organizationId: organization.id },
      select: { conversationVisibility: true },
    });

    if (!settings?.conversationVisibility) {
      return NextResponse.json(
        { error: 'Conversation visibility is not enabled' },
        { status: 403 }
      );
    }

    const { searchParams } = req.nextUrl;

    // ?meta=true - return filter options
    if (searchParams.get('meta') === 'true') {
      const members = await prisma.orgMember.findMany({
        where: { organizationId: organization.id, status: 'ACTIVE' },
        include: { user: { select: { id: true, name: true, email: true } } },
      });

      // Get distinct models used in conversations
      // Cast required: Prisma $extends loses model types in tenantPrisma()
      const modelsRaw = await (tenantDb.conversation as typeof prisma.conversation).findMany({
        select: { model: true },
        distinct: ['model'],
        orderBy: { model: 'asc' as const },
      });

      return NextResponse.json({
        members: members.map((m: OrgMember & { user: Pick<User, 'id' | 'name' | 'email'> }) => ({
          userId: m.user.id,
          name: m.user.name,
          email: m.user.email,
        })),
        models: modelsRaw.map((m: { model: string }) => m.model),
      });
    }

    // Parse filter params
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const rawPageSize = parseInt(searchParams.get('pageSize') || '25', 10);
    const pageSize = [10, 25, 50].includes(rawPageSize) ? rawPageSize : 25;

    const filters = {
      userId: searchParams.get('userId') || undefined,
      dateFrom: searchParams.get('dateFrom') ? new Date(searchParams.get('dateFrom')!) : undefined,
      dateTo: searchParams.get('dateTo') ? new Date(searchParams.get('dateTo')!) : undefined,
      model: searchParams.get('model') || undefined,
      search: searchParams.get('search') || undefined,
    };

    const result = await listOrgConversations(tenantDb, filters, page, pageSize);

    return NextResponse.json({
      ...result,
      page,
      pageSize,
      totalPages: Math.ceil(result.total / pageSize),
    });
  } catch (error) {
    console.error('Org conversations API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
