import { z } from 'zod';

// Artifact types - simplified to HTML and code only
export const ARTIFACT_TYPES = [
  'html',
  'code',
] as const;

export type ArtifactType = typeof ARTIFACT_TYPES[number];

// Artifact schema
export const ArtifactSchema = z.object({
  id: z.string(),
  type: z.enum(ARTIFACT_TYPES),
  title: z.string(),
  content: z.string(),
  language: z.string().optional(),
});

export type Artifact = z.infer<typeof ArtifactSchema>;

// Parse artifacts from message content
export function parseArtifacts(content: string): { artifacts: Artifact[]; cleanContent: string } {
  const artifacts: Artifact[] = [];
  let cleanContent = content;
  let artifactIndex = 0;

  // Find all artifact blocks
  const artifactBlockRegex = /<artifact\s+(?:id="([^"]+)"\s+)?type="([^"]+)"(?:\s+title="([^"]*)")?(?:\s+language="([^"]*)")?[^>]*>([\s\S]*?)<\/artifact>/gi;

  let match;
  while ((match = artifactBlockRegex.exec(content)) !== null) {
    const [fullMatch, id, type, title, language, artifactContent] = match;

    const artifact: Artifact = {
      id: id || `artifact-${Date.now()}-${artifactIndex++}`,
      type: (type === 'code' ? 'code' : 'html') as ArtifactType,
      title: title || `Artifact ${artifactIndex}`,
      content: artifactContent.trim(),
      language: language || inferLanguage(type as ArtifactType, artifactContent),
    };

    artifacts.push(artifact);

    // Replace artifact block with a placeholder reference
    cleanContent = cleanContent.replace(
      fullMatch,
      `\n\n[Artifact: ${artifact.title}]\n\n`
    );
  }

  return { artifacts, cleanContent: cleanContent.trim() };
}

// Infer programming language from artifact type or content
function inferLanguage(type: ArtifactType, content: string): string | undefined {
  switch (type) {
    case 'code':
      // Try to detect language from content
      if (content.includes('function') && content.includes('=>')) return 'typescript';
      if (content.includes('def ') && content.includes(':')) return 'python';
      if (content.includes('func ') && content.includes('package')) return 'go';
      if (content.includes('fn ') && content.includes('let mut')) return 'rust';
      return 'javascript';
    case 'html':
    default:
      return 'html';
  }
}

// Check if content contains artifacts
export function hasArtifacts(content: string): boolean {
  if (!content) return false;
  // Reset regex lastIndex since we're reusing them
  const openRegex = /<artifact\s+[^>]*>/i;
  const closeRegex = /<\/artifact>/i;
  return openRegex.test(content) && closeRegex.test(content);
}

// Auto-detect if content is a complete HTML document (for implicit artifacts)
export function isCompleteHtmlDocument(content: string): boolean {
  if (!content) return false;

  const trimmed = content.trim();

  // Check for DOCTYPE or html tag at the beginning
  const hasDoctype = /^<!DOCTYPE\s+html/i.test(trimmed);
  const startsWithHtml = /^<html/i.test(trimmed);

  // Check for closing html tag
  const hasClosingHtml = /<\/html\s*>/i.test(trimmed);

  // Must have both opening and closing html tags, or DOCTYPE with closing html
  return (hasDoctype || startsWithHtml) && hasClosingHtml;
}

// Create an artifact from implicit HTML content (content that's HTML but not wrapped in artifact tags)
export function createImplicitHtmlArtifact(content: string, title?: string): Artifact {
  // Try to extract title from HTML
  const titleMatch = content.match(/<title[^>]*>([^<]*)<\/title>/i);
  const extractedTitle = titleMatch?.[1]?.trim();

  return {
    id: `implicit-artifact-${Date.now()}`,
    type: 'html',
    title: title || extractedTitle || 'HTML Document',
    content: content.trim(),
    language: 'html',
  };
}

// Get the streaming artifact content (even if incomplete)
export function getStreamingArtifact(content: string): { artifact: Artifact | null; isComplete: boolean } {
  if (!content) return { artifact: null, isComplete: false };

  // Find the last artifact opening tag
  const openTagRegex = /<artifact\s+([^>]*)>/gi;
  const closeTagRegex = /<\/artifact>/gi;

  let lastOpenMatch: RegExpExecArray | null = null;
  let match;

  while ((match = openTagRegex.exec(content)) !== null) {
    lastOpenMatch = match;
  }

  if (!lastOpenMatch) return { artifact: null, isComplete: false };

  const openTagEnd = lastOpenMatch.index + lastOpenMatch[0].length;
  const attributes = lastOpenMatch[1];

  // Find if there's a closing tag after this opening tag
  closeTagRegex.lastIndex = openTagEnd;
  const closeMatch = closeTagRegex.exec(content);

  const isComplete = closeMatch !== null;
  const artifactContent = isComplete
    ? content.substring(openTagEnd, closeMatch.index)
    : content.substring(openTagEnd);

  // Parse attributes
  const idMatch = attributes.match(/id="([^"]*)"/i);
  const typeMatch = attributes.match(/type="([^"]*)"/i);
  const titleMatch = attributes.match(/title="([^"]*)"/i);
  const languageMatch = attributes.match(/language="([^"]*)"/i);

  const type = typeMatch?.[1] || 'html';

  const artifact: Artifact = {
    id: idMatch?.[1] || `streaming-artifact-${Date.now()}`,
    type: (type === 'code' ? 'code' : 'html') as ArtifactType,
    title: titleMatch?.[1] || 'Artifact',
    content: artifactContent.trim(),
    language: languageMatch?.[1] || 'html',
  };

  return { artifact, isComplete };
}

// Extract artifacts from message content (returns array of Artifact)
export function extractArtifacts(content: string): Artifact[] {
  if (!content) return [];

  const artifacts: Artifact[] = [];
  let artifactIndex = 0;

  // More flexible regex to handle various attribute orderings
  const artifactBlockRegex = /<artifact\s+([^>]*)>([\s\S]*?)<\/artifact>/gi;

  let match;
  while ((match = artifactBlockRegex.exec(content)) !== null) {
    const [, attributes, artifactContent] = match;

    // Parse attributes
    const idMatch = attributes.match(/id="([^"]*)"/i);
    const typeMatch = attributes.match(/type="([^"]*)"/i);
    const titleMatch = attributes.match(/title="([^"]*)"/i);
    const languageMatch = attributes.match(/language="([^"]*)"/i);

    const type = typeMatch?.[1] || 'text';

    const artifact: Artifact = {
      id: idMatch?.[1] || `artifact-${Date.now()}-${artifactIndex++}`,
      type: (type === 'code' ? 'code' : 'html') as ArtifactType,
      title: titleMatch?.[1] || `Artifact ${artifactIndex + 1}`,
      content: artifactContent.trim(),
      language: languageMatch?.[1] || inferLanguage(type === 'code' ? 'code' : 'html', artifactContent),
    };

    artifacts.push(artifact);
  }

  return artifacts;
}

// Get message content without artifact blocks
export function getMessageWithoutArtifacts(content: string): string {
  if (!content) return '';

  // Remove complete artifact blocks
  let cleaned = content.replace(/<artifact\s+[^>]*>[\s\S]*?<\/artifact>/gi, '');

  // Also remove incomplete/streaming artifacts (open tag without close)
  cleaned = cleaned.replace(/<artifact\s+[^>]*>[\s\S]*$/gi, '');

  return cleaned.trim();
}

// Check if content ends with a partial artifact tag (e.g., "<a", "<art", "<artifact", "<artifact ")
// Optimized: Use string operations instead of regex for better performance during streaming
export function hasPartialArtifactTag(content: string): boolean {
  if (!content || content.length < 2) return false;

  // Find last '<' character
  const lastOpenBracket = content.lastIndexOf('<');
  if (lastOpenBracket === -1) return false;

  // Get the partial tag
  const partialTag = content.substring(lastOpenBracket).toLowerCase();

  // Check if it's the start of an artifact opening tag
  const artifactPrefix = '<artifact';
  // Check if it's the start of a closing tag (e.g., '</artif' during streaming)
  const closePrefix = '</artifact';

  if (partialTag.length > artifactPrefix.length) {
    // If longer than '<artifact', check if it starts with '<artifact' and has no '>'
    return partialTag.startsWith(artifactPrefix) && !partialTag.includes('>');
  }

  // Check if '<artifact' or '</artifact' starts with our partial tag
  return artifactPrefix.startsWith(partialTag) || closePrefix.startsWith(partialTag);
}

// Get text that appears BEFORE the first artifact tag (handles partial tags too)
// Optimized: Use indexOf instead of regex search
export function getTextBeforeArtifact(content: string): string {
  if (!content) return '';

  // First check for complete artifact tag using regex (handles space, newline, tab after 'artifact')
  const artifactMatch = content.match(/<artifact[\s>]/i);
  if (artifactMatch && artifactMatch.index !== undefined) {
    return content.substring(0, artifactMatch.index).trim();
  }

  // Check for partial artifact tag at the end (during streaming)
  const lastOpenBracket = content.lastIndexOf('<');
  if (lastOpenBracket !== -1) {
    const partialTag = content.substring(lastOpenBracket).toLowerCase();
    const artifactPrefix = '<artifact';
    // If it looks like a partial artifact tag, remove it
    if (artifactPrefix.startsWith(partialTag) || partialTag.startsWith(artifactPrefix)) {
      return content.substring(0, lastOpenBracket).trim();
    }
  }

  return content.trim();
}

// Get text that appears AFTER the last artifact closing tag
export function getTextAfterArtifact(content: string): string {
  if (!content) return '';

  const lastCloseIndex = content.lastIndexOf('</artifact>');
  if (lastCloseIndex === -1) return '';

  return content.substring(lastCloseIndex + '</artifact>'.length).trim();
}

// Check if an artifact is currently streaming (has open tag but no close tag, OR has partial tag)
// Optimized: Count tags using indexOf loop instead of regex match()
export function isArtifactStreaming(content: string): boolean {
  if (!content) return false;

  // Fast check for partial tag first (most common during streaming)
  if (hasPartialArtifactTag(content)) {
    return true;
  }

  // Count open tags using regex (handles space, newline, tab after 'artifact')
  let openCount = 0;
  const openTagRegex = /<artifact\s/gi;
  let openMatch;
  while ((openMatch = openTagRegex.exec(content)) !== null) {
    const closePos = content.indexOf('>', openMatch.index);
    if (closePos !== -1) {
      openCount++;
      openTagRegex.lastIndex = closePos + 1;
    } else {
      // Open tag without '>' - still streaming
      return true;
    }
  }

  // Count close tags
  let closeCount = 0;
  let pos = 0;
  while ((pos = content.indexOf('</artifact>', pos)) !== -1) {
    closeCount++;
    pos += 11; // length of '</artifact>'
  }

  return openCount > closeCount;
}

// Extract artifact IDs from content
export function extractArtifactIds(content: string): string[] {
  const ids: string[] = [];
  const regex = /<artifact\s+id="([^"]+)"/gi;
  let match;
  while ((match = regex.exec(content)) !== null) {
    ids.push(match[1]);
  }
  return ids;
}

// Create artifact XML for Claude to generate
export function createArtifactPrompt(): string {
  return `
**MANDATORY: How to output HTML dashboards and visualizations**

You MUST wrap ALL HTML content in artifact tags. NEVER output raw HTML or HTML inside markdown code blocks (\`\`\`html). The ONLY accepted format is:

<artifact id="unique-id" type="html" title="Descriptive Title">
YOUR COMPLETE HTML HERE
</artifact>

**Rules:**
- ALWAYS use <artifact> tags for ANY HTML output — dashboards, charts, tables, visualizations, reports
- NEVER use \`\`\`html code blocks for HTML content — the UI cannot render them
- NEVER paste raw HTML into the chat — it will display as unreadable code
- Keep your text response concise (2-4 sentences summary + key insights). Put ALL visual content inside the artifact
- Include all CSS and JavaScript inline within the HTML artifact
- Always provide a descriptive title

**CRITICAL iframe layout rules** (artifacts render inside a fixed-size iframe panel):
- Always set \`html, body { margin: 0; height: 100vh; overflow-y: auto; }\` so the page scrolls inside the iframe
- Use a single scrollable wrapper div (e.g. \`<div style="padding:20px; min-height:100vh;">\`) instead of setting padding on body
- Never rely on the page expanding infinitely — the iframe has a fixed viewport height
- For dashboards with many sections, use \`overflow-y: auto\` on the main container
- Charts: use \`maintainAspectRatio: true\` and reasonable max-heights (200-300px) so they don't dominate the viewport
- Tables: wrap in a container with \`overflow-x: auto\` for horizontal scroll on narrow viewports
- Test assumption: the iframe viewport is roughly 600-800px tall — design content to be scannable within that height with scrolling for overflow
`;
}

// Get file extension for artifact type
export function getArtifactExtension(artifact: Artifact): string {
  switch (artifact.type) {
    case 'html':
      return '.html';
    case 'code':
      switch (artifact.language) {
        case 'typescript':
        case 'tsx':
          return '.tsx';
        case 'javascript':
        case 'jsx':
          return '.jsx';
        case 'python':
          return '.py';
        case 'go':
          return '.go';
        case 'rust':
          return '.rs';
        case 'java':
          return '.java';
        case 'c':
          return '.c';
        case 'cpp':
          return '.cpp';
        case 'csharp':
          return '.cs';
        case 'ruby':
          return '.rb';
        case 'php':
          return '.php';
        case 'swift':
          return '.swift';
        case 'kotlin':
          return '.kt';
        case 'sql':
          return '.sql';
        case 'shell':
        case 'bash':
          return '.sh';
        default:
          return '.js';
      }
    default:
      return '.html';
  }
}

// Get MIME type for artifact
export function getArtifactMimeType(artifact: Artifact): string {
  switch (artifact.type) {
    case 'html':
      return 'text/html';
    case 'code':
    default:
      return 'text/plain';
  }
}
