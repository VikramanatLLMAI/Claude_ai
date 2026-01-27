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

  // More flexible regex - checks for <artifact with any attributes
  const hasArtifactTag = /<artifact\s+[^>]*type=/i.test(content) && /<\/artifact>/i.test(content)

  console.log('Artifact detection:', {
    contentLength: content.length,
    hasArtifactTag,
    hasOpenTag: /<artifact\s+/i.test(content),
    hasCloseTag: /<\/artifact>/i.test(content),
    hasTypeAttr: /type=/i.test(content),
    preview: content.substring(0, 300),
    searchFor: '<artifact'
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

  // More flexible pattern - extract attributes separately
  // This handles any whitespace and attribute order
  const artifactRegex = /<artifact\s+([^>]+)>([\s\S]*?)<\/artifact>/gi

  let match
  while ((match = artifactRegex.exec(content)) !== null) {
    const attributes = match[1]
    const artifactContent = match[2]

    // Extract individual attributes
    const typeMatch = /type=["']([^"']+)["']/i.exec(attributes)
    const titleMatch = /title=["']([^"']*?)["']/i.exec(attributes)
    const languageMatch = /language=["']([^"']+)["']/i.exec(attributes)

    if (typeMatch) {
      artifacts.push({
        type: typeMatch[1],
        title: titleMatch ? titleMatch[1] : 'Untitled',
        language: languageMatch ? languageMatch[1] : 'text',
        content: artifactContent.trim(),
        rawMatch: match[0],
      })
    }
  }

  console.log('Extracted artifacts:', artifacts.length, artifacts.map(a => ({
    type: a.type,
    title: a.title,
    language: a.language,
    contentLength: a.content.length,
    contentPreview: a.content.substring(0, 100)
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
