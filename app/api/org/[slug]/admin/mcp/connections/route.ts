/**
 * Org Admin MCP Connections API
 *
 * GET  /api/org/[slug]/admin/mcp/connections - List org-managed MCP connections
 * POST /api/org/[slug]/admin/mcp/connections - Create org-managed MCP connection
 *
 * Org-managed connections have userId = null (not personal).
 * They can be org-wide (roleId = null) or role-specific (roleId set).
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

const CreateOrgMcpConnectionSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  serverUrl: z.string().url('Invalid server URL'),
  authType: z.enum(['none', 'api_key', 'oauth']).default('none'),
  authCredentials: z.object({
    apiKey: z.string().optional(),
    clientId: z.string().optional(),
    clientSecret: z.string().optional(),
  }).optional(),
  assignmentType: z.enum(['org-wide', 'role-specific']),
  roleId: z.string().uuid('Invalid role ID').optional(),
}).refine(
  (data) => {
    if (data.assignmentType === 'role-specific' && !data.roleId) {
      return false;
    }
    return true;
  },
  { message: 'roleId is required for role-specific assignment', path: ['roleId'] }
);

// GET /api/org/[slug]/admin/mcp/connections
export async function GET(req: NextRequest) {
  const auth = await requireOrgAdmin(req);
  if (auth instanceof NextResponse) return auth;

  try {
    // Fetch org-managed connections (userId = null) with role info
    const connections = await auth.tenantDb.mcpConnection.findMany({
      where: { userId: null },
      include: {
        role: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const response = connections.map((conn) => ({
      id: conn.id,
      name: conn.name,
      serverUrl: conn.serverUrl,
      authType: conn.authType,
      status: conn.status,
      lastError: conn.lastError,
      isActive: conn.isActive,
      availableTools: conn.availableTools,
      lastConnectedAt: conn.lastConnectedAt?.toISOString() || null,
      roleId: conn.roleId,
      roleName: conn.role?.name || null,
      assignmentType: conn.roleId ? 'role-specific' : 'org-wide',
    }));

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching org MCP connections:', error);
    return NextResponse.json(
      { error: 'Failed to fetch MCP connections' },
      { status: 500 }
    );
  }
}

// POST /api/org/[slug]/admin/mcp/connections
export async function POST(req: NextRequest) {
  const auth = await requireOrgAdmin(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await req.json();
    const parsed = CreateOrgMcpConnectionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: formatValidationErrors(parsed.error.issues) },
        { status: 400 }
      );
    }

    const { name, serverUrl, authType, authCredentials, assignmentType, roleId } = parsed.data;

    // If role-specific, verify role belongs to this org
    if (assignmentType === 'role-specific' && roleId) {
      const role = await auth.tenantDb.role.findUnique({ where: { id: roleId } });
      if (!role) {
        return NextResponse.json(
          { error: 'Role not found in this organization' },
          { status: 404 }
        );
      }
    }

    // Encrypt credentials if provided
    let encryptedCredentials: string | undefined;
    if (authType === 'api_key' && authCredentials?.apiKey) {
      encryptedCredentials = encrypt(JSON.stringify({ apiKey: authCredentials.apiKey }));
    } else if (authType === 'oauth' && authCredentials?.clientId && authCredentials?.clientSecret) {
      encryptedCredentials = encrypt(JSON.stringify({
        clientId: authCredentials.clientId,
        clientSecret: authCredentials.clientSecret,
      }));
    }

    const ipAddress = getIpAddress(req);

    // Create connection in a transaction with audit log
    const connection = await prisma.$transaction(async (tx) => {
      const conn = await tx.mcpConnection.create({
        data: {
          organizationId: auth.organization.id,
          userId: null, // org-managed, not personal
          roleId: assignmentType === 'role-specific' ? roleId! : null,
          name,
          serverUrl,
          authType,
          authCredentialsEncrypted: encryptedCredentials || null,
        },
      });

      await auditLog.record(tx, {
        userId: auth.user.id,
        action: 'mcp.connection.created',
        targetType: 'McpConnection',
        targetId: conn.id,
        organizationId: auth.organization.id,
        ipAddress,
        metadata: {
          name,
          serverUrl,
          authType,
          assignmentType,
          roleId: assignmentType === 'role-specific' ? roleId : null,
        },
      });

      return conn;
    });

    return NextResponse.json({
      id: connection.id,
      name: connection.name,
      serverUrl: connection.serverUrl,
      authType: connection.authType,
      status: connection.status,
      isActive: connection.isActive,
      roleId: connection.roleId,
      assignmentType: connection.roleId ? 'role-specific' : 'org-wide',
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating org MCP connection:', error);
    return NextResponse.json(
      { error: 'Failed to create MCP connection' },
      { status: 500 }
    );
  }
}
