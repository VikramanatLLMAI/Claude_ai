import { NextRequest, NextResponse } from 'next/server';
import { requireOrgAuth } from '@/lib/auth-middleware';
import { checkRateLimit, RATE_LIMITS, rateLimitResponse } from '@/lib/rate-limiter';
import { validateOrigin, originDeniedResponse } from '@/lib/origin-validator';

// GET /api/mcp/connections/[id] - Get a single MCP connection
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireOrgAuth(req);
  if (auth instanceof NextResponse) return auth;
  const { user, tenantDb } = auth;

  // Rate limiting: 60 requests per minute per user (api tier)
  const rlGet = checkRateLimit(`api:${user.id}`, RATE_LIMITS.api);
  if (!rlGet.allowed) return rateLimitResponse(rlGet.retryAfterSeconds);

  try {
    const { id } = await params;
    const connection = await tenantDb.mcpConnection.findUnique({
      where: { id },
    });

    if (!connection) {
      return NextResponse.json(
        { error: 'MCP connection not found' },
        { status: 404 }
      );
    }

    // Verify ownership
    if (connection.userId !== user.id) {
      return NextResponse.json(
        { error: 'Not authorized to access this MCP connection' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      id: connection.id,
      name: connection.name,
      serverUrl: connection.serverUrl,
      authType: connection.authType,
      status: connection.status,
      lastError: connection.lastError,
      isActive: connection.isActive,
      availableTools: connection.availableTools,
      lastConnectedAt: connection.lastConnectedAt?.toISOString() || null,
    });
  } catch (error) {
    console.error('Error fetching MCP connection:', error);
    return NextResponse.json(
      { error: 'Failed to fetch MCP connection' },
      { status: 500 }
    );
  }
}

// PATCH /api/mcp/connections/[id] - Update an MCP connection
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Origin validation for mutation requests
  if (!validateOrigin(req)) return originDeniedResponse();
  const auth = await requireOrgAuth(req);
  if (auth instanceof NextResponse) return auth;
  const { user, tenantDb } = auth;

  // Rate limiting: 60 requests per minute per user (api tier)
  const rlPatch = checkRateLimit(`api:${user.id}`, RATE_LIMITS.api);
  if (!rlPatch.allowed) return rateLimitResponse(rlPatch.retryAfterSeconds);

  try {
    const { id } = await params;
    const body = await req.json();

    const connection = await tenantDb.mcpConnection.findUnique({
      where: { id },
    });
    if (!connection) {
      return NextResponse.json(
        { error: 'MCP connection not found' },
        { status: 404 }
      );
    }

    // Verify ownership
    if (connection.userId !== user.id) {
      return NextResponse.json(
        { error: 'Not authorized to update this MCP connection' },
        { status: 403 }
      );
    }

    // Filter allowed update fields
    const allowedFields = ['name', 'serverUrl', 'status', 'isActive', 'lastError', 'availableTools', 'lastConnectedAt'];
    const updateData: Record<string, unknown> = {};

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    const updated = await tenantDb.mcpConnection.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      id: updated.id,
      name: updated.name,
      serverUrl: updated.serverUrl,
      authType: updated.authType,
      status: updated.status,
      lastError: updated.lastError,
      isActive: updated.isActive,
      availableTools: updated.availableTools,
      lastConnectedAt: updated.lastConnectedAt?.toISOString() || null,
    });
  } catch (error) {
    console.error('Error updating MCP connection:', error);
    return NextResponse.json(
      { error: 'Failed to update MCP connection' },
      { status: 500 }
    );
  }
}

// DELETE /api/mcp/connections/[id] - Delete an MCP connection
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Origin validation for mutation requests
  if (!validateOrigin(req)) return originDeniedResponse();
  const auth = await requireOrgAuth(req);
  if (auth instanceof NextResponse) return auth;
  const { user, tenantDb } = auth;

  // Rate limiting: 60 requests per minute per user (api tier)
  const rlDel = checkRateLimit(`api:${user.id}`, RATE_LIMITS.api);
  if (!rlDel.allowed) return rateLimitResponse(rlDel.retryAfterSeconds);

  try {
    const { id } = await params;

    const connection = await tenantDb.mcpConnection.findUnique({
      where: { id },
    });
    if (!connection) {
      return NextResponse.json(
        { error: 'MCP connection not found' },
        { status: 404 }
      );
    }

    // Verify ownership
    if (connection.userId !== user.id) {
      return NextResponse.json(
        { error: 'Not authorized to delete this MCP connection' },
        { status: 403 }
      );
    }

    await tenantDb.mcpConnection.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting MCP connection:', error);
    return NextResponse.json(
      { error: 'Failed to delete MCP connection' },
      { status: 500 }
    );
  }
}
