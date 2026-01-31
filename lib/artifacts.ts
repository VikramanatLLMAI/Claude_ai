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
export function hasPartialArtifactTag(content: string): boolean {
  if (!content) return false;

  // Check for partial opening tag at the end - must start with "<a" at minimum to be considered artifact-related
  // Matches: <a, <ar, <art, <arti, <artif, <artifa, <artifac, <artifact, <artifact id=...
  const partialTagPattern = /<a(?:r(?:t(?:i(?:f(?:a(?:c(?:t)?)?)?)?)?)?)?(?:\s[^>]*)?$/i;
  return partialTagPattern.test(content);
}

// Get text that appears BEFORE the first artifact tag (handles partial tags too)
export function getTextBeforeArtifact(content: string): string {
  if (!content) return '';

  // First check for complete artifact tag
  const artifactStart = content.search(/<artifact\s+/i);
  if (artifactStart !== -1) {
    return content.substring(0, artifactStart).trim();
  }

  // Check for partial artifact tag at the end (during streaming)
  // Remove any trailing partial tag like "<a", "<art", "<artifact"
  const cleaned = content.replace(/<a(?:r(?:t(?:i(?:f(?:a(?:c(?:t)?)?)?)?)?)?)?(?:\s[^>]*)?$/i, '');
  return cleaned.trim();
}

// Get text that appears AFTER the last artifact closing tag
export function getTextAfterArtifact(content: string): string {
  if (!content) return '';

  const lastCloseIndex = content.lastIndexOf('</artifact>');
  if (lastCloseIndex === -1) return '';

  return content.substring(lastCloseIndex + '</artifact>'.length).trim();
}

// Check if an artifact is currently streaming (has open tag but no close tag, OR has partial tag)
export function isArtifactStreaming(content: string): boolean {
  if (!content) return false;

  // Check for complete open tags vs close tags
  const openMatches = content.match(/<artifact\s+[^>]*>/gi) || [];
  const closeMatches = content.match(/<\/artifact>/gi) || [];

  // If there are more open tags than close tags, artifact is streaming
  if (openMatches.length > closeMatches.length) {
    return true;
  }

  // Also check for partial artifact tag at the end (tag still being written)
  return hasPartialArtifactTag(content);
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
When you need to create substantial HTML content, interactive visualizations, or complete web pages, use the artifact format:

<artifact id="unique-id" type="html" title="Descriptive Title">
HTML CONTENT HERE
</artifact>

Guidelines:
- Use artifacts for complete HTML pages, interactive components, or visualizations
- HTML artifacts can include inline CSS and JavaScript for full interactivity
- Always provide a descriptive, meaningful title
- Include all necessary styles and scripts within the HTML
- Ensure the HTML is self-contained and can be rendered in an iframe
- For simple code snippets, use regular code blocks instead of artifacts
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
