import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';
import { sendSuccess, sendUnauthorized, sendBadRequest } from '../utils/response.js';
import { logger } from '../utils/logger.js';
import type { JwtPayload } from '@pim/types';

const router = Router();

// ============================================================
// Validation schemas
// ============================================================

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
  tenantSlug: z.string().min(1, 'Tenant slug is required'),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

// ============================================================
// Helpers
// ============================================================

function generateTokens(payload: Omit<JwtPayload, 'iat' | 'exp'>): {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
} {
  const secret = process.env.JWT_SECRET!;
  const refreshSecret = process.env.JWT_REFRESH_SECRET!;
  const accessExpiresIn = process.env.JWT_ACCESS_EXPIRES_IN ?? '15m';
  const refreshExpiresIn = process.env.JWT_REFRESH_EXPIRES_IN ?? '7d';

  const accessToken = jwt.sign(payload, secret, { expiresIn: accessExpiresIn } as jwt.SignOptions);
  const refreshToken = jwt.sign(payload, refreshSecret, {
    expiresIn: refreshExpiresIn,
  } as jwt.SignOptions);

  // Parse expiresIn to seconds for the client
  const expiresIn = accessExpiresIn.endsWith('m')
    ? parseInt(accessExpiresIn) * 60
    : accessExpiresIn.endsWith('h')
      ? parseInt(accessExpiresIn) * 3600
      : 900;

  return { accessToken, refreshToken, expiresIn };
}

// ============================================================
// POST /auth/login
// ============================================================

router.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = loginSchema.parse(req.body);

    // Find tenant
    const tenant = await prisma.tenant.findFirst({
      where: { slug: body.tenantSlug, deletedAt: null },
    });

    if (!tenant || tenant.status !== 'active') {
      sendUnauthorized(res, 'Invalid tenant or credentials');
      return;
    }

    // Find user
    const user = await prisma.user.findFirst({
      where: { tenantId: tenant.id, email: body.email },
      include: {
        userRoles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!user || user.status !== 'active') {
      sendUnauthorized(res, 'Invalid email or password');
      return;
    }

    // Verify password
    const passwordMatch = await bcrypt.compare(body.password, user.passwordHash);
    if (!passwordMatch) {
      sendUnauthorized(res, 'Invalid email or password');
      return;
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    const roles = user.userRoles.map((ur) => ur.role.name);

    const tokens = generateTokens({
      sub: user.id,
      tenantId: tenant.id,
      email: user.email,
      roles,
    });

    logger.info('User logged in', { userId: user.id, tenantId: tenant.id });

    sendSuccess(res, {
      user: {
        id: user.id,
        tenantId: user.tenantId,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        avatarUrl: user.avatarUrl,
        status: user.status,
        mfaEnabled: user.mfaEnabled,
        roles,
      },
      tenant: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        status: tenant.status,
        subscriptionTier: tenant.subscriptionTier,
        config: tenant.config,
      },
      tokens,
    });
  } catch (err) {
    next(err);
  }
});

// ============================================================
// POST /auth/refresh
// ============================================================

router.post('/refresh', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { refreshToken } = refreshSchema.parse(req.body);

    const refreshSecret = process.env.JWT_REFRESH_SECRET;
    if (!refreshSecret) {
      sendUnauthorized(res, 'Server misconfiguration');
      return;
    }

    let payload: JwtPayload;
    try {
      payload = jwt.verify(refreshToken, refreshSecret) as JwtPayload;
    } catch {
      sendUnauthorized(res, 'Invalid or expired refresh token');
      return;
    }

    // Verify user still exists and is active
    const user = await prisma.user.findFirst({
      where: { id: payload.sub, tenantId: payload.tenantId },
      include: { userRoles: { include: { role: true } } },
    });

    if (!user || user.status !== 'active') {
      sendUnauthorized(res, 'User no longer active');
      return;
    }

    const roles = user.userRoles.map((ur) => ur.role.name);
    const tokens = generateTokens({
      sub: user.id,
      tenantId: user.tenantId,
      email: user.email,
      roles,
    });

    sendSuccess(res, { tokens });
  } catch (err) {
    next(err);
  }
});

// ============================================================
// POST /auth/logout
// ============================================================

router.post('/logout', requireAuth, (req: Request, res: Response) => {
  // With stateless JWTs the client simply discards the token.
  // A production implementation would add the token to a Redis blocklist here.
  logger.info('User logged out', { userId: req.user?.sub });
  sendSuccess(res, { message: 'Logged out successfully' });
});

// ============================================================
// GET /auth/me
// ============================================================

router.get('/me', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await prisma.user.findFirst({
      where: { id: req.user!.sub },
      include: { userRoles: { include: { role: true } } },
    });

    if (!user) {
      sendUnauthorized(res, 'User not found');
      return;
    }

    sendSuccess(res, {
      id: user.id,
      tenantId: user.tenantId,
      email: user.email,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      avatarUrl: user.avatarUrl,
      status: user.status,
      mfaEnabled: user.mfaEnabled,
      roles: user.userRoles.map((ur) => ur.role.name),
      lastLogin: user.lastLogin,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
