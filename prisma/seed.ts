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
      permissions: ['chat', 'mcp', 'artifacts', 'file_upload', 'web_search'],
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
