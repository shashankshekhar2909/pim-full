import 'dotenv/config';
import app from './app.js';
import { prisma } from './lib/prisma.js';
import { logger } from './utils/logger.js';

const PORT = parseInt(process.env.PORT ?? '3001', 10);

async function bootstrap(): Promise<void> {
  // Verify database connectivity before starting the HTTP server
  try {
    await prisma.$connect();
    logger.info('Database connection established');
  } catch (err) {
    logger.error('Failed to connect to database', { err });
    process.exit(1);
  }

  const server = app.listen(PORT, () => {
    logger.info(`PIM API server running`, {
      port: PORT,
      env: process.env.NODE_ENV ?? 'development',
      apiVersion: process.env.API_VERSION ?? 'v1',
    });
  });

  // ============================================================
  // Graceful shutdown
  // ============================================================

  async function shutdown(signal: string): Promise<void> {
    logger.info(`Received ${signal}. Shutting down gracefully...`);

    server.close(async () => {
      logger.info('HTTP server closed');
      try {
        await prisma.$disconnect();
        logger.info('Database connection closed');
      } catch (err) {
        logger.error('Error closing database connection', { err });
      }
      process.exit(0);
    });

    // Force-kill if graceful shutdown takes too long
    setTimeout(() => {
      logger.error('Graceful shutdown timed out, forcing exit');
      process.exit(1);
    }, 10_000);
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled promise rejection', { reason });
  });

  process.on('uncaughtException', (err) => {
    logger.error('Uncaught exception', { err });
    process.exit(1);
  });
}

bootstrap();
