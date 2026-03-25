import { PrismaClient } from '@prisma/client'

declare const global: Global & { prisma?: PrismaClient }

// Reuse a single PrismaClient instance across requests.
// In serverless environments, creating a new PrismaClient per invocation can exhaust
// Supabase/Postgres connection limits.
export const prisma: PrismaClient =
  global.prisma ?? new PrismaClient({
    // log: [{ emit: 'stdout', level: 'query' }],
  })

if (!global.prisma) {
  global.prisma = prisma
}
