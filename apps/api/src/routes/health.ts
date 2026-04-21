import { Router } from 'express';
import type { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { logger } from '../utils/logger.js';

const router = Router();

/**
 * GET /health
 * Lightweight liveness probe — always returns 200 if the process is alive.
 */
router.get('/', (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    data: {
      status: 'ok',
      service: 'pim-api',
      version: process.env.npm_package_version ?? '0.0.1',
      environment: process.env.NODE_ENV ?? 'development',
    },
    timestamp: new Date().toISOString(),
  });
});

/**
 * GET /ready
 * Readiness probe — checks that the database is reachable.
 */
router.get('/ready', async (_req: Request, res: Response) => {
  const checks: Record<string, 'ok' | 'error'> = {
    database: 'error',
  };

  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = 'ok';
  } catch (err) {
    logger.error('Readiness check: database unreachable', { err });
  }

  const allOk = Object.values(checks).every((v) => v === 'ok');

  res.status(allOk ? 200 : 503).json({
    success: allOk,
    data: {
      status: allOk ? 'ready' : 'not_ready',
      checks,
    },
    timestamp: new Date().toISOString(),
  });
});

export default router;
