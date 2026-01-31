import { NextRequest, NextResponse } from 'next/server';
import { getMcpConnection, updateMcpConnection } from '@/lib/storage';
import { decrypt } from '@/lib/encryption';

interface McpTool {
  name: string;
  description?: string;
  inputSchema?: Record<string, unknown>;
}

// POST /api/mcp/connections/[id]/discover - Discover available tools from MCP server
export async function POST(
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

    if (connection.status !== 'connected') {
      return NextResponse.json(
        { error: 'Connection must be established before discovering tools' },
        { status: 400 }
      );
    }

    // Prepare headers for authentication
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (connection.authCredentialsEncrypted) {
      try {
        const credentials = JSON.parse(decrypt(connection.authCredentialsEncrypted));

        if (connection.authType === 'api_key' && credentials.apiKey) {
          headers['Authorization'] = `Bearer ${credentials.apiKey}`;
        }
      } catch (decryptError) {
        console.error('Error decrypting credentials:', decryptError);
      }
    }

    try {
      // Send tools/list request via JSON-RPC
      const response = await fetch(connection.serverUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 2,
          method: 'tools/list',
          params: {},
        }),
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        return NextResponse.json({
          success: false,
          error: `Server returned ${response.status}`,
        });
      }

      const result = await response.json();

      if (result.error) {
        return NextResponse.json({
          success: false,
          error: result.error.message || 'Failed to list tools',
        });
      }

      // Extract tools from response
      const tools: McpTool[] = result.result?.tools || [];

      // Store discovered tools with full schema for AI SDK conversion
      const toolsWithSchema = tools.map((tool) => ({
        name: tool.name,
        description: tool.description || '',
        inputSchema: tool.inputSchema || { type: 'object', properties: {} },
      }));

      console.log(`[MCP] Discovered ${toolsWithSchema.length} tools:`, toolsWithSchema.map(t => t.name));

      await updateMcpConnection(id, {
        availableTools: toolsWithSchema,
      });

      return NextResponse.json({
        success: true,
        tools: tools.map((tool) => ({
          name: tool.name,
          description: tool.description,
        })),
      });
    } catch (fetchError) {
      const errorMessage = fetchError instanceof Error ? fetchError.message : 'Discovery failed';

      return NextResponse.json({
        success: false,
        error: errorMessage,
      });
    }
  } catch (error) {
    console.error('Error discovering MCP tools:', error);
    return NextResponse.json(
      { error: 'Failed to discover MCP tools' },
      { status: 500 }
    );
  }
}
