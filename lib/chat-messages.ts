import { convertToModelMessages, type ModelMessage, type UIMessage } from "ai"

type LegacyMessage = {
  id?: string
  role: "system" | "user" | "assistant"
  content: string
}

type MessageLike = UIMessage | LegacyMessage

function isUIMessage(message: MessageLike): message is UIMessage {
  return Array.isArray((message as UIMessage).parts)
}

function toTextParts(content: unknown) {
  if (typeof content !== "string") {
    return [{ type: "text" as const, text: "" }]
  }

  return [{ type: "text" as const, text: content }]
}

export function normalizeToUIMessages(messages: MessageLike[]): UIMessage[] {
  return messages.map((message, index) => {
    if (isUIMessage(message)) {
      return message
    }

    return {
      id: typeof message.id === "string" ? message.id : `legacy-${index}`,
      role: message.role,
      parts: toTextParts(message.content),
    }
  })
}

export async function toModelMessages(messages: MessageLike[]): Promise<ModelMessage[]> {
  const uiMessages = normalizeToUIMessages(messages)
  const messagesWithoutId = uiMessages.map((message) => ({
    role: message.role,
    metadata: message.metadata,
    parts: message.parts,
  }))
  return convertToModelMessages(messagesWithoutId)
}

export function extractMessageText(message: MessageLike): string {
  if (isUIMessage(message)) {
    return message.parts
      .filter((part) => part.type === "text" || part.type === "reasoning")
      .map((part) => ("text" in part ? part.text : ""))
      .join("")
  }

  return typeof message.content === "string" ? message.content : ""
}
