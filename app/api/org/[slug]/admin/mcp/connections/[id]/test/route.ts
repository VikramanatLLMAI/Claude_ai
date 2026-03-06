/**
 * Org Admin MCP Connection Test API
 *
 * POST /api/org/[slug]/admin/mcp/connections/[id]/test - Test MCP server connection
 *
 * Reuses MCP test logic from the personal MCP test route.
 * Protected by requireOrgAdmin middleware.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireOrgAdmin } from '@/lib/auth-middleware';
import { decrypt } from '@/lib/encryption';

// POST /api/org/[slug]/admin/mcp/connections/[id]/test
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireOrgAdmin(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const { id } = await params;
    const connection = await auth.tenantDb.mcpConnection.findUnique({ where: { id } });

    if (!connection) {
      return NextResponse.json(
        { error: 'MCP connection not found' },
        { status: 404 }
      );
    }

    // Only allow org-managed connections
    if (connection.userId !== null) {
      return NextResponse.json(
        { error: 'This is a personal connection, not an org-managed one' },
        { status: 403 }
      );
    }

    // Prepare headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json, text/event-stream',
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

    // Helper to parse SSE or JSON response
    const parseResponse = async (response: Response): Promise<unknown> => {
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        return response.json();
      }
      if (contentType.includes('text/event-stream')) {
        const text = await response.text();
        const lines = text.split('\n');
        let lastData: unknown = null;
        for (const line of lines) {
          if (line.startsWith('data:')) {
            const jsonStr = line.slice(5).trim();
            if (jsonStr && jsonStr !== '[DONE]') {
              try {
                lastData = JSON.parse(jsonStr);
              } catch {
                // Skip non-JSON data lines
              }
            }
          }
        }
        if (lastData) return lastData;
        try {
          return JSON.parse(text);
        } catch {
          throw new Error('No valid JSON-RPC response in SSE stream');
        }
      }
      const text = await response.text();
      try {
        return JSON.parse(text);
      } catch {
        throw new Error(`Unable to parse response: ${text.slice(0, 200)}`);
      }
    };

    // Attempt MCP initialize handshake
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
            capabilities: { tools: {} },
            clientInfo: { name: 'llmatscale-ai', version: '1.0.0' },
          },
        }),
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        const errorText = await response.text();
        await auth.tenantDb.mcpConnection.update({
          where: { id },
          data: {
            status: 'error',
            lastError: `HTTP ${response.status}: ${errorText.slice(0, 200)}`,
            isActive: false,
          },
        });

        return NextResponse.json({
          success: false,
          status: 'error',
          error: `Server returned ${response.status}`,
        });
      }

      // Capture session ID
      const sessionId = response.headers.get('mcp-session-id') || response.headers.get('x-session-id');

      const result = await parseResponse(response) as {
        error?: { message?: string };
        result?: { serverInfo?: unknown };
      };

      if (result.error) {
        await auth.tenantDb.mcpConnection.update({
          where: { id },
          data: {
            status: 'error',
            lastError: result.error.message || 'Unknown MCP error',
            isActive: false,
          },
        });

        return NextResponse.json({
          success: false,
          status: 'error',
          error: result.error.message,
        });
      }

      // Success - update connection status
      await auth.tenantDb.mcpConnection.update({
        where: { id },
        data: {
          status: 'connected',
          lastError: null,
          isActive: true,
          lastConnectedAt: new Date(),
          ...(sessionId && { sessionId }),
        },
      });

      // Auto-discover tools after successful connection
      let discoveredTools: { name: string; description?: string; inputSchema?: Record<string, unknown> }[] = [];
      try {
        const toolsHeaders: Record<string, string> = { ...headers };
        if (sessionId) {
          toolsHeaders['Mcp-Session-Id'] = sessionId;
        }

        const toolsResponse = await fetch(connection.serverUrl, {
          method: 'POST',
          headers: toolsHeaders,
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 2,
            method: 'tools/list',
            params: {},
          }),
          signal: AbortSignal.timeout(10000),
        });

        if (toolsResponse.ok) {
          const toolsResult = await parseResponse(toolsResponse) as {
            result?: { tools?: Array<{ name: string; description?: string; inputSchema?: Record<string, unknown> }> };
            tools?: Array<{ name: string; description?: string; inputSchema?: Record<string, unknown> }>;
          };

          const tools = toolsResult.result?.tools || toolsResult.tools;
          if (tools && Array.isArray(tools)) {
            discoveredTools = tools.map((t) => ({
              name: t.name,
              description: t.description || '',
              inputSchema: t.inputSchema || {},
            }));

            await auth.tenantDb.mcpConnection.update({
              where: { id },
              data: { availableTools: discoveredTools as any },
            });
          }
        }
      } catch (toolError) {
        console.error('[MCP Admin Test] Tool discovery error:', toolError);
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

      await auth.tenantDb.mcpConnection.update({
        where: { id },
        data: {
          status: 'error',
          lastError: errorMessage,
          isActive: false,
        },
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
