/**
 * Organization System Instructions API
 *
 * GET  /api/org/[slug]/admin/instructions - Get org system instructions
 * PATCH /api/org/[slug]/admin/instructions - Update org system instructions
 *
 * Protected by requireOrgAdmin middleware.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireOrgAdmin } from '@/lib/auth-middleware';
import { getIpAddress } from '@/lib/services/audit-service';
import { saveOrgInstructions } from '@/lib/services/instruction-service';
import { OrgInstructionsSchema, formatValidationErrors } from '@/lib/validation';

export async function GET(req: NextRequest) {
  const auth = await requireOrgAdmin(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const orgSettings = await auth.tenantDb.orgSettings.findUnique({
      where: { organizationId: auth.organization.id },
    });

    return NextResponse.json({
      systemInstructions: orgSettings?.systemInstructions || '',
      orgName: auth.organization.name,
    });
  } catch (error) {
    console.error('Failed to get org instructions:', error);
    return NextResponse.json(
      { error: 'Failed to load instructions' },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  const auth = await requireOrgAdmin(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await req.json();

    // Validate request body
    const parsed = OrgInstructionsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: formatValidationErrors(parsed.error.issues) },
        { status: 400 }
      );
    }

    const ipAddress = getIpAddress(req);
    const result = await saveOrgInstructions(
      auth.organization.id,
      parsed.data.systemInstructions,
      auth.user.id,
      ipAddress,
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      systemInstructions: parsed.data.systemInstructions,
      orgName: auth.organization.name,
    });
  } catch (error) {
    console.error('Failed to update org instructions:', error);
    return NextResponse.json(
      { error: 'Failed to save instructions' },
      { status: 500 }
    );
  }
}
