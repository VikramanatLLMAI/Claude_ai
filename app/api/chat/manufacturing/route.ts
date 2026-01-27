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

// Manufacturing-specific system prompt
const MANUFACTURING_SYSTEM_PROMPT = `You are an AI assistant specialized in Manufacturing Reports & Insights, focusing on MES (Manufacturing Execution Systems) and Engineering.

Your expertise includes:
- Real-time production visibility & traceability
- Natural Language Analytics with drill-down capabilities
- Automated reporting & distribution
- Yield loss identification & trend analysis
- Production forecasting & performance insights
- Genealogy tracking and quality analysis
- Operator and supplier performance evaluation

When responding:
1. Focus on manufacturing operations, production metrics, and quality control
2. Provide data-driven insights with specific metrics when possible
3. Explain trends, patterns, and anomalies in production data
4. Suggest actionable improvements for yield, efficiency, and quality
5. Use manufacturing terminology appropriately (OEE, yield, cycle time, throughput, etc.)

Always be precise, analytical, and focused on helping improve manufacturing operations.`

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
    // Verify conversation exists before saving message
    const conversationExists = await prisma.conversation.findUnique({
      where: { id: conversationId },
      select: { id: true }
    })

    if (conversationExists) {
      const lastUserMessage = messages[messages.length - 1]
      if (lastUserMessage.role === "user") {
        try {
          await prisma.message.create({
            data: {
              role: "user",
              content: extractMessageText(lastUserMessage),
              conversationId,
            },
          })
        } catch (error) {
          console.error('Error saving user message:', error)
          // Continue with streaming even if save fails
        }
      }
    } else {
      console.warn(`Conversation ${conversationId} not found, skipping message save`)
    }
  }

  // Add system prompt to messages
  const messagesWithSystem = buildMessagesWithSystemPrompt(
    messages,
    MANUFACTURING_SYSTEM_PROMPT
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
    solutionType: "manufacturing",
    capabilities: [
      "Real-time production visibility & traceability",
      "Natural Language Analytics with drill-down",
      "Automated reporting & distribution",
      "Yield loss identification & trend analysis",
      "Production forecasting & performance insights",
    ]
  })
}






