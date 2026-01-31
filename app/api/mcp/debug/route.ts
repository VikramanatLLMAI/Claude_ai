import { NextResponse } from 'next/server';
import { getUserMcpConnections } from '@/lib/storage';

// Default user ID for demo mode
const DEMO_USER_ID = 'demo-user-id';

// GET /api/mcp/debug - Debug MCP connections status
export async function GET() {
  try {
    const connections = await getUserMcpConnections(DEMO_USER_ID);

    const debug = connections.map((conn) => ({
      id: conn.id,
      name: conn.name,
      status: conn.status,
      isActive: conn.isActive,
      availableToolsCount: Array.isArray(conn.availableTools)
        ? (conn.availableTools as unknown[]).length
        : 0,
      availableTools: Array.isArray(conn.availableTools)
        ? (conn.availableTools as { name: string }[]).map(t => t.name)
        : [],
      lastConnectedAt: conn.lastConnectedAt?.toISOString() || null,
      lastError: conn.lastError,
    }));

    console.log('[MCP Debug] Connections:', JSON.stringify(debug, null, 2));

    return NextResponse.json({
      connectionCount: connections.length,
      connections: debug,
      howToFix: {
        step1: 'Go to Settings > MCP Connections',
        step2: 'Click "Test Connection" for your Redshift MCP server',
        step3: 'If test succeeds, status will change to "connected" and tools will be discovered',
        step4: 'In chat, click the settings dropdown and enable the MCP connection under "MCP Connections"',
        step5: 'The activeMcpIds array must contain the connection ID for tools to load',
      },
    });
  } catch (error) {
    console.error('Error in MCP debug:', error);
    return NextResponse.json(
      { error: 'Failed to fetch MCP debug info' },
      { status: 500 }
    );
  }
}
