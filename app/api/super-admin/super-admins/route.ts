/**
 * Super Admin User API - List & Create
 *
 * GET  /api/super-admin/super-admins - List all Super Admin users
 * POST /api/super-admin/super-admins - Create a new Super Admin
 *
 * All routes require Super Admin authentication.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth-middleware';
import { getIpAddress } from '@/lib/services/audit-service';
import {
  createSuperAdmin,
  listSuperAdmins,
} from '@/lib/services/super-admin-service';
import {
  CreateSuperAdminSchema,
  formatValidationErrors,
} from '@/lib/validation';

/**
 * GET /api/super-admin/super-admins
 * List all Super Admin users.
 */
export async function GET(req: NextRequest) {
  const authResult = await requireSuperAdmin(req);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const admins = await listSuperAdmins();
    return NextResponse.json(admins);
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/super-admin/super-admins
 * Create a new Super Admin user.
 */
export async function POST(req: NextRequest) {
  const authResult = await requireSuperAdmin(req);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const body = await req.json();
    const parsed = CreateSuperAdminSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: formatValidationErrors(parsed.error.issues) },
        { status: 400 }
      );
    }

    const ipAddress = getIpAddress(req);
    const admin = await createSuperAdmin(
      parsed.data,
      authResult.user.id,
      ipAddress
    );

    return NextResponse.json(admin, { status: 201 });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('already registered')) {
        return NextResponse.json(
          { error: error.message },
          { status: 409 }
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
