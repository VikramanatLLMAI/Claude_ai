import { NextRequest, NextResponse } from 'next/server';
import { streamText, convertToModelMessages, stepCountIs } from 'ai';
import { bedrock } from '@/lib/bedrock';
import { extractArtifacts } from '@/lib/artifacts';
import { addMessage, createArtifact } from '@/lib/storage';
import { buildSystemPromptWithTools } from '@/lib/system-prompts';
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

// Solution type for this route
const SOLUTION_TYPE = 'support';

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

    // Convert UI messages to model messages format
    const messages = await convertToModelMessages(uiMessages);

    // Build tools object
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tools: Record<string, any> = {};

    // Add web search tool if enabled
    if (webSearch) {
      tools.webSearch = webSearchTool;
    }

    // Track MCP tool descriptions for system prompt
    let mcpToolDescriptions: { name: string; description: string }[] = [];

    // Load MCP tools if any connections are active
    if (activeMcpIds && activeMcpIds.length > 0) {
      console.log(`[${SOLUTION_TYPE}] Loading MCP tools from ${activeMcpIds.length} connections`);
      try {
        const { tools: mcpTools, descriptions } = await loadActiveMcpToolsWithDescriptions(activeMcpIds);
        const mcpToolCount = Object.keys(mcpTools).length;
        if (mcpToolCount > 0) {
          Object.assign(tools, mcpTools);
          mcpToolDescriptions = descriptions;
          console.log(`[${SOLUTION_TYPE}] Loaded ${mcpToolCount} MCP tools`);
        }
      } catch (error) {
        console.error(`[${SOLUTION_TYPE}] Error loading MCP tools:`, error);
      }
    }

    const toolNames = Object.keys(tools);
    const hasTools = toolNames.length > 0;
    console.log(`[${SOLUTION_TYPE}] Available tools (${toolNames.length}):`, toolNames);

    // Build dynamic system prompt with available tools
    const systemPrompt = buildSystemPromptWithTools(SOLUTION_TYPE, toolNames, mcpToolDescriptions);

    // Build streamText configuration
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const streamConfig: any = {
      model: bedrock(modelId),
      system: systemPrompt,
      messages,
      maxTokens: 4096,
      temperature: 0.7,
      // Log tool calls for debugging
      onStepFinish: (event: {
        stepType: string;
        toolCalls?: { toolName: string; args: unknown }[];
        toolResults?: { toolCallId: string; result: unknown }[];
        finishReason?: string;
      }) => {
        console.log(`[${SOLUTION_TYPE}] Step finished: ${event.stepType}, reason: ${event.finishReason}`);
        if (event.toolCalls?.length) {
          console.log(`[${SOLUTION_TYPE}] Tool calls:`, event.toolCalls.map(tc => tc.toolName));
        }
        if (event.toolResults?.length) {
          console.log(`[${SOLUTION_TYPE}] Tool results received:`, event.toolResults.length);
        }
      },
    };

    // Add tools if any are defined
    if (hasTools) {
      streamConfig.tools = tools;
      // Enable multi-step tool calls - model continues after tool results
      streamConfig.stopWhen = stepCountIs(10);
      streamConfig.toolChoice = 'auto';
      console.log(`[${SOLUTION_TYPE}] Tools attached:`, Object.keys(tools));
    }

    // Add reasoning config if supported (disabled when tools are active)
    if (useReasoning && !hasTools) {
      streamConfig.providerOptions = {
        bedrock: {
          reasoningConfig: {
            type: 'enabled',
            budgetTokens: 8000,
          },
        },
      };
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
              if (step.reasoning) {
                parts.push({ type: 'reasoning', text: step.reasoning });
              }
              if (step.text && step.toolCalls && step.toolCalls.length > 0) {
                if (step.text.trim()) {
                  parts.push({ type: 'text', text: step.text });
                }
              }
              if (step.toolCalls && step.toolCalls.length > 0) {
                for (const toolCall of step.toolCalls) {
                  // Match result by toolCallId (not index) for reliability
                  const toolResult = step.toolResults?.find(
                    (r: Record<string, unknown>) => r.toolCallId === toolCall.toolCallId
                  );
                  const toolOutput = toolResult
                    ? (toolResult as Record<string, unknown>).output
                    : undefined;
                  parts.push({
                    type: `tool-${toolCall.toolName}`,
                    toolCallId: toolCall.toolCallId,
                    toolName: toolCall.toolName,
                    input: (toolCall as Record<string, unknown>).input ?? (toolCall as Record<string, unknown>).args ?? {},
                    state: toolResult ? 'output-available' : 'input-available',
                    output: toolOutput,
                  });
                }
              } else if (step.text && step.text.trim()) {
                parts.push({ type: 'text', text: step.text });
              }
            }
          } else {
            if (reasoning) {
              parts.push({ type: 'reasoning', text: reasoning });
            }
            if (text) {
              parts.push({ type: 'text', text });
            }
          }

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
              solutionType: SOLUTION_TYPE,
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
    console.error('Support Chat API error:', error);
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

// GET endpoint to return solution info
export async function GET() {
  return Response.json({
    solution: SOLUTION_TYPE,
    name: 'Support',
    description: 'Incident classification, root cause analysis, troubleshooting',
  });
}
