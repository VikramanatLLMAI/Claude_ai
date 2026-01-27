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
 */
export function hasArtifacts(content: string): boolean {
  return /<artifacts\s+type="[^"]+">[\s\S]*?<\/artifacts>/i.test(content)
}

/**
 * Extract all artifacts from a message
 */
export function extractArtifacts(content: string): Artifact[] {
  const artifactRegex = /<artifacts\s+type="([^"]+)">([\s\S]*?)<\/artifacts>/gi
  const artifacts: Artifact[] = []
  let match

  while ((match = artifactRegex.exec(content)) !== null) {
    artifacts.push({
      type: match[1],
      content: match[2].trim(),
      rawMatch: match[0],
    })
  }

  return artifacts
}

/**
 * Remove artifact tags from content, keeping only the text
 */
export function removeArtifactTags(content: string): string {
  return content.replace(/<artifacts\s+type="[^"]+">([\s\S]*?)<\/artifacts>/gi, "")
}

/**
 * Get the message content without artifacts (for display in chat)
 */
export function getMessageWithoutArtifacts(content: string): string {
  return removeArtifactTags(content).trim()
}
