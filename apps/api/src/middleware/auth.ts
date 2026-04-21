import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import type { JwtPayload } from '@pim/types';
import { sendUnauthorized } from '../utils/response.js';

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    sendUnauthorized(res, 'Missing or malformed Authorization header');
    return;
  }

  const token = authHeader.slice(7);
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    sendUnauthorized(res, 'Server misconfiguration: JWT_SECRET not set');
    return;
  }

  try {
    const payload = jwt.verify(token, secret) as JwtPayload;
    req.user = payload;
    req.tenantId = payload.tenantId;
    next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      sendUnauthorized(res, 'Token has expired');
    } else if (err instanceof jwt.JsonWebTokenError) {
      sendUnauthorized(res, 'Invalid token');
    } else {
      sendUnauthorized(res, 'Token verification failed');
    }
  }
}

/**
 * Middleware that attaches user if token is present but does NOT
 * reject requests without a token. Useful for public routes that
 * have optional auth behaviour.
 */
export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    next();
    return;
  }

  const token = authHeader.slice(7);
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    next();
    return;
  }

  try {
    const payload = jwt.verify(token, secret) as JwtPayload;
    req.user = payload;
    req.tenantId = payload.tenantId;
  } catch {
    // swallow errors — request continues without user context
  }

  next();
}
