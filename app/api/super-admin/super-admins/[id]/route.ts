/**
 * Super Admin User API - Single Super Admin
 *
 * GET    /api/super-admin/super-admins/[id] - Get a Super Admin by ID
 * PATCH  /api/super-admin/super-admins/[id] - Update a Super Admin
 * DELETE /api/super-admin/super-admins/[id] - Delete a Super Admin
 *
 * All routes require Super Admin authentication.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth-middleware';
import { getIpAddress } from '@/lib/services/audit-service';
import {
  updateSuperAdmin,
  deleteSuperAdmin,
} from '@/lib/services/super-admin-service';
import {
  UpdateSuperAdminSchema,
  formatValidationErrors,
} from '@/lib/validation';
import prisma from '@/lib/db';

type RouteParams = { params: Promise<{ id: string }> };

/**
 * GET /api/super-admin/super-admins/[id]
 * Get a single Super Admin by ID.
 */
export async function GET(req: NextRequest, { params }: RouteParams) {
  const authResult = await requireSuperAdmin(req);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const { id } = await params;
    const admin = await prisma.user.findUnique({
      where: { id, isSuperAdmin: true },
      select: {
        id: true,
        email: true,
        name: true,
        isSuperAdmin: true,
        createdAt: true,
        lastLogin: true,
      },
    });

    if (!admin) {
      return NextResponse.json(
        { error: 'Super Admin not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(admin);
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/super-admin/super-admins/[id]
 * Update a Super Admin's name or email.
 */
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const authResult = await requireSuperAdmin(req);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const { id } = await params;
    const body = await req.json();
    const parsed = UpdateSuperAdminSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: formatValidationErrors(parsed.error.issues) },
        { status: 400 }
      );
    }

    const ipAddress = getIpAddress(req);
    const admin = await updateSuperAdmin(
      id,
      parsed.data,
      authResult.user.id,
      ipAddress
    );

    return NextResponse.json(admin);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        return NextResponse.json(
          { error: error.message },
          { status: 404 }
        );
      }
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

/**
 * DELETE /api/super-admin/super-admins/[id]
 * Delete a Super Admin user.
 */
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const authResult = await requireSuperAdmin(req);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const { id } = await params;
    const ipAddress = getIpAddress(req);
    await deleteSuperAdmin(id, authResult.user.id, ipAddress);

    return NextResponse.json({
      success: true,
      message: 'Super Admin deleted.',
    });
  } catch (error) {
    if (error instanceof Error) {
      if (
        error.message.includes('Cannot delete yourself') ||
        error.message.includes('At least') ||
        error.message.includes('last Super Admin')
      ) {
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        );
      }
      if (error.message.includes('not found')) {
        return NextResponse.json(
          { error: error.message },
          { status: 404 }
        );
      }
    }
    // Handle Prisma foreign key constraint errors
    if (error instanceof Error && 'code' in error) {
      const prismaError = error as { code: string; meta?: { cause?: string } };
      if (prismaError.code === 'P2003') {
        return NextResponse.json(
          { error: 'Cannot delete: this user has associated records that prevent deletion.' },
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
