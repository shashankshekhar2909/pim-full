import winston from 'winston';

const { combine, timestamp, printf, colorize, json, errors } = winston.format;

const isDevelopment = process.env.NODE_ENV !== 'production';

const devFormat = combine(
  colorize({ all: true }),
  timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  errors({ stack: true }),
  printf(({ level, message, timestamp: ts, stack, ...meta }) => {
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    return `${ts} [${level}]: ${stack ?? message}${metaStr}`;
  })
);

const prodFormat = combine(timestamp(), errors({ stack: true }), json());

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL ?? (isDevelopment ? 'debug' : 'info'),
  format: isDevelopment ? devFormat : prodFormat,
  defaultMeta: { service: 'pim-api' },
  transports: [new winston.transports.Console()],
  exceptionHandlers: [new winston.transports.Console()],
  rejectionHandlers: [new winston.transports.Console()],
});
