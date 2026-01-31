import { NextRequest, NextResponse } from 'next/server';
import { getMcpConnection, updateMcpConnection, deleteMcpConnection } from '@/lib/storage';

// GET /api/mcp/connections/[id] - Get a single MCP connection
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const connection = await getMcpConnection(id);

    if (!connection) {
      return NextResponse.json(
        { error: 'MCP connection not found' },
        { status: 404 }
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
  try {
    const { id } = await params;
    const body = await req.json();

    const connection = await getMcpConnection(id);
    if (!connection) {
      return NextResponse.json(
        { error: 'MCP connection not found' },
        { status: 404 }
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

    const updated = await updateMcpConnection(id, updateData);

    if (!updated) {
      return NextResponse.json(
        { error: 'Failed to update MCP connection' },
        { status: 500 }
      );
    }

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
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const connection = await getMcpConnection(id);
    if (!connection) {
      return NextResponse.json(
        { error: 'MCP connection not found' },
        { status: 404 }
      );
    }

    const deleted = await deleteMcpConnection(id);

    if (!deleted) {
      return NextResponse.json(
        { error: 'Failed to delete MCP connection' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting MCP connection:', error);
    return NextResponse.json(
      { error: 'Failed to delete MCP connection' },
      { status: 500 }
    );
  }
}
