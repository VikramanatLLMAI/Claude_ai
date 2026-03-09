/**
 * MCP (Model Context Protocol) Client
 * Handles connection to MCP servers and tool execution
 */

import { getMcpConnection } from './storage';
import { decrypt } from './encryption';
import { tool } from 'ai';
import { z } from 'zod';

export interface McpTool {
  name: string;
  description?: string;
  inputSchema?: {
    type?: string;
    properties?: Record<string, unknown>;
    required?: string[];
  };
}

export interface McpToolCall {
  name: string;
  arguments: Record<string, unknown>;
}

export interface McpToolResult {
  content: Array<{
    type: string;
    text?: string;
    data?: string;
    mimeType?: string;
  }>;
  isError?: boolean;
}

/**
 * Get authentication headers for an MCP connection
 */
async function getAuthHeaders(connectionId: string): Promise<{ headers: Record<string, string>; sessionId?: string | null }> {
  const connection = await getMcpConnection(connectionId);

  if (!connection) {
    throw new Error('MCP connection not found');
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json, text/event-stream',
  };

  // Add session ID for stateful MCP servers
  if (connection.sessionId) {
    headers['Mcp-Session-Id'] = connection.sessionId;
  }

  if (connection.authCredentialsEncrypted) {
    try {
      const credentials = JSON.parse(decrypt(connection.authCredentialsEncrypted));

      if (connection.authType === 'api_key' && credentials.apiKey) {
        headers['Authorization'] = `Bearer ${credentials.apiKey}`;
      }
      // OAuth would require token refresh flow - simplified here
    } catch (error) {
      console.error('Error decrypting MCP credentials:', error);
    }
  }

  return { headers, sessionId: connection.sessionId };
}

/**
 * Parse SSE (Server-Sent Events) response stream
 * Returns the final JSON-RPC result from the event stream
 */
async function parseSSEResponse(response: Response): Promise<unknown> {
  const contentType = response.headers.get('content-type') || '';

  // If it's regular JSON, parse directly
  if (contentType.includes('application/json')) {
    return response.json();
  }

  // If it's SSE, parse the event stream
  if (contentType.includes('text/event-stream')) {
    const text = await response.text();
    const lines = text.split('\n');

    let lastData: unknown = null;

    for (const line of lines) {
      // SSE format: "data: {json}"
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

    if (lastData) {
      return lastData;
    }

    throw new Error('No valid JSON-RPC response found in SSE stream');
  }

  // Fallback: try to parse as JSON anyway
  return response.json();
}

/**
 * Re-initialize MCP connection to get a new session ID
 */
async function refreshMcpSession(connectionId: string): Promise<string | null> {
  const connection = await getMcpConnection(connectionId);
  if (!connection) return null;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json, text/event-stream',
  };

  // Add auth if configured
  if (connection.authCredentialsEncrypted) {
    try {
      const credentials = JSON.parse(decrypt(connection.authCredentialsEncrypted));
      if (connection.authType === 'api_key' && credentials.apiKey) {
        headers['Authorization'] = `Bearer ${credentials.apiKey}`;
      }
    } catch (error) {
      console.error('[MCP] Error decrypting credentials for session refresh:', error);
    }
  }

  try {
    console.log('[MCP] Refreshing session for connection:', connectionId);
    const response = await fetch(connection.serverUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: Date.now(),
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
      console.error('[MCP] Session refresh failed:', response.status);
      return null;
    }

    // Get new session ID from headers
    const newSessionId = response.headers.get('mcp-session-id') || response.headers.get('x-session-id');

    if (newSessionId) {
      // Update session ID in database
      const { updateMcpConnection } = await import('./storage');
      await updateMcpConnection(connectionId, { sessionId: newSessionId });
      console.log('[MCP] Session refreshed successfully:', newSessionId);
      return newSessionId;
    }

    return null;
  } catch (error) {
    console.error('[MCP] Session refresh error:', error);
    return null;
  }
}

/**
 * Check if error indicates session expiry
 */
function isSessionExpiredError(error: string): boolean {
  const sessionErrors = [
    'missing session',
    'invalid session',
    'session expired',
    'session not found',
    'unauthorized',
    'session id',
  ];
  const lowerError = error.toLowerCase();
  return sessionErrors.some(se => lowerError.includes(se));
}

/**
 * Execute a tool on an MCP server with automatic session refresh
 */
export async function executeMcpTool(
  connectionId: string,
  toolName: string,
  toolArguments: Record<string, unknown>
): Promise<McpToolResult> {
  const connection = await getMcpConnection(connectionId);

  if (!connection) {
    throw new Error('MCP connection not found');
  }

  if (connection.status !== 'connected') {
    throw new Error('MCP connection is not active');
  }

  // Try to execute tool, with automatic session refresh on expiry
  const executeWithRetry = async (retryCount: number = 0): Promise<McpToolResult> => {
    const { headers } = await getAuthHeaders(connectionId);

    try {
      const response = await fetch(connection.serverUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: Date.now(),
          method: 'tools/call',
          params: {
            name: toolName,
            arguments: toolArguments,
          },
        }),
        signal: AbortSignal.timeout(30000), // 30 second timeout for tool execution
      });

      if (!response.ok) {
        const errorText = await response.text();

        // Check if session expired and retry once
        if (retryCount === 0 && isSessionExpiredError(errorText)) {
          console.log('[MCP] Session expired, attempting refresh...');
          const newSessionId = await refreshMcpSession(connectionId);
          if (newSessionId) {
            return executeWithRetry(1);
          }
        }

        return {
          content: [{ type: 'text', text: `HTTP Error ${response.status}: ${errorText}` }],
          isError: true,
        };
      }

      // Parse response (handles both JSON and SSE)
      const result = await parseSSEResponse(response) as { error?: { message?: string; code?: number }; result?: McpToolResult };

      if (result.error) {
        // Check if session expired and retry once
        if (retryCount === 0 && isSessionExpiredError(result.error.message || '')) {
          console.log('[MCP] Session expired (from response), attempting refresh...');
          const newSessionId = await refreshMcpSession(connectionId);
          if (newSessionId) {
            return executeWithRetry(1);
          }
        }

        return {
          content: [{ type: 'text', text: result.error.message || 'MCP tool execution failed' }],
          isError: true,
        };
      }

      return result.result || { content: [{ type: 'text', text: 'No result returned' }] };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      // Check if session expired and retry once
      if (retryCount === 0 && isSessionExpiredError(errorMessage)) {
        console.log('[MCP] Session expired (from exception), attempting refresh...');
        const newSessionId = await refreshMcpSession(connectionId);
        if (newSessionId) {
          return executeWithRetry(1);
        }
      }

      return {
        content: [{ type: 'text', text: `Tool execution failed: ${errorMessage}` }],
        isError: true,
      };
    }
  };

  return executeWithRetry(0);
}

/**
 * Get tools from an MCP connection
 */
export async function getMcpTools(connectionId: string): Promise<McpTool[]> {
  const connection = await getMcpConnection(connectionId);

  if (!connection) {
    return [];
  }

  if (connection.status !== 'connected') {
    return [];
  }

  // Return cached tools
  const availableTools = connection.availableTools as unknown;

  if (Array.isArray(availableTools) && availableTools.length > 0) {
    return availableTools as McpTool[];
  }

  return [];
}

/**
 * Convert MCP tools to AI SDK tool format
 * Creates Vercel AI SDK compatible tools from MCP tool definitions
 */
export function convertMcpToolsToAiTools(
  mcpTools: McpTool[],
  connectionId: string,
  sourcePrefix: string = 'mcp_'
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Record<string, any> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const aiTools: Record<string, any> = {};

  for (const mcpTool of mcpTools) {
    // Build Zod schema from MCP tool input schema
    const zodSchema = buildZodSchema(mcpTool.inputSchema);

    // Create a safe tool name (replace special chars)
    const safeName = mcpTool.name.replace(/[^a-zA-Z0-9_]/g, '_');
    const toolKey = `${sourcePrefix}${safeName}`;

    aiTools[toolKey] = tool({
      description: mcpTool.description || `MCP tool: ${mcpTool.name}`,
      inputSchema: zodSchema,
      execute: async (args) => {
        try {
          const result = await executeMcpTool(connectionId, mcpTool.name, args);

          // Convert MCP result to string for AI consumption
          const textContent = result.content
            .filter((c) => c.type === 'text')
            .map((c) => c.text)
            .join('\n');

          if (result.isError) {
            console.error(`[MCP] Tool ${mcpTool.name} returned error:`, textContent);
            // Return a proper error object that the AI can understand
            return { error: textContent || 'MCP tool execution failed', isError: true };
          }

          // Return the result in a format the AI can process
          // Try to parse as JSON first, otherwise return as text
          try {
            const parsed = JSON.parse(textContent);
            return parsed;
          } catch {
            return { data: textContent, success: true };
          }
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          console.error(`[MCP] Tool ${mcpTool.name} execution failed:`, errorMsg);
          return { error: errorMsg, isError: true };
        }
      },
    });
  }

  return aiTools;
}

/**
 * Build a Zod schema from MCP tool input schema
 */
function buildZodSchema(inputSchema?: McpTool['inputSchema']): z.ZodObject<Record<string, z.ZodTypeAny>> {
  if (!inputSchema || !inputSchema.properties) {
    return z.object({});
  }

  const shape: Record<string, z.ZodTypeAny> = {};
  const required = inputSchema.required || [];

  for (const [key, propSchema] of Object.entries(inputSchema.properties)) {
    const prop = propSchema as { type?: string; description?: string; enum?: string[] };
    let zodType: z.ZodTypeAny;

    switch (prop.type) {
      case 'string':
        zodType = prop.enum ? z.enum(prop.enum as [string, ...string[]]) : z.string();
        break;
      case 'number':
      case 'integer':
        zodType = z.number();
        break;
      case 'boolean':
        zodType = z.boolean();
        break;
      case 'array':
        zodType = z.array(z.unknown());
        break;
      case 'object':
        zodType = z.record(z.string(), z.unknown());
        break;
      default:
        zodType = z.unknown();
    }

    if (prop.description) {
      zodType = zodType.describe(prop.description);
    }

    if (!required.includes(key)) {
      zodType = zodType.optional();
    }

    shape[key] = zodType;
  }

  return z.object(shape);
}

/**
 * Load all active MCP tools for a conversation
 */
export async function loadActiveMcpTools(
  activeMcpIds: string[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<Record<string, any>> {
  const result = await loadActiveMcpToolsWithDescriptions(activeMcpIds);
  return result.tools;
}

/**
 * Load all active MCP tools with their descriptions for system prompt
 * Returns both the AI SDK tools and descriptions for the LLM
 *
 * @param sourceMap - Optional map of connectionId -> source type for source-prefixed tool names
 */
export async function loadActiveMcpToolsWithDescriptions(
  activeMcpIds: string[],
  sourceMap?: Map<string, 'ORG' | 'ROLE' | 'PERSONAL'>
): Promise<{
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tools: Record<string, any>;
  descriptions: { name: string; description: string }[];
}> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allTools: Record<string, any> = {};
  const allDescriptions: { name: string; description: string }[] = [];

  if (!activeMcpIds || activeMcpIds.length === 0) {
    return { tools: allTools, descriptions: allDescriptions };
  }

  for (const connectionId of activeMcpIds) {
    try {
      const mcpTools = await getMcpTools(connectionId);

      if (mcpTools.length > 0) {
        // Determine source prefix from sourceMap
        const source = sourceMap?.get(connectionId);
        const prefix = source === 'ORG' ? 'mcp__org__' : source === 'ROLE' ? 'mcp__role__' : 'mcp_';

        const aiTools = convertMcpToolsToAiTools(mcpTools, connectionId, prefix);
        Object.assign(allTools, aiTools);

        // Collect descriptions for the system prompt with matching prefix
        for (const mcpTool of mcpTools) {
          const safeName = mcpTool.name.replace(/[^a-zA-Z0-9_]/g, '_');
          allDescriptions.push({
            name: `${prefix}${safeName}`,
            description: mcpTool.description || `MCP tool: ${mcpTool.name}`,
          });
        }
      }
    } catch (error) {
      console.error(`[MCP] Error loading MCP tools for ${connectionId}:`, error);
    }
  }

  return { tools: allTools, descriptions: allDescriptions };
}
