import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger.js';

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

function createPrismaClient(): PrismaClient {
  return new PrismaClient({
    log: [
      { level: 'query', emit: 'event' },
      { level: 'error', emit: 'event' },
      { level: 'warn', emit: 'event' },
    ],
  });
}

// Reuse instance across hot reloads in development
export const prisma: PrismaClient =
  process.env.NODE_ENV === 'production'
    ? createPrismaClient()
    : (global.__prisma ??= createPrismaClient());

if (process.env.NODE_ENV !== 'production') {
  global.__prisma = prisma;
}

// Log slow queries in development
if (process.env.NODE_ENV !== 'production') {
  (prisma.$on as Function)('query', (e: { query: string; duration: number }) => {
    if (e.duration > 500) {
      logger.warn('Slow Prisma query detected', {
        query: e.query,
        durationMs: e.duration,
      });
    }
  });
}

(prisma.$on as Function)('error', (e: { message: string }) => {
  logger.error('Prisma error', { message: e.message });
});
