import { PrismaClient } from './generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

// Determine SSL settings based on DATABASE_URL
// - localhost/127.0.0.1: no SSL
// - Neon (neon.tech): SSL required
// - AWS RDS (rds.amazonaws.com): SSL disabled for POC (rds.force_ssl=0)
const dbUrl = process.env.DATABASE_URL || '';
const isLocalhost = dbUrl.includes('localhost') || dbUrl.includes('127.0.0.1');
const isNeon = dbUrl.includes('neon.tech');
const isRDS = dbUrl.includes('rds.amazonaws.com');

// Create PostgreSQL connection pool
const connectionPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isLocalhost || isRDS ? false : (isNeon ? { rejectUnauthorized: true } : { rejectUnauthorized: false }),
});

// Create Prisma adapter for PostgreSQL
const adapter = new PrismaPg(connectionPool);

// PrismaClient singleton for Next.js
// Prevents multiple instances during development hot reload

const globalForPrisma = globalThis as unknown as {
  prisma: InstanceType<typeof PrismaClient> | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export default prisma;
