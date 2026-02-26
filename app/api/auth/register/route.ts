/**
 * Registration API (DISABLED)
 *
 * Direct registration is disabled in multi-tenant mode.
 * Users must be invited to join an organization (Phase 2: invite flow).
 */

export async function POST() {
  return Response.json(
    { error: 'Registration is invite-only. Please use your invitation link.' },
    { status: 403 }
  );
}
