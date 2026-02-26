/**
 * Role Template Service
 *
 * Manages system role templates (Technical, Business, Basic).
 * Templates are stored as constants in lib/constants/role-templates.ts.
 * Overrides are stored in .data/role-templates.json for runtime edits.
 *
 * - getTemplates(): Returns templates merged with any overrides
 * - getTemplate(name): Single template by name
 * - updateTemplate(name, data): Store override in JSON file
 * - resetTemplate(name): Remove override, reverting to default
 *
 * (STPL-01, STPL-02, STPL-03)
 */

import fs from 'fs';
import path from 'path';
import prisma from '@/lib/db';
import {
  DEFAULT_ROLE_TEMPLATES,
  type RoleTemplate,
} from '@/lib/constants/role-templates';

// ============================================
// Override File Management
// ============================================

const DATA_DIR = path.join(process.cwd(), '.data');
const OVERRIDES_FILE = path.join(DATA_DIR, 'role-templates.json');

type TemplateOverrides = Record<string, Partial<RoleTemplate>>;

/**
 * Read template overrides from the JSON file.
 * Returns empty object if file does not exist.
 */
function readOverrides(): TemplateOverrides {
  try {
    if (fs.existsSync(OVERRIDES_FILE)) {
      const content = fs.readFileSync(OVERRIDES_FILE, 'utf-8');
      return JSON.parse(content) as TemplateOverrides;
    }
  } catch {
    // If file is corrupt or unreadable, ignore overrides
    console.warn('Warning: Could not read role template overrides file');
  }
  return {};
}

/**
 * Write template overrides to the JSON file.
 * Creates .data/ directory if it does not exist.
 */
function writeOverrides(overrides: TemplateOverrides): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  fs.writeFileSync(OVERRIDES_FILE, JSON.stringify(overrides, null, 2), 'utf-8');
}

/**
 * Merge a default template with its override (if any).
 */
function mergeTemplate(
  template: RoleTemplate,
  override?: Partial<RoleTemplate>
): RoleTemplate {
  if (!override) return { ...template };
  return {
    ...template,
    ...override,
    isSystemRole: true, // Always keep isSystemRole true
  };
}

// ============================================
// Public API
// ============================================

/**
 * Get all role templates (defaults merged with any overrides).
 * (STPL-01)
 */
export async function getTemplates(): Promise<RoleTemplate[]> {
  const overrides = readOverrides();
  return DEFAULT_ROLE_TEMPLATES.map((template) =>
    mergeTemplate(template, overrides[template.name])
  );
}

/**
 * Get a single role template by name.
 * Returns null if not found.
 */
export async function getTemplate(
  name: string
): Promise<RoleTemplate | null> {
  const defaultTemplate = DEFAULT_ROLE_TEMPLATES.find(
    (t) => t.name.toLowerCase() === name.toLowerCase()
  );
  if (!defaultTemplate) return null;

  const overrides = readOverrides();
  return mergeTemplate(defaultTemplate, overrides[defaultTemplate.name]);
}

/**
 * Update a role template by storing an override.
 * Does not modify the default constants -- stores override in .data/role-templates.json.
 * (STPL-02)
 */
export async function updateTemplate(
  name: string,
  data: Partial<RoleTemplate>,
  actorId: string,
  ipAddress: string | null
): Promise<RoleTemplate> {
  const defaultTemplate = DEFAULT_ROLE_TEMPLATES.find(
    (t) => t.name.toLowerCase() === name.toLowerCase()
  );
  if (!defaultTemplate) {
    throw new Error('Template not found');
  }

  const overrides = readOverrides();
  const existingOverride = overrides[defaultTemplate.name] ?? {};

  // Merge new data with existing override
  overrides[defaultTemplate.name] = {
    ...existingOverride,
    ...data,
    // Prevent changing the name field via override -- name is the identifier
    name: undefined,
    isSystemRole: undefined,
  };

  // Clean up undefined values
  const override = overrides[defaultTemplate.name];
  if (override) {
    Object.keys(override).forEach((key) => {
      if (override[key as keyof typeof override] === undefined) {
        delete override[key as keyof typeof override];
      }
    });
  }

  writeOverrides(overrides);

  // Audit log (outside transaction since templates are not in DB)
  await prisma.auditLog.create({
    data: {
      userId: actorId,
      action: 'template.updated',
      targetType: 'RoleTemplate',
      targetId: defaultTemplate.name,
      ipAddress,
      metadata: {
        templateName: defaultTemplate.name,
        updatedFields: Object.keys(data),
      },
    },
  });

  return mergeTemplate(defaultTemplate, overrides[defaultTemplate.name]);
}

/**
 * Reset a role template to its default values by removing the override.
 * (STPL-03)
 */
export async function resetTemplate(
  name: string,
  actorId: string,
  ipAddress: string | null
): Promise<RoleTemplate> {
  const defaultTemplate = DEFAULT_ROLE_TEMPLATES.find(
    (t) => t.name.toLowerCase() === name.toLowerCase()
  );
  if (!defaultTemplate) {
    throw new Error('Template not found');
  }

  const overrides = readOverrides();
  delete overrides[defaultTemplate.name];
  writeOverrides(overrides);

  // Audit log
  await prisma.auditLog.create({
    data: {
      userId: actorId,
      action: 'template.reset',
      targetType: 'RoleTemplate',
      targetId: defaultTemplate.name,
      ipAddress,
      metadata: {
        templateName: defaultTemplate.name,
      },
    },
  });

  return { ...defaultTemplate };
}
