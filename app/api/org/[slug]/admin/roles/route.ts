/**
 * Org Admin Roles API - List Roles
 *
 * GET  /api/org/[slug]/admin/roles - List all roles for the organization
 *
 * Requires Org Admin authentication.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireOrgAdmin } from '@/lib/auth-middleware';

/**
 * GET /api/org/[slug]/admin/roles
 * List all roles for the current organization with all fields
 * including allowedModels, customInstructionsEnabled, personalMcpEnabled, personalMcpMaxCount.
 */
export async function GET(req: NextRequest) {
  const authResult = await requireOrgAdmin(req);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const roles = await authResult.tenantDb.role.findMany({
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        name: true,
        description: true,
        isSystemRole: true,
        permissions: true,
        allowedModels: true,
        systemInstructions: true,
        customInstructionsEnabled: true,
        customInstructionsMaxLength: true,
        personalMcpEnabled: true,
        personalMcpMaxCount: true,
        dailyRequestLimit: true,
        dailyTokenLimit: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: { members: true },
        },
      },
    });

    return NextResponse.json(roles);
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
