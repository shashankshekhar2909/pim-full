import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { errorHandler } from './middleware/errorHandler.js';
import { logger } from './utils/logger.js';
import router from './routes/index.js';

const app = express();

// ============================================================
// Security middleware
// ============================================================

app.use(helmet());

app.use(
  cors({
    origin: (origin, callback) => {
      const allowedOrigins = (process.env.CORS_ORIGIN ?? 'http://localhost:5173')
        .split(',')
        .map((o) => o.trim());

      // Allow requests with no origin (e.g. mobile apps, curl)
      if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
        callback(null, true);
      } else {
        callback(new Error(`CORS: origin ${origin} is not allowed`));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-ID'],
  })
);

// ============================================================
// Rate limiting
// ============================================================

const apiLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS ?? '900000'), // 15 min
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS ?? '100'),
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests, please try again later',
    },
    timestamp: new Date().toISOString(),
  },
});

app.use('/api/', apiLimiter);

// Stricter limiter for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many authentication attempts, please try again later',
    },
    timestamp: new Date().toISOString(),
  },
});

app.use('/api/v1/auth/login', authLimiter);

// ============================================================
// Body parsing & compression
// ============================================================

app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ============================================================
// HTTP request logging (Morgan -> Winston)
// ============================================================

app.use(
  morgan('combined', {
    stream: {
      write: (message: string) => logger.http(message.trim()),
    },
    skip: (_req, res) => res.statusCode < 400 && process.env.NODE_ENV === 'production',
  })
);

// ============================================================
// API routes
// ============================================================

const API_VERSION = process.env.API_VERSION ?? 'v1';
app.use(`/api/${API_VERSION}`, router);

// ============================================================
// 404 handler for unknown routes
// ============================================================

app.use((_req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'The requested endpoint does not exist',
    },
    timestamp: new Date().toISOString(),
  });
});

// ============================================================
// Global error handler (must be last)
// ============================================================

app.use(errorHandler);

export default app;
