import { NextRequest, NextResponse } from 'next/server';
import { streamText, convertToModelMessages, stepCountIs } from 'ai';
import { bedrock } from '@/lib/bedrock';
import { createArtifactPrompt, extractArtifacts } from '@/lib/artifacts';
import { addMessage, createArtifact } from '@/lib/storage';
import { loadActiveMcpToolsWithDescriptions } from '@/lib/mcp-client';
import { webSearchTool } from '@/lib/code-executor';
import { requireAuth } from '@/lib/auth-middleware';

export const maxDuration = 60;

// Models that support reasoning/extended thinking
const REASONING_CAPABLE_MODELS = [
  'global.anthropic.claude-sonnet-4-5-20250929-v1:0',
  'global.anthropic.claude-haiku-4-5-20251001-v1:0',
  'global.anthropic.claude-opus-4-5-20251101-v1:0',
  'us.anthropic.claude-sonnet-4-20250514-v1:0',
  'us.anthropic.claude-opus-4-20250514-v1:0',
  'us.anthropic.claude-3-7-sonnet-20250219-v1:0',
];

function supportsReasoning(modelId: string): boolean {
  return REASONING_CAPABLE_MODELS.includes(modelId);
}

// Base system prompt for business users
const BASE_SYSTEM_PROMPT = `You are Athena, an AI assistant designed for business users. You help answer questions by fetching real data from connected systems.

## How You Work

1. **Use MCP tools to get real data** - When users ask questions, use the available MCP tools to query their connected systems
2. **Provide clear insights** - Analyze the data and explain findings in simple, business-friendly language
3. **Be actionable** - Focus on what the data means and what actions users might take

## Response Guidelines

- Keep it simple - Avoid technical jargon
- Lead with key findings - Put important information first
- Use tables and lists - Format data clearly
- Provide context - Explain what numbers mean

## Visual Dashboards

${createArtifactPrompt()}

**IMPORTANT:** Only create HTML dashboard artifacts when the user explicitly asks for dashboards, charts, graphs, or visualizations. For regular questions, respond with clear text-based analysis.`;

// Build dynamic system prompt with available tools
function buildSystemPrompt(availableTools: string[], mcpToolDescriptions: { name: string; description: string }[]): string {
  const toolSections: string[] = [];

  // Web search tool (if enabled)
  if (availableTools.includes('webSearch')) {
    toolSections.push('- **webSearch**: Search the web for current information');
  }

  // MCP tools - dynamically add with descriptions
  if (mcpToolDescriptions.length > 0) {
    const mcpSection = mcpToolDescriptions.map(t =>
      `- **${t.name}**: ${t.description || 'MCP tool'}`
    ).join('\n');
    toolSections.push(mcpSection);
  }

  // If no tools available, return base prompt
  if (toolSections.length === 0) {
    return BASE_SYSTEM_PROMPT;
  }

  return `${BASE_SYSTEM_PROMPT}

---

## Available Tools

${toolSections.join('\n')}

---

## How to Answer

1. **Fetch data** - Use MCP tools to query connected systems (don't guess)
2. **Analyze** - Explain findings in simple language
3. **If asked for visuals** - Create HTML dashboard only when explicitly requested`;
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;

  try {
    const {
      messages: uiMessages,
      model: requestedModel,
      enableReasoning = true,
      conversationId,
      webSearch = false,
      activeMcpIds = [],
    } = await req.json();

    // Use the model ID directly (frontend sends full Bedrock model IDs)
    const modelId = requestedModel || 'global.anthropic.claude-sonnet-4-5-20250929-v1:0';

    // Check if reasoning should be enabled for this model
    const useReasoning = enableReasoning && supportsReasoning(modelId);

    // Get the last user message to save to database
    const lastUserMessage = uiMessages[uiMessages.length - 1];

    // Save user message to database if we have a conversation
    if (conversationId && lastUserMessage?.role === 'user') {
      const userContent = lastUserMessage.parts
        ?.filter((p: { type: string }) => p.type === 'text')
        .map((p: { text?: string }) => p.text || '')
        .join('') || lastUserMessage.content || '';

      if (userContent) {
        await addMessage(conversationId, {
          role: 'user',
          content: userContent,
          parts: lastUserMessage.parts,
        });
      }
    }

    // Build tools object
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tools: Record<string, any> = {};

    // Add web search tool if enabled
    if (webSearch) {
      tools.webSearch = webSearchTool;
    }

    // Track MCP tool descriptions for system prompt
    let mcpToolDescriptions: { name: string; description: string }[] = [];

    // DEBUG: Log the activeMcpIds received from frontend
    console.log(`[Chat] activeMcpIds from request:`, JSON.stringify(activeMcpIds));

    // Load MCP tools if any connections are active
    if (activeMcpIds && activeMcpIds.length > 0) {
      console.log(`[Chat] Attempting to load MCP tools from ${activeMcpIds.length} connections:`, activeMcpIds);
      try {
        const { tools: mcpTools, descriptions } = await loadActiveMcpToolsWithDescriptions(activeMcpIds);
        const mcpToolCount = Object.keys(mcpTools).length;
        if (mcpToolCount > 0) {
          Object.assign(tools, mcpTools);
          mcpToolDescriptions = descriptions;
          console.log(`[Chat] Successfully loaded ${mcpToolCount} MCP tools:`, Object.keys(mcpTools));
          console.log(`[Chat] MCP tool descriptions for prompt:`, descriptions.map(d => d.name));
        } else {
          console.log(`[Chat] No MCP tools loaded. Ensure connections are tested and tools are discovered.`);
        }
      } catch (error) {
        console.error('[Chat] Error loading MCP tools:', error);
      }
    }

    // Convert UI messages to model messages format
    const messages = await convertToModelMessages(uiMessages);

    // Log available tools
    const toolNames = Object.keys(tools);
    const hasTools = toolNames.length > 0;
    console.log(`[Chat] Available tools (${toolNames.length}):`, toolNames);

    // Build dynamic system prompt with available tools
    const systemPrompt = buildSystemPrompt(toolNames, mcpToolDescriptions);
    console.log(`[Chat] System prompt includes ${mcpToolDescriptions.length} MCP tool descriptions`);

    // Build streamText configuration
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const streamConfig: any = {
      model: bedrock(modelId),
      system: systemPrompt,
      messages,
      maxTokens: 4096,
      temperature: 0.7,
      // Log tool calls for debugging - this is called after each step (including tool executions)
      onStepFinish: (event: {
        stepType: string;
        toolCalls?: { toolName: string; args: unknown }[];
        toolResults?: { toolCallId: string; result: unknown }[];
        text?: string;
        finishReason?: string;
      }) => {
        console.log(`[Chat] ========== STEP FINISHED ==========`);
        console.log(`[Chat] Step type: ${event.stepType}`);
        console.log(`[Chat] Finish reason: ${event.finishReason}`);

        if (event.toolCalls && event.toolCalls.length > 0) {
          console.log(`[Chat] Tool calls made:`, event.toolCalls.map(tc => ({
            name: tc.toolName,
            args: JSON.stringify((tc as Record<string, unknown>).args ?? {}).substring(0, 200)
          })));
        }

        if (event.toolResults && event.toolResults.length > 0) {
          console.log(`[Chat] Tool results received:`);
          event.toolResults.forEach((tr, i) => {
            const trResult = (tr as Record<string, unknown>).result;
            const resultStr = trResult === undefined || trResult === null
              ? '(no result)'
              : typeof trResult === 'string'
                ? trResult.substring(0, 300)
                : JSON.stringify(trResult).substring(0, 300);
            console.log(`[Chat]   Result ${i + 1}:`, resultStr);
          });
        }

        if (event.text) {
          console.log(`[Chat] Text generated: ${event.text.substring(0, 200)}...`);
        }
        console.log(`[Chat] ========================================`);
      },
    };

    // Add tools if any are defined
    if (hasTools) {
      streamConfig.tools = tools;
      // Enable multi-step tool calls - model continues after tool results until done
      streamConfig.stopWhen = stepCountIs(10);
      // Set toolChoice to auto so model can decide when to use tools
      streamConfig.toolChoice = 'auto';
      console.log(`[Chat] Tools attached to model config:`, Object.keys(tools));
    }

    // Add reasoning config if supported
    // NOTE: Reasoning and tool use can conflict on Bedrock - disable reasoning when tools are active
    if (useReasoning && !hasTools) {
      streamConfig.providerOptions = {
        bedrock: {
          reasoningConfig: {
            type: 'enabled',
            budgetTokens: 8000,
          },
        },
      };
      console.log(`[Chat] Reasoning mode enabled (no tools active)`);
    } else if (useReasoning && hasTools) {
      console.log(`[Chat] Reasoning mode disabled - tools are active (Bedrock compatibility)`);
    }

    // Create the streaming response
    const result = streamText({
      ...streamConfig,
      onFinish: async ({ text, reasoning, steps }) => {
        // Save assistant message to database
        if (conversationId) {
          // Build parts array with all content types from ALL steps
          // Order: reasoning -> text -> tool calls (per step, interleaved)
          const parts: Array<Record<string, unknown>> = [];

          // Process each step to capture text and tool calls in order
          if (steps && steps.length > 0) {
            for (const step of steps) {
              // Add reasoning from this step if present
              if (step.reasoning) {
                parts.push({ type: 'reasoning', text: step.reasoning });
              }

              // Add text from this step BEFORE tool calls (if any)
              // This is the text the model generated before making tool calls
              if (step.text && step.toolCalls && step.toolCalls.length > 0) {
                // Step has both text and tool calls - add text first
                if (step.text.trim()) {
                  parts.push({ type: 'text', text: step.text });
                }
              }

              // Add tool calls from this step
              if (step.toolCalls && step.toolCalls.length > 0) {
                for (const toolCall of step.toolCalls) {
                  // Match result by toolCallId (not index) for reliability
                  const toolResult = step.toolResults?.find(
                    (r: Record<string, unknown>) => r.toolCallId === toolCall.toolCallId
                  );
                  const toolInput = (toolCall as Record<string, unknown>).input ?? (toolCall as Record<string, unknown>).args ?? {};
                  const toolOutput = toolResult
                    ? (toolResult as Record<string, unknown>).output
                    : undefined;

                  console.log(`[Chat] Storing tool part: ${toolCall.toolName}, input:`, JSON.stringify(toolInput));

                  parts.push({
                    type: `tool-${toolCall.toolName}`,
                    toolCallId: toolCall.toolCallId,
                    toolName: toolCall.toolName,
                    input: toolInput,
                    state: toolResult ? 'output-available' : 'input-available',
                    output: toolOutput,
                  });
                }
              } else if (step.text && step.text.trim()) {
                // Step has only text (no tool calls) - this is the final response text
                parts.push({ type: 'text', text: step.text });
              }
            }
          } else {
            // No steps - just use the final text and reasoning
            if (reasoning) {
              parts.push({ type: 'reasoning', text: reasoning });
            }
            if (text) {
              parts.push({ type: 'text', text });
            }
          }

          // Ensure we have at least one part
          if (parts.length === 0 && text) {
            parts.push({ type: 'text', text });
          }

          const message = await addMessage(conversationId, {
            role: 'assistant',
            content: text || '',
            parts: parts.length > 0 ? parts : [{ type: 'text', text: text || '' }],
            metadata: {
              reasoning: reasoning || null,
              stepsCount: steps?.length || 0,
              model: modelId,
            },
          });

          // Detect and save artifacts
          if (message) {
            const artifacts = extractArtifacts(text);
            for (const artifact of artifacts) {
              await createArtifact({
                conversationId,
                messageId: message.id,
                userId: user.id,
                type: artifact.type || 'html',
                title: artifact.title,
                content: artifact.content,
              });
            }
          }
        }
      },
    });

    // Return UI message stream response for useChat compatibility
    return result.toUIMessageStreamResponse({
      sendReasoning: true,
    });
  } catch (error) {
    console.error('Chat API error:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to process chat request',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

// GET endpoint to return available models
export async function GET() {
  const models = [
    {
      id: 'global.anthropic.claude-sonnet-4-5-20250929-v1:0',
      name: 'Claude 4.5 Sonnet',
      description: 'Most intelligent, best for complex tasks with extended thinking',
      supportsReasoning: true,
    },
    {
      id: 'global.anthropic.claude-haiku-4-5-20251001-v1:0',
      name: 'Claude 4.5 Haiku',
      description: 'Fast and efficient with thinking capabilities',
      supportsReasoning: true,
    },
    {
      id: 'global.anthropic.claude-opus-4-5-20251101-v1:0',
      name: 'Claude 4.5 Opus',
      description: 'Most capable model for complex reasoning and analysis',
      supportsReasoning: true,
    },
    {
      id: 'us.anthropic.claude-sonnet-4-20250514-v1:0',
      name: 'Claude 4 Sonnet',
      description: 'Balanced performance with reasoning support',
      supportsReasoning: true,
    },
  ];

  return Response.json({
    models,
    defaultModel: 'global.anthropic.claude-sonnet-4-5-20250929-v1:0'
  });
}
