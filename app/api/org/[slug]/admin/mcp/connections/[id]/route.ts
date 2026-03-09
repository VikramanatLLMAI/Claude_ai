/**
 * Org Admin MCP Connection Detail API
 *
 * GET    /api/org/[slug]/admin/mcp/connections/[id] - Get connection details
 * PATCH  /api/org/[slug]/admin/mcp/connections/[id] - Update connection
 * DELETE /api/org/[slug]/admin/mcp/connections/[id] - Delete connection
 *
 * Protected by requireOrgAdmin middleware.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireOrgAdmin } from '@/lib/auth-middleware';
import { encrypt } from '@/lib/encryption';
import { getIpAddress, auditLog } from '@/lib/services/audit-service';
import prisma from '@/lib/db';
import { z } from 'zod';
import { formatValidationErrors } from '@/lib/validation';
import { checkRateLimit, RATE_LIMITS, rateLimitResponse } from '@/lib/rate-limiter';
import { validateOrigin, originDeniedResponse } from '@/lib/origin-validator';

const UpdateOrgMcpConnectionSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  serverUrl: z.string().url().optional(),
  authType: z.enum(['none', 'api_key', 'oauth']).optional(),
  authCredentials: z.object({
    apiKey: z.string().optional(),
    clientId: z.string().optional(),
    clientSecret: z.string().optional(),
  }).optional(),
  assignmentType: z.enum(['org-wide', 'role-specific']).optional(),
  roleId: z.string().uuid('Invalid role ID').nullable().optional(),
  isActive: z.boolean().optional(),
});

// GET /api/org/[slug]/admin/mcp/connections/[id]
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireOrgAdmin(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const { id } = await params;
    const connection = await auth.tenantDb.mcpConnection.findUnique({
      where: { id },
      include: {
        role: { select: { id: true, name: true } },
      },
    });

    if (!connection) {
      return NextResponse.json(
        { error: 'MCP connection not found' },
        { status: 404 }
      );
    }

    // Only allow access to org-managed connections
    if (connection.userId !== null) {
      return NextResponse.json(
        { error: 'This is a personal connection, not an org-managed one' },
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
      roleId: connection.roleId,
      roleName: connection.role?.name || null,
      assignmentType: connection.roleId ? 'role-specific' : 'org-wide',
    });
  } catch (error) {
    console.error('Error fetching MCP connection:', error);
    return NextResponse.json(
      { error: 'Failed to fetch MCP connection' },
      { status: 500 }
    );
  }
}

// PATCH /api/org/[slug]/admin/mcp/connections/[id]
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Origin validation for mutation requests
  if (!validateOrigin(req)) return originDeniedResponse();
  const auth = await requireOrgAdmin(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const { id } = await params;
    const body = await req.json();
    const parsed = UpdateOrgMcpConnectionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: formatValidationErrors(parsed.error.issues) },
        { status: 400 }
      );
    }

    // Verify connection exists and is org-managed
    const existing = await auth.tenantDb.mcpConnection.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: 'MCP connection not found' },
        { status: 404 }
      );
    }
    if (existing.userId !== null) {
      return NextResponse.json(
        { error: 'This is a personal connection, not an org-managed one' },
        { status: 403 }
      );
    }

    const { authCredentials, assignmentType, ...restData } = parsed.data;

    // Build update data
    const updateData: Record<string, unknown> = { ...restData };

    // Handle assignment type change
    if (assignmentType === 'org-wide') {
      updateData.roleId = null;
      updateData.source = 'ORG';
    } else if (assignmentType === 'role-specific' && parsed.data.roleId) {
      // Verify role belongs to this org
      const role = await auth.tenantDb.role.findUnique({ where: { id: parsed.data.roleId } });
      if (!role) {
        return NextResponse.json(
          { error: 'Role not found in this organization' },
          { status: 404 }
        );
      }
      updateData.roleId = parsed.data.roleId;
      updateData.source = 'ROLE';
    }

    // Handle credential encryption
    const authType = parsed.data.authType ?? existing.authType;
    if (authCredentials) {
      if (authType === 'api_key' && authCredentials.apiKey) {
        updateData.authCredentialsEncrypted = encrypt(JSON.stringify({ apiKey: authCredentials.apiKey }));
      } else if (authType === 'oauth' && authCredentials.clientId && authCredentials.clientSecret) {
        updateData.authCredentialsEncrypted = encrypt(JSON.stringify({
          clientId: authCredentials.clientId,
          clientSecret: authCredentials.clientSecret,
        }));
      }
    }
    // Clear credentials if switching to 'none'
    if (parsed.data.authType === 'none') {
      updateData.authCredentialsEncrypted = null;
    }

    const ipAddress = getIpAddress(req);

    const updated = await prisma.$transaction(async (tx) => {
      const conn = await tx.mcpConnection.update({
        where: { id, organizationId: auth.organization.id },
        data: updateData,
        include: { role: { select: { id: true, name: true } } },
      });

      await auditLog.record(tx, {
        userId: auth.user.id,
        action: 'mcp.connection.updated',
        targetType: 'McpConnection',
        targetId: id,
        organizationId: auth.organization.id,
        ipAddress,
        metadata: { changes: Object.keys(parsed.data) },
      });

      return conn;
    });

    return NextResponse.json({
      id: updated.id,
      name: updated.name,
      serverUrl: updated.serverUrl,
      authType: updated.authType,
      status: updated.status,
      isActive: updated.isActive,
      roleId: updated.roleId,
      roleName: updated.role?.name || null,
      assignmentType: updated.roleId ? 'role-specific' : 'org-wide',
    });
  } catch (error) {
    console.error('Error updating MCP connection:', error);
    return NextResponse.json(
      { error: 'Failed to update MCP connection' },
      { status: 500 }
    );
  }
}

// DELETE /api/org/[slug]/admin/mcp/connections/[id]
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Origin validation for mutation requests
  if (!validateOrigin(req)) return originDeniedResponse();
  const auth = await requireOrgAdmin(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const { id } = await params;

    // Verify connection exists and is org-managed
    const existing = await auth.tenantDb.mcpConnection.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: 'MCP connection not found' },
        { status: 404 }
      );
    }
    if (existing.userId !== null) {
      return NextResponse.json(
        { error: 'This is a personal connection, not an org-managed one' },
        { status: 403 }
      );
    }

    const ipAddress = getIpAddress(req);

    await prisma.$transaction(async (tx) => {
      await tx.mcpConnection.delete({
        where: { id, organizationId: auth.organization.id },
      });

      await auditLog.record(tx, {
        userId: auth.user.id,
        action: 'mcp.connection.deleted',
        targetType: 'McpConnection',
        targetId: id,
        organizationId: auth.organization.id,
        ipAddress,
        metadata: { name: existing.name, serverUrl: existing.serverUrl },
      });
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Error deleting MCP connection:', error);
    return NextResponse.json(
      { error: 'Failed to delete MCP connection' },
      { status: 500 }
    );
  }
}
