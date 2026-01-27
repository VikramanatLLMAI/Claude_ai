/**
 * Artifact detection and extraction utilities
 */

export interface Artifact {
  type: string
  title: string
  language: string
  content: string
  rawMatch: string
}

/**
 * Detect if a message contains artifact tags
 * Format: <artifact type="TYPE" title="TITLE" language="LANG">content</artifact>
 */
export function hasArtifacts(content: string): boolean {
  if (!content || typeof content !== 'string') return false

  // Check for artifact tags with type, title, and language attributes
  const hasArtifactTag = /<artifact\s+type=["'][^"']+["']\s+title=["'][^"']*["']\s+language=["'][^"']+["']>[\s\S]*?<\/artifact>/i.test(content)

  console.log('Artifact detection:', {
    contentLength: content.length,
    hasArtifactTag,
    preview: content.substring(0, 200)
  })

  return hasArtifactTag
}

/**
 * Extract all artifacts from a message
 * Format: <artifact type="TYPE" title="TITLE" language="LANG">content</artifact>
 */
export function extractArtifacts(content: string): Artifact[] {
  if (!content || typeof content !== 'string') return []

  const artifacts: Artifact[] = []

  // Match artifact tags with type, title, and language attributes
  // Supports both single and double quotes, and flexible attribute order
  const pattern = /<artifact\s+(?:type=["']([^"']+)["']\s+)?(?:title=["']([^"']*?)["']\s+)?(?:language=["']([^"']+)["']\s*)?(?:type=["']([^"']+)["']\s+)?(?:title=["']([^"']*?)["']\s+)?(?:language=["']([^"']+)["'])?[^>]*>([\s\S]*?)<\/artifact>/gi

  // Simpler pattern that expects specific order: type, title, language
  const simplePattern = /<artifact\s+type=["']([^"']+)["']\s+title=["']([^"']*?)["']\s+language=["']([^"']+)["']>([\s\S]*?)<\/artifact>/gi

  let match
  while ((match = simplePattern.exec(content)) !== null) {
    artifacts.push({
      type: match[1],
      title: match[2],
      language: match[3],
      content: match[4].trim(),
      rawMatch: match[0],
    })
  }

  console.log('Extracted artifacts:', artifacts.length, artifacts.map(a => ({
    type: a.type,
    title: a.title,
    language: a.language,
    contentLength: a.content.length
  })))

  return artifacts
}

/**
 * Remove artifact tags from content, keeping only the text
 */
export function removeArtifactTags(content: string): string {
  if (!content || typeof content !== 'string') return content

  // Remove artifact tags with any attributes
  const result = content.replace(/<artifact\s+[^>]*>[\s\S]*?<\/artifact>/gi, '')

  return result
}

/**
 * Get the message content without artifacts (for display in chat)
 */
export function getMessageWithoutArtifacts(content: string): string {
  return removeArtifactTags(content).trim()
}
