import { NextRequest, NextResponse } from 'next/server';
import { getMcpConnection, updateMcpConnection } from '@/lib/storage';
import { decrypt } from '@/lib/encryption';

// POST /api/mcp/connections/[id]/test - Test connection to MCP server
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
        // OAuth flow would be more complex - simplified for now
      } catch (decryptError) {
        console.error('Error decrypting credentials:', decryptError);
      }
    }

    // Attempt to connect to the MCP server
    // MCP uses JSON-RPC 2.0 over HTTP - we'll send an initialize request
    try {
      const response = await fetch(connection.serverUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'initialize',
          params: {
            protocolVersion: '2024-11-05',
            capabilities: {
              tools: {},
            },
            clientInfo: {
              name: 'athena-mcp',
              version: '1.0.0',
            },
          },
        }),
        signal: AbortSignal.timeout(10000), // 10 second timeout
      });

      if (!response.ok) {
        const errorText = await response.text();
        await updateMcpConnection(id, {
          status: 'error',
          lastError: `HTTP ${response.status}: ${errorText.slice(0, 200)}`,
          isActive: false,
        });

        return NextResponse.json({
          success: false,
          status: 'error',
          error: `Server returned ${response.status}`,
        });
      }

      const result = await response.json();

      // Check for JSON-RPC error
      if (result.error) {
        await updateMcpConnection(id, {
          status: 'error',
          lastError: result.error.message || 'Unknown MCP error',
          isActive: false,
        });

        return NextResponse.json({
          success: false,
          status: 'error',
          error: result.error.message,
        });
      }

      // Success - update connection status
      await updateMcpConnection(id, {
        status: 'connected',
        lastError: null,
        isActive: true,
        lastConnectedAt: new Date(),
      });

      // Auto-discover tools after successful connection
      let discoveredTools: { name: string; description?: string }[] = [];
      try {
        const toolsResponse = await fetch(connection.serverUrl, {
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

        if (toolsResponse.ok) {
          const toolsResult = await toolsResponse.json();
          if (toolsResult.result?.tools) {
            discoveredTools = toolsResult.result.tools.map((t: { name: string; description?: string; inputSchema?: Record<string, unknown> }) => ({
              name: t.name,
              description: t.description || '',
              inputSchema: t.inputSchema || {},
            }));

            // Store discovered tools
            await updateMcpConnection(id, {
              availableTools: discoveredTools,
            });

            console.log(`[MCP] Auto-discovered ${discoveredTools.length} tools from ${connection.name}`);
          }
        }
      } catch (discoverError) {
        console.log('[MCP] Tool discovery failed (non-critical):', discoverError);
      }

      return NextResponse.json({
        success: true,
        status: 'connected',
        serverInfo: result.result?.serverInfo || null,
        tools: discoveredTools,
        toolCount: discoveredTools.length,
      });
    } catch (fetchError) {
      const errorMessage = fetchError instanceof Error ? fetchError.message : 'Connection failed';

      await updateMcpConnection(id, {
        status: 'error',
        lastError: errorMessage,
        isActive: false,
      });

      return NextResponse.json({
        success: false,
        status: 'error',
        error: errorMessage,
      });
    }
  } catch (error) {
    console.error('Error testing MCP connection:', error);
    return NextResponse.json(
      { error: 'Failed to test MCP connection' },
      { status: 500 }
    );
  }
}
