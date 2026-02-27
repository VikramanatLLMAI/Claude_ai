/**
 * Super Admin seed script + development sample data.
 *
 * Usage:
 *   # With env vars (CI / non-interactive):
 *   SUPER_ADMIN_EMAIL=admin@example.com SUPER_ADMIN_PASSWORD=secret SUPER_ADMIN_NAME="Admin" npx tsx prisma/seed.ts
 *
 *   # Interactive (terminal):
 *   npx tsx prisma/seed.ts
 *
 *   # Dev sample data (adds sample org + roles + users):
 *   NODE_ENV=development npx tsx prisma/seed.ts
 *   npx tsx prisma/seed.ts --dev
 *
 *   # Via npm scripts:
 *   npm run db:seed
 *   npm run db:reset  (force-reset + seed)
 */

import 'dotenv/config';
import { hashPassword } from '../lib/encryption';
import prisma from '../lib/db';
import * as readline from 'node:readline';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Prompt for interactive input. Falls back to error if stdin is not a TTY
 * and env var is not provided (prevents hanging in CI).
 */
async function prompt(question: string): Promise<string> {
  if (!process.stdin.isTTY) {
    throw new Error(
      `Missing required input: "${question.trim()}" ` +
      'Set the corresponding environment variable (SUPER_ADMIN_EMAIL, SUPER_ADMIN_PASSWORD, SUPER_ADMIN_NAME) ' +
      'or run in an interactive terminal.'
    );
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

// ---------------------------------------------------------------------------
// Super Admin creation (always runs, idempotent)
// ---------------------------------------------------------------------------

async function seedSuperAdmin(): Promise<void> {
  console.log('\n--- Super Admin Setup ---\n');

  const email = process.env.SUPER_ADMIN_EMAIL || await prompt('Super Admin email: ');
  const password = process.env.SUPER_ADMIN_PASSWORD || await prompt('Super Admin password: ');
  const name = process.env.SUPER_ADMIN_NAME || await prompt('Super Admin name: ');

  if (!email || !password || !name) {
    throw new Error('Super Admin email, password, and name are all required.');
  }

  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing && existing.isSuperAdmin) {
    console.log(`Super Admin "${email}" already exists. Skipping.`);
    return;
  }

  if (existing && !existing.isSuperAdmin) {
    await prisma.user.update({
      where: { email },
      data: { isSuperAdmin: true },
    });
    console.log(`User "${email}" upgraded to Super Admin.`);
    return;
  }

  const passwordHash = await hashPassword(password);
  await prisma.user.create({
    data: {
      email,
      passwordHash,
      name,
      isSuperAdmin: true,
    },
  });
  console.log(`Super Admin "${email}" created successfully.`);
}

// ---------------------------------------------------------------------------
// Model Registry seeding (always runs, idempotent via upsert)
// ---------------------------------------------------------------------------

/**
 * Seed all 7 Claude models with verified pricing and capabilities.
 * Uses upsert keyed on modelId for idempotency.
 * Pricing stored as per-token values ($/MTok divided by 1,000,000).
 *
 * Pricing reference (per million tokens):
 * - claude-opus-4-6:            $5 input, $25 output, $25 thinking
 * - claude-sonnet-4-6:          $3 input, $15 output, $15 thinking
 * - claude-sonnet-4-5-20250929: $3 input, $15 output, $15 thinking
 * - claude-haiku-4-5-20251001:  $1 input, $5 output, $5 thinking
 * - claude-opus-4-5-20251101:   $5 input, $25 output, $25 thinking
 * - claude-opus-4-20250514:     $15 input, $75 output, $75 thinking
 * - claude-sonnet-4-20250514:   $3 input, $15 output, $15 thinking
 *
 * Cache pricing: write = 1.25x input, read = 0.1x input
 */
async function seedModels(): Promise<void> {
  console.log('\n--- Model Registry ---\n');

  const models = [
    {
      modelId: 'claude-opus-4-6',
      displayName: 'Claude 4.6 Opus',
      generationGroup: 'Claude 4.6',
      inputPricePerToken: 0.000005,        // $5/MTok
      outputPricePerToken: 0.000025,        // $25/MTok
      thinkingPricePerToken: 0.000025,      // $25/MTok
      cacheWritePricePerToken: 0.00000625,  // 1.25x input
      cacheReadPricePerToken: 0.0000005,    // 0.1x input
      supportsThinking: true,
      supportsVision: true,
      supportsTools: true,
      thinkingType: 'adaptive',
      maxOutputTokens: 128000,
      contextWindow: 200000,
      sortOrder: 1,
    },
    {
      modelId: 'claude-sonnet-4-6',
      displayName: 'Claude 4.6 Sonnet',
      generationGroup: 'Claude 4.6',
      inputPricePerToken: 0.000003,         // $3/MTok
      outputPricePerToken: 0.000015,         // $15/MTok
      thinkingPricePerToken: 0.000015,       // $15/MTok
      cacheWritePricePerToken: 0.00000375,   // 1.25x input
      cacheReadPricePerToken: 0.0000003,     // 0.1x input
      supportsThinking: true,
      supportsVision: true,
      supportsTools: true,
      thinkingType: 'adaptive',
      maxOutputTokens: 64000,
      contextWindow: 200000,
      sortOrder: 2,
    },
    {
      modelId: 'claude-sonnet-4-5-20250929',
      displayName: 'Claude 4.5 Sonnet',
      generationGroup: 'Claude 4.5',
      inputPricePerToken: 0.000003,         // $3/MTok
      outputPricePerToken: 0.000015,         // $15/MTok
      thinkingPricePerToken: 0.000015,       // $15/MTok
      cacheWritePricePerToken: 0.00000375,   // 1.25x input
      cacheReadPricePerToken: 0.0000003,     // 0.1x input
      supportsThinking: true,
      supportsVision: true,
      supportsTools: true,
      thinkingType: 'extended',
      maxOutputTokens: 64000,
      contextWindow: 200000,
      sortOrder: 3,
    },
    {
      modelId: 'claude-haiku-4-5-20251001',
      displayName: 'Claude 4.5 Haiku',
      generationGroup: 'Claude 4.5',
      inputPricePerToken: 0.000001,         // $1/MTok
      outputPricePerToken: 0.000005,         // $5/MTok
      thinkingPricePerToken: 0.000005,       // $5/MTok
      cacheWritePricePerToken: 0.00000125,   // 1.25x input
      cacheReadPricePerToken: 0.0000001,     // 0.1x input
      supportsThinking: true,
      supportsVision: true,
      supportsTools: true,
      thinkingType: 'extended',
      maxOutputTokens: 64000,
      contextWindow: 200000,
      sortOrder: 4,
    },
    {
      modelId: 'claude-opus-4-5-20251101',
      displayName: 'Claude 4.5 Opus',
      generationGroup: 'Claude 4.5',
      inputPricePerToken: 0.000005,         // $5/MTok
      outputPricePerToken: 0.000025,         // $25/MTok
      thinkingPricePerToken: 0.000025,       // $25/MTok
      cacheWritePricePerToken: 0.00000625,   // 1.25x input
      cacheReadPricePerToken: 0.0000005,     // 0.1x input
      supportsThinking: true,
      supportsVision: true,
      supportsTools: true,
      thinkingType: 'extended',
      maxOutputTokens: 64000,
      contextWindow: 200000,
      sortOrder: 5,
    },
    {
      modelId: 'claude-opus-4-20250514',
      displayName: 'Claude 4 Opus',
      generationGroup: 'Claude 4',
      inputPricePerToken: 0.000015,         // $15/MTok
      outputPricePerToken: 0.000075,         // $75/MTok
      thinkingPricePerToken: 0.000075,       // $75/MTok
      cacheWritePricePerToken: 0.00001875,   // 1.25x input
      cacheReadPricePerToken: 0.0000015,     // 0.1x input
      supportsThinking: true,
      supportsVision: true,
      supportsTools: true,
      thinkingType: 'extended',
      maxOutputTokens: 32000,
      contextWindow: 200000,
      sortOrder: 6,
    },
    {
      modelId: 'claude-sonnet-4-20250514',
      displayName: 'Claude 4 Sonnet',
      generationGroup: 'Claude 4',
      inputPricePerToken: 0.000003,         // $3/MTok
      outputPricePerToken: 0.000015,         // $15/MTok
      thinkingPricePerToken: 0.000015,       // $15/MTok
      cacheWritePricePerToken: 0.00000375,   // 1.25x input
      cacheReadPricePerToken: 0.0000003,     // 0.1x input
      supportsThinking: true,
      supportsVision: true,
      supportsTools: true,
      thinkingType: 'extended',
      maxOutputTokens: 64000,
      contextWindow: 200000,
      sortOrder: 7,
    },
  ];

  for (const model of models) {
    await prisma.model.upsert({
      where: { modelId: model.modelId },
      create: {
        ...model,
        status: 'ACTIVE',
      },
      update: {
        displayName: model.displayName,
        generationGroup: model.generationGroup,
        inputPricePerToken: model.inputPricePerToken,
        outputPricePerToken: model.outputPricePerToken,
        thinkingPricePerToken: model.thinkingPricePerToken,
        cacheWritePricePerToken: model.cacheWritePricePerToken,
        cacheReadPricePerToken: model.cacheReadPricePerToken,
        supportsThinking: model.supportsThinking,
        supportsVision: model.supportsVision,
        supportsTools: model.supportsTools,
        thinkingType: model.thinkingType,
        maxOutputTokens: model.maxOutputTokens,
        contextWindow: model.contextWindow,
        sortOrder: model.sortOrder,
      },
    });
    console.log(`  Model "${model.displayName}" (${model.modelId}) upserted.`);
  }

  console.log(`\n${models.length} Claude models seeded successfully.`);
}

// ---------------------------------------------------------------------------
// Dev sample data (only in development or with --dev flag)
// ---------------------------------------------------------------------------

async function seedDevData(): Promise<void> {
  const isDev = process.env.NODE_ENV === 'development' || process.argv.includes('--dev');

  if (!isDev) {
    console.log('\nSkipping dev sample data (not in development mode). Use --dev flag or NODE_ENV=development to include.');
    return;
  }

  console.log('\n--- Dev Sample Data ---\n');

  // -------------------------------------------------------------------------
  // 1. Create sample organization "Acme Corp"
  // -------------------------------------------------------------------------
  const existingOrg = await prisma.organization.findFirst({
    where: { slug: 'acme-corp', deletedAt: null },
  });

  if (existingOrg) {
    console.log('Sample org "Acme Corp" already exists. Skipping dev data.');
    return;
  }

  const org = await prisma.organization.create({
    data: {
      name: 'Acme Corp',
      slug: 'acme-corp',
      status: 'ACTIVE',
      logoDisplayMode: 'PLATFORM_AND_ORG',
    },
  });
  console.log(`Organization "${org.name}" created (slug: ${org.slug}).`);

  // -------------------------------------------------------------------------
  // 2. Create 3 system roles
  // -------------------------------------------------------------------------
  const technicalRole = await prisma.role.create({
    data: {
      organizationId: org.id,
      name: 'Technical',
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
      permissions: ['chat', 'mcp', 'artifacts', 'file_upload', 'web_search', 'org_admin'],
    },
  });
  console.log(`  Role "${technicalRole.name}" created (all models, full permissions).`);

  const businessRole = await prisma.role.create({
    data: {
      organizationId: org.id,
      name: 'Business',
      isSystemRole: true,
      allowedModels: [
        'claude-sonnet-4-6',
        'claude-sonnet-4-5-20250929',
        'claude-haiku-4-5-20251001',
      ],
      permissions: ['chat', 'artifacts', 'file_upload'],
    },
  });
  console.log(`  Role "${businessRole.name}" created (3 models, basic permissions).`);

  const basicRole = await prisma.role.create({
    data: {
      organizationId: org.id,
      name: 'Basic',
      isSystemRole: true,
      allowedModels: ['claude-haiku-4-5-20251001'],
      permissions: ['chat'],
      dailyRequestLimit: 50,
      dailyTokenLimit: 100000,
    },
  });
  console.log(`  Role "${basicRole.name}" created (1 model, chat only, rate limited).`);

  // -------------------------------------------------------------------------
  // 3. Create OrgSettings and PasswordPolicy
  // -------------------------------------------------------------------------
  await prisma.orgSettings.create({
    data: {
      organizationId: org.id,
      conversationVisibility: false,
    },
  });
  console.log('  OrgSettings created.');

  await prisma.passwordPolicy.create({
    data: {
      organizationId: org.id,
      minLength: 8,
    },
  });
  console.log('  PasswordPolicy created.');

  // -------------------------------------------------------------------------
  // 4. Create 2 sample users with org memberships
  // -------------------------------------------------------------------------
  const adminPasswordHash = await hashPassword('password123');
  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@acme-corp.test',
      name: 'Alice Admin',
      passwordHash: adminPasswordHash,
    },
  });

  await prisma.orgMember.create({
    data: {
      userId: adminUser.id,
      organizationId: org.id,
      roleId: technicalRole.id,
      status: 'ACTIVE',
    },
  });
  console.log(`  User "${adminUser.email}" created with Technical role.`);

  const regularPasswordHash = await hashPassword('password123');
  const regularUser = await prisma.user.create({
    data: {
      email: 'user@acme-corp.test',
      name: 'Bob User',
      passwordHash: regularPasswordHash,
    },
  });

  await prisma.orgMember.create({
    data: {
      userId: regularUser.id,
      organizationId: org.id,
      roleId: basicRole.id,
      status: 'ACTIVE',
    },
  });
  console.log(`  User "${regularUser.email}" created with Basic role.`);

  // -------------------------------------------------------------------------
  // 5. Create OrgThemeAssignment defaults
  // -------------------------------------------------------------------------
  const themes = ['claude', 'vercel', 'solar-dusk', 'twitter', 'violet-bloom'];
  for (const themeName of themes) {
    await prisma.orgThemeAssignment.create({
      data: {
        organizationId: org.id,
        themeName,
        isDefault: themeName === 'claude',
      },
    });
  }
  console.log(`  Theme assignments created (${themes.length} themes, "claude" as default).`);

  console.log('\nDev sample data created: 1 org, 3 roles, 2 users, 5 themes.');
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  console.log('LLMatscale.ai - Database Seed Script');
  console.log('====================================');

  await seedSuperAdmin();
  await seedModels();
  await seedDevData();

  console.log('\nSeed complete.');
}

main()
  .catch((error) => {
    console.error('\nSeed failed:', error.message || error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
