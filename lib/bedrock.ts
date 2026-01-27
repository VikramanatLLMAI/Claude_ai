import { createAmazonBedrock } from "@ai-sdk/amazon-bedrock"

const DEFAULT_BEDROCK_REGION = "us-west-2"

function sanitizeRegion(value: string | undefined): string {
  if (!value) {
    return DEFAULT_BEDROCK_REGION
  }

  // Allow inline comments in .env (e.g., "us-west-2 # Bedrock region") by
  // stripping everything after "#" and trimming whitespace.
  const withoutComment = value.split("#", 1)[0]
  const trimmed = withoutComment.trim()

  return trimmed || DEFAULT_BEDROCK_REGION
}

const resolvedRegion = sanitizeRegion(
  process.env.AWS_BEDROCK_REGION ?? process.env.AWS_REGION
)

export const bedrock = createAmazonBedrock({
  region: resolvedRegion,
})

export const bedrockRegion = resolvedRegion