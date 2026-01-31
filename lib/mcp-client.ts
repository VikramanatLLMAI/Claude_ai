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
async function getAuthHeaders(connectionId: string): Promise<Record<string, string>> {
  const connection = await getMcpConnection(connectionId);

  if (!connection) {
    throw new Error('MCP connection not found');
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

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

  return headers;
}

/**
 * Execute a tool on an MCP server
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

  const headers = await getAuthHeaders(connectionId);

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
      return {
        content: [{ type: 'text', text: `HTTP Error ${response.status}: ${errorText}` }],
        isError: true,
      };
    }

    const result = await response.json();

    if (result.error) {
      return {
        content: [{ type: 'text', text: result.error.message || 'MCP tool execution failed' }],
        isError: true,
      };
    }

    return result.result || { content: [{ type: 'text', text: 'No result returned' }] };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      content: [{ type: 'text', text: `Tool execution failed: ${errorMessage}` }],
      isError: true,
    };
  }
}

/**
 * Get tools from an MCP connection
 */
export async function getMcpTools(connectionId: string): Promise<McpTool[]> {
  console.log(`[MCP] getMcpTools called for connectionId: ${connectionId}`);
  const connection = await getMcpConnection(connectionId);

  if (!connection) {
    console.log(`[MCP] Connection ${connectionId} NOT FOUND in database`);
    return [];
  }

  console.log(`[MCP] Found connection: name='${connection.name}', status='${connection.status}', isActive=${connection.isActive}`);

  if (connection.status !== 'connected') {
    console.log(`[MCP] Connection '${connection.name}' status is '${connection.status}', not 'connected'. Tools will not be loaded.`);
    console.log(`[MCP] To use this connection, test it first via Settings > MCP Connections`);
    return [];
  }

  // Return cached tools
  const availableTools = connection.availableTools as unknown;
  console.log(`[MCP] availableTools type: ${typeof availableTools}, isArray: ${Array.isArray(availableTools)}`);

  if (Array.isArray(availableTools)) {
    console.log(`[MCP] availableTools has ${availableTools.length} items`);
    if (availableTools.length > 0) {
      console.log(`[MCP] First tool:`, JSON.stringify(availableTools[0]));
      console.log(`[MCP] Loaded ${availableTools.length} tools from connection '${connection.name}'`);
      return availableTools as McpTool[];
    }
  }

  console.log(`[MCP] Connection '${connection.name}' has no discovered tools. Run tool discovery first.`);
  return [];
}

/**
 * Convert MCP tools to AI SDK tool format
 * Creates Vercel AI SDK compatible tools from MCP tool definitions
 */
export function convertMcpToolsToAiTools(
  mcpTools: McpTool[],
  connectionId: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Record<string, any> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const aiTools: Record<string, any> = {};

  for (const mcpTool of mcpTools) {
    // Build Zod schema from MCP tool input schema
    const zodSchema = buildZodSchema(mcpTool.inputSchema);

    // Create a safe tool name (replace special chars)
    const safeName = mcpTool.name.replace(/[^a-zA-Z0-9_]/g, '_');
    const toolKey = `mcp_${safeName}`;

    console.log(`[MCP] Converting tool: ${mcpTool.name} -> ${toolKey}`);

    aiTools[toolKey] = tool({
      description: mcpTool.description || `MCP tool: ${mcpTool.name}`,
      inputSchema: zodSchema,
      execute: async (args) => {
        console.log(`[MCP] ========== TOOL EXECUTION START ==========`);
        console.log(`[MCP] Tool: ${mcpTool.name}`);
        console.log(`[MCP] Args:`, JSON.stringify(args, null, 2));

        try {
          const result = await executeMcpTool(connectionId, mcpTool.name, args);
          console.log(`[MCP] Raw MCP result:`, JSON.stringify(result, null, 2));

          // Convert MCP result to string for AI consumption
          const textContent = result.content
            .filter((c) => c.type === 'text')
            .map((c) => c.text)
            .join('\n');

          if (result.isError) {
            console.error(`[MCP] Tool ${mcpTool.name} returned error:`, textContent);
            console.log(`[MCP] ========== TOOL EXECUTION END (ERROR) ==========`);
            // Return a proper error object that the AI can understand
            return { error: textContent || 'MCP tool execution failed', isError: true };
          }

          console.log(`[MCP] Tool ${mcpTool.name} result preview:`, textContent.substring(0, 500));
          console.log(`[MCP] ========== TOOL EXECUTION END (SUCCESS) ==========`);

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
          console.log(`[MCP] ========== TOOL EXECUTION END (EXCEPTION) ==========`);
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
 */
export async function loadActiveMcpToolsWithDescriptions(
  activeMcpIds: string[]
): Promise<{
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tools: Record<string, any>;
  descriptions: { name: string; description: string }[];
}> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allTools: Record<string, any> = {};
  const allDescriptions: { name: string; description: string }[] = [];

  console.log(`[MCP] loadActiveMcpToolsWithDescriptions called with ${activeMcpIds.length} connection IDs:`, activeMcpIds);

  if (!activeMcpIds || activeMcpIds.length === 0) {
    console.log('[MCP] No active MCP IDs provided, returning empty tools');
    return { tools: allTools, descriptions: allDescriptions };
  }

  for (const connectionId of activeMcpIds) {
    console.log(`[MCP] Processing connection: ${connectionId}`);
    try {
      const mcpTools = await getMcpTools(connectionId);
      console.log(`[MCP] getMcpTools returned ${mcpTools.length} tools for ${connectionId}`);

      if (mcpTools.length > 0) {
        const aiTools = convertMcpToolsToAiTools(mcpTools, connectionId);
        const toolKeys = Object.keys(aiTools);
        console.log(`[MCP] Converted to AI SDK tools:`, toolKeys);
        Object.assign(allTools, aiTools);

        // Collect descriptions for the system prompt
        for (const mcpTool of mcpTools) {
          const safeName = mcpTool.name.replace(/[^a-zA-Z0-9_]/g, '_');
          allDescriptions.push({
            name: `mcp_${safeName}`,
            description: mcpTool.description || `MCP tool: ${mcpTool.name}`,
          });
        }
      }
    } catch (error) {
      console.error(`[MCP] Error loading MCP tools for ${connectionId}:`, error);
    }
  }

  console.log(`[MCP] Total MCP tools loaded: ${Object.keys(allTools).length}`);
  console.log(`[MCP] Tool descriptions for prompt: ${allDescriptions.length}`);
  return { tools: allTools, descriptions: allDescriptions };
}
