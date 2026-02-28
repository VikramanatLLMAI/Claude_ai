import { NextRequest, NextResponse } from 'next/server';
import { streamText, convertToModelMessages, stepCountIs, createUIMessageStream, createUIMessageStreamResponse } from 'ai';
import { anthropic, forwardAnthropicContainerIdFromLastStep } from '@/lib/anthropic';
import { loadActiveMcpToolsWithDescriptions } from '@/lib/mcp-client';
import { requireOrgAuth } from '@/lib/auth-middleware';
import { getAnthropicFilesClient } from '@/lib/anthropic-files';
import { fitMessagesToContextWindow } from '@/lib/context-window';
import { validate, ChatRequestSchema, formatValidationErrors } from '@/lib/validation';
import { composeSystemPrompt } from '@/lib/services/system-prompt-service';
import { getModelByModelId } from '@/lib/services/model-registry-service';
import { checkUserUsageLimits, getOrgMonthlyUsage, checkOrgMonthlyCeiling } from '@/lib/services/usage-service';

export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const auth = await requireOrgAuth(req);
  if (auth instanceof NextResponse) return auth;
  const { user, orgMember, organization, role, tenantDb } = auth;

  try {
    // Issue 2: Validate request body with Zod schema
    const body = await req.json();
    const validation = validate(ChatRequestSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        { error: formatValidationErrors(validation.errors!) },
        { status: 400 }
      );
    }
    const {
      messages: uiMessages,
      model: requestedModel,
      enableReasoning = true,
      conversationId,
      webSearch = false,
      activeMcpIds = [],
    } = validation.data!;

    // Use the model ID directly (frontend sends full model IDs)
    const modelId = requestedModel || 'claude-sonnet-4-5-20250929';

    // A. Model access validation (UCHAT-01, OLLM-02)
    const permittedModelIds = Array.isArray(role.allowedModels)
      ? (role.allowedModels as string[])
      : [];

    if (!permittedModelIds.includes(modelId)) {
      return NextResponse.json(
        { error: 'You do not have access to this model' },
        { status: 403 }
      );
    }

    // B. Replace hardcoded model arrays with Model Registry lookup
    const modelInfo = await getModelByModelId(modelId);
    const thinkingType = modelInfo?.thinkingType ?? null; // 'adaptive' | 'extended' | null

    // Determine thinking mode from Model Registry
    let thinkingMode: 'adaptive' | 'manual' | 'none' = 'none';
    if (enableReasoning) {
      if (thinkingType === 'adaptive') thinkingMode = 'adaptive';
      else if (thinkingType === 'extended') thinkingMode = 'manual';
    }

    // C. Usage limit enforcement (SAFE-10)
    const usageStatus = await checkUserUsageLimits(tenantDb, user.id, role);
    if (!usageStatus.allowed) {
      return NextResponse.json({
        error: 'You have reached your daily usage limit. Please wait for the limit to reset.',
        code: 'USAGE_LIMIT_EXCEEDED',
        resetAt: usageStatus.resetAt,
        requestStatus: usageStatus.requestStatus,
        tokenStatus: usageStatus.tokenStatus,
      }, { status: 429 });
    }

    // D. Org monthly ceiling check
    if (organization.monthlyRequestCeiling || organization.monthlyTokenCeiling) {
      const orgSettings = await tenantDb.orgSettings.findUnique({ where: { organizationId: organization.id } });
      const monthlyUsage = await getOrgMonthlyUsage(tenantDb, organization.id);
      const ceilingStatus = checkOrgMonthlyCeiling(organization, orgSettings, monthlyUsage);
      if (!ceilingStatus.allowed) {
        return NextResponse.json({
          error: 'Your organization has reached its monthly usage limit. Contact your administrator.',
          code: 'ORG_CEILING_EXCEEDED',
        }, { status: 429 });
      }
    }

    // Get the last user message to save to database
    const lastUserMessage = uiMessages[uiMessages.length - 1];

    // Save user message to database if we have a conversation
    if (conversationId && lastUserMessage?.role === 'user') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const parts = lastUserMessage.parts as any[] | undefined;
      const userContent = parts
        ?.filter((p: { type: string }) => p.type === 'text')
        .map((p: { text?: string }) => p.text || '')
        .join('') || lastUserMessage.content || '';

      if (userContent) {
        await tenantDb.message.create({
          data: {
            conversationId,
            role: 'user',
            content: userContent,
            parts: (lastUserMessage.parts as object) ?? null,
            metadata: {},
          },
        });
        // Update conversation's lastMessageAt (non-blocking)
        tenantDb.conversation.update({
          where: { id: conversationId },
          data: { lastMessageAt: new Date() },
        }).catch(err => console.error('Error updating lastMessageAt:', err));
      }
    }

    // Build tools object
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tools: Record<string, any> = {};

    // Code execution - always enabled
    tools.code_execution = anthropic.tools.codeExecution_20250825();

    // Web search + web fetch - controlled by existing webSearch toggle
    if (webSearch) {
      tools.web_search = anthropic.tools.webSearch_20250305({ maxUses: 5 });
      tools.web_fetch = anthropic.tools.webFetch_20250910({
        maxUses: 3,
      });
    }

    // Track MCP tool descriptions for system prompt
    let mcpToolDescriptions: { name: string; description: string }[] = [];

    // C. MCP tool filtering (UCHAT-05, OMCP-04)
    // Query authorized MCP connections for this user
    const authorizedMcpConnections = await tenantDb.mcpConnection.findMany({
      where: {
        isActive: true,
        OR: [
          { roleId: null, userId: null },                    // Org-wide
          { roleId: role.id, userId: null },                 // Role-specific
          ...(role.personalMcpEnabled
            ? [{ userId: user.id }]                          // Personal (if role permits)
            : []),
        ],
      },
      select: { id: true },
    });

    const authorizedMcpIds = new Set(authorizedMcpConnections.map(c => c.id));

    // Filter client-requested MCP IDs against authorized set
    const filteredMcpIds = (activeMcpIds || []).filter((id: string) => authorizedMcpIds.has(id));

    // DEBUG: Log the activeMcpIds received from frontend
    console.log(`[Chat] activeMcpIds from request:`, JSON.stringify(activeMcpIds));
    console.log(`[Chat] filteredMcpIds (authorized):`, JSON.stringify(filteredMcpIds));

    // Load MCP tools if any authorized connections are active
    if (filteredMcpIds && filteredMcpIds.length > 0) {
      console.log(`[Chat] Attempting to load MCP tools from ${filteredMcpIds.length} connections:`, filteredMcpIds);
      try {
        const { tools: mcpTools, descriptions } = await loadActiveMcpToolsWithDescriptions(filteredMcpIds);
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const messages = await convertToModelMessages(uiMessages as any);

    // Log available tools
    const toolNames = Object.keys(tools);
    const hasTools = toolNames.length > 0;
    console.log(`[Chat] Available tools (${toolNames.length}):`, toolNames);

    // D. 4-layer system prompt composition (PRMT-01 through PRMT-06)
    // Fetch org settings for org-level instructions
    const orgSettings = await tenantDb.orgSettings.findUnique({
      where: { organizationId: organization.id },
    });

    const systemPrompt = composeSystemPrompt(
      toolNames,
      mcpToolDescriptions,
      {
        orgInstructions: orgSettings?.systemInstructions || null,
        roleInstructions: role.systemInstructions || null,
        userName: user.name,
        roleName: role.name,
        userCustomInstructions: orgMember.customInstructions || null,
        customInstructionsEnabled: role.customInstructionsEnabled,
      }
    );
    console.log(`[Chat] System prompt composed with 4-layer stack, ${mcpToolDescriptions.length} MCP tool descriptions`);

    // Fit messages within the context window (trim tool results + drop old groups)
    const fittedMessages = fitMessagesToContextWindow(messages, systemPrompt);

    // E. Usage tracking timestamp (UCHAT-02) -- record before streamText
    const requestStart = Date.now();

    // Build streamText configuration
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const streamConfig: Record<string, any> = {
      model: anthropic(modelId),
      system: systemPrompt,
      messages: fittedMessages,
      maxTokens: modelInfo?.maxOutputTokens ?? 65536,
      ...(thinkingMode !== 'none' ? {} : { temperature: 0.7 }),
      // Log tool calls for debugging - this is called after each step (including tool executions)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      onStepFinish: (event: any) => {
        console.log(`[Chat] ========== STEP FINISHED ==========`);
        console.log(`[Chat] Step type: ${event.stepType}`);
        console.log(`[Chat] Finish reason: ${event.finishReason}`);

        if (event.toolCalls && event.toolCalls.length > 0) {
          console.log(`[Chat] Tool calls made:`, event.toolCalls.map((tc: Record<string, unknown>) => ({
            name: tc.toolName,
            args: JSON.stringify(tc.args ?? {}).substring(0, 200)
          })));
        }

        if (event.toolResults && event.toolResults.length > 0) {
          console.log(`[Chat] Tool results received:`);
          event.toolResults.forEach((tr: Record<string, unknown>, i: number) => {
            const trResult = tr.result;
            const resultStr = trResult === undefined || trResult === null
              ? '(no result)'
              : typeof trResult === 'string'
                ? trResult.substring(0, 300)
                : JSON.stringify(trResult).substring(0, 300);
            console.log(`[Chat]   Result ${i + 1} (${tr.toolName || 'unknown'}):`, resultStr);
            // Log file_ids from code execution results
            if (trResult && typeof trResult === 'object') {
              const resultObj = trResult as Record<string, unknown>;
              const content = resultObj.content as Array<Record<string, unknown>> | undefined;
              if (content && Array.isArray(content) && content.length > 0) {
                const fileIds = content.filter(c => c.file_id).map(c => c.file_id);
                if (fileIds.length > 0) {
                  console.log(`[Chat]   File IDs in result:`, fileIds);
                }
              }
            }
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
      streamConfig.stopWhen = stepCountIs(20);
      console.log(`[Chat] Tools attached to model config:`, Object.keys(tools));
    }

    // Build anthropic provider options
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const anthropicOptions: Record<string, any> = {};

    if (thinkingMode === 'adaptive') {
      anthropicOptions.thinking = { type: 'adaptive' };
      // For Opus 4.6 use 'max', for Sonnet 4.6 use 'high' (max is Opus-only)
      const effort = modelId === 'claude-opus-4-6' ? 'max' : 'high';
      anthropicOptions.effort = effort;
      console.log(`[Chat] Adaptive thinking enabled (effort: ${effort})`);
    } else if (thinkingMode === 'manual') {
      anthropicOptions.thinking = { type: 'enabled', budgetTokens: 16000 };
      console.log(`[Chat] Manual thinking enabled (budget: 16000)`);
    }

    // Agent skills for code execution (always enabled)
    anthropicOptions.container = {
      skills: [
        { type: 'anthropic', skillId: 'pptx', version: 'latest' },
        { type: 'anthropic', skillId: 'docx', version: 'latest' },
        { type: 'anthropic', skillId: 'pdf', version: 'latest' },
        { type: 'anthropic', skillId: 'xlsx', version: 'latest' },
        { type: 'custom', skillId: 'skill_01JcCJjnPE6Pah8SceXsBy6P' },
      ],
    };

    streamConfig.providerOptions = { anthropic: anthropicOptions };

    // Propagate container ID between steps for code execution continuity
    streamConfig.prepareStep = forwardAnthropicContainerIdFromLastStep;

    // Create the streaming response using createUIMessageStream
    // This keeps the HTTP response open so we can merge the AI stream,
    // then write file-download data chunks after completion - all in one response.
    // DB persistence uses onFinish which receives responseMessage.parts — the exact
    // parts the client saw (including step-start, interleaved text/tool parts).
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = streamText(streamConfig as any);

    // Issue 18: Ensure backend completes even if client disconnects
    result.consumeStream();

    // Shared state between execute and onFinish
    const fileDownloadParts: Array<Record<string, unknown>> = [];

    const stream = createUIMessageStream({
      execute: async ({ writer }) => {
        // 1. Merge AI stream (tokens flow to client in real-time)
        writer.merge(result.toUIMessageStream({ sendReasoning: true, sendSources: true }));

        // 2. Wait for completion
        const [, , steps] = await Promise.all([
          result.text, result.reasoning, result.steps,
        ]);

        // 3. Extract file_ids from code_execution outputs and write to stream
        if (conversationId && steps && steps.length > 0) {
          const fileDownloads: Array<{ fileId: string; filename: string; mimeType: string; sizeBytes: number }> = [];
          const seenFileIds = new Set<string>();

          const extractFileIds = (output: unknown) => {
            if (!output || typeof output !== 'object') return;
            const obj = output as Record<string, unknown>;

            if (typeof obj.file_id === 'string' && obj.file_id.startsWith('file_') && !seenFileIds.has(obj.file_id)) {
              seenFileIds.add(obj.file_id);
              fileDownloads.push({
                fileId: obj.file_id,
                filename: (obj.file_name as string) || (obj.filename as string) || 'download',
                mimeType: (obj.file_type as string) || (obj.mime_type as string) || 'application/octet-stream',
                sizeBytes: (obj.file_size as number) || (obj.size_bytes as number) || 0,
              });
            }

            const content = obj.content as Array<Record<string, unknown>> | undefined;
            if (Array.isArray(content)) {
              for (const block of content) {
                if (typeof block.file_id === 'string' && block.file_id.startsWith('file_') && !seenFileIds.has(block.file_id)) {
                  seenFileIds.add(block.file_id);
                  fileDownloads.push({
                    fileId: block.file_id,
                    filename: (block.file_name as string) || (block.filename as string) || 'download',
                    mimeType: (block.file_type as string) || (block.mime_type as string) || 'application/octet-stream',
                    sizeBytes: (block.file_size as number) || (block.size_bytes as number) || 0,
                  });
                }
              }
            }
          };

          // Scan tool results for file IDs
          for (const step of steps) {
            if (step.toolResults) {
              for (const tr of step.toolResults) {
                const trAny = tr as Record<string, unknown>;
                extractFileIds(trAny.result);
                extractFileIds(trAny.output);
              }
            }
          }

          // Deduplicate by filename — code execution often produces intermediate
          // and final versions of the same file with different file_ids.
          // Keep the last file_id per filename (the final version).
          const fileByName = new Map<string, typeof fileDownloads[0]>();
          for (const file of fileDownloads) {
            fileByName.set(file.filename, file);
          }
          const uniqueFiles = Array.from(fileByName.values());

          // Enrich with metadata from Files API and write data chunks to stream
          for (const file of uniqueFiles) {
            try {
              const client = getAnthropicFilesClient();
              const metadata = await client.beta.files.retrieveMetadata(file.fileId);
              if (metadata.filename) file.filename = metadata.filename;
              if (metadata.mime_type) file.mimeType = metadata.mime_type;
              if (metadata.size_bytes) file.sizeBytes = metadata.size_bytes;
            } catch {
              // Use what we have from the output
            }

            console.log(`[Chat] File download: ${file.fileId} (${file.filename})`);

            // Write file-download data chunk through the SSE stream
            writer.write({
              type: 'data-fileDownload',
              data: {
                fileId: file.fileId,
                filename: file.filename,
                mimeType: file.mimeType,
                sizeBytes: file.sizeBytes,
              },
            });

            // Save for DB persistence in onFinish
            fileDownloadParts.push({
              type: 'file-download',
              fileId: file.fileId,
              filename: file.filename,
              mimeType: file.mimeType,
              sizeBytes: file.sizeBytes,
            });
          }
        }
      },
      onFinish: async ({ responseMessage }) => {
        // Persist the message to DB using the exact parts the client received.
        // responseMessage.parts has step-start, text, tool-*, reasoning parts
        // in the correct interleaved order — matching what the streaming view showed.
        if (!conversationId) return;

        try {
          // Convert the streaming parts to a serializable format for DB storage
          const streamParts = Array.isArray(responseMessage.parts) ? responseMessage.parts : [];
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const dbParts: Array<Record<string, unknown>> = streamParts.map((part: any) => {
            const partType = part.type as string;

            if (partType === 'text') {
              return { type: 'text', text: part.text || '' };
            }

            if (partType === 'reasoning') {
              return { type: 'reasoning', text: part.text || '' };
            }

            if (partType === 'step-start') {
              return { type: 'step-start' };
            }

            if (partType?.startsWith('tool-')) {
              return {
                type: partType,
                toolCallId: part.toolCallId,
                toolName: part.toolName,
                input: part.input ?? part.args ?? {},
                output: part.output ?? part.result ?? undefined,
                state: part.state || 'output-available',
              };
            }

            if (partType === 'dynamic-tool') {
              return {
                type: `tool-${part.toolName || 'unknown'}`,
                toolCallId: part.toolCallId,
                toolName: part.toolName,
                input: part.input ?? part.args ?? {},
                output: part.output ?? part.result ?? undefined,
                state: part.state || 'output-available',
              };
            }

            if (partType?.startsWith('data-')) {
              // data-fileDownload parts are handled separately
              return null;
            }

            // Pass through other parts (source-url, source-document, file, etc.)
            return { ...part };
          }).filter(Boolean) as Array<Record<string, unknown>>;

          // Append file-download parts at the end
          dbParts.push(...fileDownloadParts);

          // Extract plain text for the content field
          const text = await result.text;
          const reasoning = await result.reasoning;
          const steps = await result.steps;

          // Ensure we have at least one part
          if (dbParts.length === 0 && text) {
            dbParts.push({ type: 'text', text });
          }

          await tenantDb.message.create({
            data: {
              conversationId,
              role: 'assistant',
              content: text || '',
              parts: dbParts.length > 0 ? dbParts : [{ type: 'text', text: text || '' }],
              metadata: {
                reasoning: reasoning || null,
                stepsCount: steps?.length || 0,
                model: modelId,
              },
            },
          });
          // Update conversation's lastMessageAt (non-blocking)
          tenantDb.conversation.update({
            where: { id: conversationId },
            data: { lastMessageAt: new Date() },
          }).catch(err => console.error('Error updating lastMessageAt:', err));

        } catch (error) {
          console.error('[Chat] Error persisting message:', error);
        }

        // E. Usage tracking (UCHAT-02)
        // Record token usage per chat request. UsageRecord is in TENANT_SCOPED_MODELS so use tenantDb.
        try {
          const totalUsage = await result.totalUsage;
          const requestEnd = Date.now();

          await tenantDb.usageRecord.create({
            data: {
              userId: user.id,
              orgMemberId: orgMember.id,
              conversationId: conversationId || null,
              model: modelId,
              inputTokens: totalUsage.inputTokens ?? 0,
              outputTokens: totalUsage.outputTokens ?? 0,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              thinkingTokens: (totalUsage as any).reasoningTokens ?? 0,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              cacheCreationTokens: ((totalUsage as any).inputTokenDetails?.cacheWriteTokens) ?? 0,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              cacheReadTokens: ((totalUsage as any).inputTokenDetails?.cacheReadTokens) ?? 0,
              requestDurationMs: requestEnd - requestStart,
            },
          });
          console.log(`[Chat] Usage recorded: input=${totalUsage.inputTokens}, output=${totalUsage.outputTokens}, model=${modelId}`);
        } catch (usageError) {
          console.error('[Chat] Error recording usage:', usageError);
          // Do NOT fail the chat request if usage recording fails
        }
      },
      onError: (error) => {
        console.error('[Stream] Error:', error);
        if (error == null) return 'An unknown error occurred.';
        if (typeof error === 'string') return error;
        if (error instanceof Error) {
          const msg = error.message.toLowerCase();
          if (msg.includes('rate_limit') || msg.includes('rate limit')) return 'Rate limit exceeded. Please wait a moment and try again.';
          if (msg.includes('overloaded') || msg.includes('529')) return 'The model is currently overloaded. Please try again in a few moments.';
          if (msg.includes('invalid_api_key') || msg.includes('authentication')) return 'API authentication error. Please check your API key in settings.';
          if (msg.includes('credit') || msg.includes('billing')) return 'Billing issue detected. Please check your Anthropic account.';
          return error.message;
        }
        return JSON.stringify(error);
      },
    });

    return createUIMessageStreamResponse({ stream });
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

// DEPRECATED: This endpoint returns hardcoded models.
// Use GET /api/org/[slug]/models instead, which returns role-filtered models from the Model Registry.
// Kept for backward compatibility -- will be removed in a future phase.
export async function GET() {
  const models = [
    {
      id: 'claude-opus-4-6',
      name: 'Claude 4.6 Opus',
      description: 'Most powerful model with adaptive thinking',
      supportsReasoning: true,
    },
    {
      id: 'claude-sonnet-4-6',
      name: 'Claude 4.6 Sonnet',
      description: 'Fast and intelligent with adaptive thinking',
      supportsReasoning: true,
    },
    {
      id: 'claude-sonnet-4-5-20250929',
      name: 'Claude 4.5 Sonnet',
      description: 'Most intelligent, best for complex tasks with extended thinking',
      supportsReasoning: true,
    },
    {
      id: 'claude-haiku-4-5-20251001',
      name: 'Claude 4.5 Haiku',
      description: 'Fast and efficient with thinking capabilities',
      supportsReasoning: true,
    },
    {
      id: 'claude-opus-4-5-20251101',
      name: 'Claude 4.5 Opus',
      description: 'Most capable model for complex reasoning and analysis',
      supportsReasoning: true,
    },
    {
      id: 'claude-opus-4-20250514',
      name: 'Claude 4 Opus',
      description: 'Advanced reasoning and deep analysis',
      supportsReasoning: true,
    },
    {
      id: 'claude-sonnet-4-20250514',
      name: 'Claude 4 Sonnet',
      description: 'Balanced performance with reasoning support',
      supportsReasoning: true,
    },
  ];

  return Response.json({
    models,
    defaultModel: 'claude-sonnet-4-5-20250929'
  });
}
