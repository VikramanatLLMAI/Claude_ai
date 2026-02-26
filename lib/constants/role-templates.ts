/**
 * Default Role Template Definitions
 *
 * These are the source of truth for system role templates that get copied
 * into new organizations on creation. Three tiers with differentiated
 * model access, permissions, and system instructions.
 *
 * Super Admin can view, edit (via override file), and reset these templates.
 * Template edits only affect newly created orgs -- existing orgs keep their copies.
 */

/**
 * All available Claude model IDs supported by the platform.
 * Used for validation and as the full model list for Technical tier.
 */
export const AVAILABLE_MODELS = [
  'claude-opus-4-6',
  'claude-sonnet-4-6',
  'claude-sonnet-4-5-20250929',
  'claude-haiku-4-5-20251001',
  'claude-opus-4-5-20251101',
  'claude-opus-4-20250514',
  'claude-sonnet-4-20250514',
] as const;

/**
 * Shape of a role template definition.
 */
export interface RoleTemplate {
  name: string;
  description: string;
  isSystemRole: true;
  allowedModels: string[];
  permissions: string[];
  systemInstructions: string;
  customInstructionsEnabled: boolean;
  customInstructionsMaxLength: number;
  dailyRequestLimit: number | null;
  dailyTokenLimit: number | null;
}

/**
 * Default role templates -- Technical, Business, Basic.
 *
 * Technical: Full access to all models and features. For developers and technical users.
 * Business: Balanced access with Sonnet/Haiku models. For business users and analysts.
 * Basic: Essential chat with lightweight models. For general users with usage limits.
 */
export const DEFAULT_ROLE_TEMPLATES: RoleTemplate[] = [
  {
    name: 'Technical',
    description:
      'Full access to all models and features. Designed for developers, engineers, and technical power users who need advanced capabilities.',
    isSystemRole: true,
    allowedModels: [
      'claude-opus-4-6',
      'claude-sonnet-4-6',
      'claude-sonnet-4-5-20250929',
      'claude-haiku-4-5-20251001',
      'claude-opus-4-5-20251101',
      'claude-opus-4-20250514',
      'claude-sonnet-4-20250514',
    ],
    permissions: ['chat', 'mcp', 'artifacts', 'file_upload', 'web_search'],
    systemInstructions:
      'You are a technical assistant for software engineers and developers. Provide detailed technical explanations, include code examples when relevant, assist with debugging, and offer architectural guidance. Prefer precision and depth over brevity.',
    customInstructionsEnabled: true,
    customInstructionsMaxLength: 1000,
    dailyRequestLimit: null,
    dailyTokenLimit: null,
  },
  {
    name: 'Business',
    description:
      'Balanced access with Sonnet and Haiku models. Designed for business users, analysts, and project managers.',
    isSystemRole: true,
    allowedModels: [
      'claude-sonnet-4-6',
      'claude-sonnet-4-5-20250929',
      'claude-haiku-4-5-20251001',
      'claude-sonnet-4-20250514',
    ],
    permissions: ['chat', 'artifacts', 'file_upload'],
    systemInstructions:
      'You are a business assistant focused on clarity and actionable insights. Provide concise summaries, strategic analysis, and recommendations in business-friendly language. Use bullet points and structured formats for easy scanning.',
    customInstructionsEnabled: true,
    customInstructionsMaxLength: 1000,
    dailyRequestLimit: null,
    dailyTokenLimit: null,
  },
  {
    name: 'Basic',
    description:
      'Essential chat access with lightweight models. Designed for general users with standard needs.',
    isSystemRole: true,
    allowedModels: ['claude-haiku-4-5-20251001', 'claude-sonnet-4-20250514'],
    permissions: ['chat'],
    systemInstructions:
      'You are a helpful assistant. Provide clear, accurate, and friendly responses to help users with their questions and tasks.',
    customInstructionsEnabled: true,
    customInstructionsMaxLength: 500,
    dailyRequestLimit: 50,
    dailyTokenLimit: 100000,
  },
];
