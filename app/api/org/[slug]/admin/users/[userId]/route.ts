/**
 * Org Admin Users API - Single User Operations
 *
 * PATCH /api/org/[slug]/admin/users/[userId] - Update user (suspend, activate, changeRole, promote, updateName)
 * DELETE /api/org/[slug]/admin/users/[userId] - Remove user from organization
 *
 * Requires Org Admin authentication.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireOrgAdmin } from '@/lib/auth-middleware';
import { getIpAddress } from '@/lib/services/audit-service';
import {
  suspendOrgMember,
  activateOrgMember,
  changeOrgMemberRole,
  promoteToAdmin,
  updateOrgMemberName,
  deleteOrgMember,
} from '@/lib/services/org-user-service';
import { z } from 'zod';

/**
 * Zod schema for PATCH body.
 * action field determines which service function to call.
 */
const PatchUserSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('suspend'),
  }),
  z.object({
    action: z.literal('activate'),
  }),
  z.object({
    action: z.literal('changeRole'),
    roleId: z.string().uuid('Invalid role ID'),
  }),
  z.object({
    action: z.literal('promote'),
  }),
  z.object({
    action: z.literal('updateName'),
    name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  }),
]);

/**
 * PATCH /api/org/[slug]/admin/users/[userId]
 * Dispatch to the appropriate service function based on body.action.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string; userId: string }> }
) {
  const auth = await requireOrgAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const { userId } = await params;

  try {
    const body = await req.json();
    const parsed = PatchUserSchema.safeParse(body);

    if (!parsed.success) {
      const messages = parsed.error.issues.map((e) => e.message).join(', ');
      return NextResponse.json({ error: messages }, { status: 400 });
    }

    const data = parsed.data;
    const ipAddress = getIpAddress(req);
    const orgId = auth.organization.id;
    const actorId = auth.user.id;

    switch (data.action) {
      case 'suspend':
        await suspendOrgMember(orgId, userId, actorId, ipAddress);
        break;
      case 'activate':
        await activateOrgMember(orgId, userId, actorId, ipAddress);
        break;
      case 'changeRole':
        await changeOrgMemberRole(orgId, userId, data.roleId, actorId, ipAddress);
        break;
      case 'promote':
        await promoteToAdmin(orgId, userId, actorId, ipAddress);
        break;
      case 'updateName':
        await updateOrgMemberName(orgId, userId, data.name, actorId, ipAddress);
        break;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to update org member:', error);
    const message = error instanceof Error ? error.message : 'Failed to update member';

    // Safety violations and not-found errors return 400
    if (
      message.includes('Cannot') ||
      message.includes('not found') ||
      message.includes('No admin role')
    ) {
      return NextResponse.json({ error: message }, { status: 400 });
    }

    return NextResponse.json(
      { error: 'Failed to update member' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/org/[slug]/admin/users/[userId]
 * Remove a user from the organization.
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string; userId: string }> }
) {
  const auth = await requireOrgAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const { userId } = await params;

  try {
    const ipAddress = getIpAddress(req);
    await deleteOrgMember(auth.organization.id, userId, auth.user.id, ipAddress);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete org member:', error);
    const message = error instanceof Error ? error.message : 'Failed to remove member';

    if (message.includes('Cannot') || message.includes('not found')) {
      return NextResponse.json({ error: message }, { status: 400 });
    }

    return NextResponse.json(
      { error: 'Failed to remove member' },
      { status: 500 }
    );
  }
}
