/**
 * Artifact detection and extraction utilities
 */

export interface Artifact {
  type: string
  content: string
  rawMatch: string
}

/**
 * Detect if a message contains artifact tags
 * Supports both <artifacts> and <artifact> tags (singular/plural)
 */
export function hasArtifacts(content: string): boolean {
  if (!content || typeof content !== 'string') return false

  // Check for both <artifacts> and <artifact> tags
  const hasArtifactsTag = /<artifacts\s+type=["'][^"']+["']>[\s\S]*?<\/artifacts>/i.test(content)
  const hasArtifactTag = /<artifact\s+type=["'][^"']+["']>[\s\S]*?<\/artifact>/i.test(content)

  console.log('Artifact detection:', {
    contentLength: content.length,
    hasArtifactsTag,
    hasArtifactTag,
    preview: content.substring(0, 200)
  })

  return hasArtifactsTag || hasArtifactTag
}

/**
 * Extract all artifacts from a message
 * Supports both <artifacts> and <artifact> tags (singular/plural)
 */
export function extractArtifacts(content: string): Artifact[] {
  if (!content || typeof content !== 'string') return []

  const artifacts: Artifact[] = []

  // Match both <artifacts> and <artifact> tags with either single or double quotes
  const patterns = [
    /<artifacts\s+type=["']([^"']+)["']>([\s\S]*?)<\/artifacts>/gi,
    /<artifact\s+type=["']([^"']+)["']>([\s\S]*?)<\/artifact>/gi
  ]

  for (const pattern of patterns) {
    let match
    while ((match = pattern.exec(content)) !== null) {
      artifacts.push({
        type: match[1],
        content: match[2].trim(),
        rawMatch: match[0],
      })
    }
  }

  console.log('Extracted artifacts:', artifacts.length, artifacts.map(a => ({ type: a.type, contentLength: a.content.length })))

  return artifacts
}

/**
 * Remove artifact tags from content, keeping only the text
 */
export function removeArtifactTags(content: string): string {
  if (!content || typeof content !== 'string') return content

  // Remove both <artifacts> and <artifact> tags
  let result = content.replace(/<artifacts\s+type=["'][^"']+["']>[\s\S]*?<\/artifacts>/gi, '')
  result = result.replace(/<artifact\s+type=["'][^"']+["']>[\s\S]*?<\/artifact>/gi, '')

  return result
}

/**
 * Get the message content without artifacts (for display in chat)
 */
export function getMessageWithoutArtifacts(content: string): string {
  return removeArtifactTags(content).trim()
}
