/**
 * Super Admin API Keys - Single Key CRUD
 *
 * GET    /api/super-admin/api-keys/[id] - Get single key with assignments (masked)
 * PATCH  /api/super-admin/api-keys/[id] - Update org assignments
 * DELETE /api/super-admin/api-keys/[id] - Delete key and all assignments
 *
 * All routes require Super Admin authentication.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth-middleware';
import { getIpAddress } from '@/lib/services/audit-service';
import {
  getApiKey,
  deleteApiKey,
  updateApiKeyAssignments,
} from '@/lib/services/api-key-service';
import { UpdateApiKeyAssignmentsSchema, formatValidationErrors } from '@/lib/validation';

/**
 * GET /api/super-admin/api-keys/[id]
 * Get a single API key with its org assignments (masked key).
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireSuperAdmin(req);
  if (authResult instanceof NextResponse) return authResult;

  const { id } = await params;

  try {
    const key = await getApiKey(id);
    if (!key) {
      return NextResponse.json({ error: 'API key not found' }, { status: 404 });
    }
    return NextResponse.json(key);
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/super-admin/api-keys/[id]
 * Update the org assignments for an API key.
 * Replaces all existing assignments with the new list.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireSuperAdmin(req);
  if (authResult instanceof NextResponse) return authResult;

  const { id } = await params;

  try {
    const body = await req.json();
    const parsed = UpdateApiKeyAssignmentsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: formatValidationErrors(parsed.error.issues) },
        { status: 400 }
      );
    }

    const ipAddress = getIpAddress(req);
    const key = await updateApiKeyAssignments(
      id,
      parsed.data.organizationIds,
      authResult.user.id,
      ipAddress
    );

    return NextResponse.json(key);
  } catch (error) {
    if (error instanceof Error && error.message === 'API key not found after update') {
      return NextResponse.json({ error: 'API key not found' }, { status: 404 });
    }
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/super-admin/api-keys/[id]
 * Delete an API key and all its org assignments.
 * Returns 204 No Content on success.
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireSuperAdmin(req);
  if (authResult instanceof NextResponse) return authResult;

  const { id } = await params;

  try {
    const ipAddress = getIpAddress(req);
    await deleteApiKey(id, authResult.user.id, ipAddress);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (
      error instanceof Error &&
      'code' in error &&
      (error as { code: string }).code === 'P2025'
    ) {
      return NextResponse.json({ error: 'API key not found' }, { status: 404 });
    }
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
