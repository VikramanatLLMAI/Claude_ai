/**
 * Super Admin Role Template API - List
 *
 * GET /api/admin/role-templates - List all system role templates
 *
 * Requires Super Admin authentication.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth-middleware';
import { getTemplates } from '@/lib/services/role-template-service';

/**
 * GET /api/admin/role-templates
 * List all system role templates (defaults merged with any overrides).
 */
export async function GET(req: NextRequest) {
  const authResult = await requireSuperAdmin(req);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const templates = await getTemplates();
    return NextResponse.json(templates);
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
