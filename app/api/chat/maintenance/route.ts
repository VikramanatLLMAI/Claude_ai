import { bedrock } from "@/lib/bedrock"
import { streamText, tool } from "ai"
import { z } from "zod"
import { prisma } from "@/lib/db"
import { extractMessageText, toModelMessages } from "@/lib/chat-messages"
import { buildMessagesWithSystemPrompt } from "@/lib/system-prompt"

// Claude 4.5 series models available on Amazon Bedrock
export const CLAUDE_MODELS = [
  {
    id: "us.anthropic.claude-sonnet-4-5-20250929-v1:0",
    name: "Claude 4.5 Sonnet",
    description: "Most intelligent model, best for complex tasks",
  },
  {
    id: "us.anthropic.claude-haiku-4-5-20251001-v1:0",
    name: "Claude 4.5 Haiku",
    description: "Fast and efficient for simple tasks",
  },
  {
    id: "us.anthropic.claude-opus-4-5-20251101-v1:0",
    name: "Claude 4.5 Opus",
    description: "Best for complex reasoning and analysis",
  },
  {
    id: "us.anthropic.claude-sonnet-4-20250514-v1:0",
    name: "Claude 4 Sonnet",
    description: "Balanced performance and speed",
  },
] as const

export type ClaudeModelId = (typeof CLAUDE_MODELS)[number]["id"]

// Maintenance-specific system prompt
const MAINTENANCE_SYSTEM_PROMPT = `You are an AI assistant specialized in Maintenance & Reliability, focusing on MTBF (Mean Time Between Failures) and MTTR (Mean Time To Repair).

Your expertise includes:
- Automatic MTBF calculation and analysis
- MTTR calculation and optimization
- Failure prediction and preventive maintenance
- Recurring failure detection and root cause analysis
- Maintenance dashboards and KPI tracking
- Equipment reliability analysis
- Maintenance scheduling optimization

When responding:
1. Focus on equipment reliability, failure patterns, and maintenance metrics
2. Provide statistical analysis of failure data (MTBF, MTTR, availability, reliability)
3. Identify patterns in equipment failures and suggest preventive measures
4. Recommend maintenance strategies (preventive, predictive, condition-based)
5. Use maintenance terminology appropriately (MTBF, MTTR, OEE, uptime, downtime, etc.)

Always be data-driven, proactive, and focused on maximizing equipment reliability and minimizing downtime.`

// Web search tool
const webSearchTool = tool({
  description:
    "Search the web for current information. Use this when you need up-to-date information or facts you don't know.",
  inputSchema: z.object({
    query: z.string().describe("The search query to look up on the web"),
  }),
  execute: async ({ query }) => {
    console.log(`Web search for: ${query}`)
    return {
      results: [
        {
          title: `Search results for: ${query}`,
          snippet:
            "This is a placeholder for web search results. Integrate with a real search API (e.g., Tavily, Serper, or Google Custom Search) for actual results.",
          url: "https://example.com",
        },
      ],
    }
  },
})

export async function POST(req: Request) {
  const { messages, model = CLAUDE_MODELS[0].id, conversationId } = await req.json()

  // Save user message to database if conversationId is provided
  if (conversationId && messages.length > 0) {
    const lastUserMessage = messages[messages.length - 1]
    if (lastUserMessage.role === "user") {
      await prisma.message.create({
        data: {
          role: "user",
          content: extractMessageText(lastUserMessage),
          conversationId,
        },
      })
    }
  }

  // Add system prompt to messages
  const messagesWithSystem = buildMessagesWithSystemPrompt(
    messages,
    MAINTENANCE_SYSTEM_PROMPT
  )

  const modelMessages = await toModelMessages(messagesWithSystem)

  const result = streamText({
    model: bedrock(model),
    messages: modelMessages,
    tools: {
      webSearch: webSearchTool,
    },onFinish: async ({ text }) => {
      // Save assistant message to database if conversationId is provided
      if (conversationId && text) {
        await prisma.message.create({
          data: {
            role: "assistant",
            content: text,
            conversationId,
          },
        })

        // Update conversation title if it's the first message
        const conversation = await prisma.conversation.findUnique({
          where: { id: conversationId },
          include: { messages: true },
        })

        if (conversation && conversation.messages.length <= 2) {
          // Generate title from first user message
          const firstUserMessage = messages.find((m: { role: string }) => m.role === "user")
          if (firstUserMessage) {
            const firstUserText = extractMessageText(firstUserMessage)
            const title = firstUserText.slice(0, 50) + (firstUserText.length > 50 ? "..." : "")
            await prisma.conversation.update({
              where: { id: conversationId },
              data: { title },
            })
          }
        }

        // Update conversation timestamp
        await prisma.conversation.update({
          where: { id: conversationId },
          data: { updatedAt: new Date() },
        })
      }
    },
  })

  return result.toUIMessageStreamResponse()
}

// GET endpoint to retrieve available models
export async function GET() {
  return Response.json({
    models: CLAUDE_MODELS,
    solutionType: "maintenance",
    capabilities: [
      "Automatic MTBF calculation",
      "MTTR calculation",
      "Failure prediction",
      "Recurring failure detection",
      "Maintenance dashboards",
    ]
  })
}






