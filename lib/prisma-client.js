// Direct import from generated Prisma client in app directory
import { PrismaClient } from '../app/generated/prisma_new/client';

// Create a singleton instance
const globalForPrisma = globalThis;
globalForPrisma.prisma = globalForPrisma.prisma || new PrismaClient();

export const prisma = globalForPrisma.prisma;

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}