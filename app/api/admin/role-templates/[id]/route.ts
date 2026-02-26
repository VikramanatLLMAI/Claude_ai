/**
 * Super Admin Role Template API - Single Template
 *
 * GET   /api/admin/role-templates/[id] - Get a template by name
 * PATCH /api/admin/role-templates/[id] - Update a template (store override)
 * POST  /api/admin/role-templates/[id] - Reset a template to defaults
 *
 * [id] is the template name (e.g., "Technical", "Business", "Basic").
 * Requires Super Admin authentication.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth-middleware';
import { getIpAddress } from '@/lib/services/audit-service';
import {
  getTemplate,
  updateTemplate,
  resetTemplate,
} from '@/lib/services/role-template-service';
import {
  UpdateRoleTemplateSchema,
  formatValidationErrors,
} from '@/lib/validation';

type RouteParams = { params: Promise<{ id: string }> };

/**
 * GET /api/admin/role-templates/[id]
 * Get a single role template by name.
 */
export async function GET(req: NextRequest, { params }: RouteParams) {
  const authResult = await requireSuperAdmin(req);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const { id: name } = await params;
    const template = await getTemplate(decodeURIComponent(name));
    if (!template) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }
    return NextResponse.json(template);
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/role-templates/[id]
 * Update a role template by storing an override.
 */
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const authResult = await requireSuperAdmin(req);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const { id: name } = await params;
    const body = await req.json();
    const parsed = UpdateRoleTemplateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: formatValidationErrors(parsed.error.issues) },
        { status: 400 }
      );
    }

    const ipAddress = getIpAddress(req);
    const template = await updateTemplate(
      decodeURIComponent(name),
      parsed.data,
      authResult.user.id,
      ipAddress
    );

    return NextResponse.json(template);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        return NextResponse.json(
          { error: error.message },
          { status: 404 }
        );
      }
    }
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/role-templates/[id]
 * Reset a role template to its default values.
 */
export async function POST(req: NextRequest, { params }: RouteParams) {
  const authResult = await requireSuperAdmin(req);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const { id: name } = await params;
    const ipAddress = getIpAddress(req);
    const template = await resetTemplate(
      decodeURIComponent(name),
      authResult.user.id,
      ipAddress
    );

    return NextResponse.json(template);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        return NextResponse.json(
          { error: error.message },
          { status: 404 }
        );
      }
    }
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
