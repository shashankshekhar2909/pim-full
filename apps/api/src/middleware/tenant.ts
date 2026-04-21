import type { Request, Response, NextFunction } from 'express';
import { sendForbidden } from '../utils/response.js';

/**
 * Verifies that the tenantId in the JWT matches the :tenantId route param.
 * This prevents users from one tenant accessing another tenant's resources.
 *
 * Must be placed AFTER requireAuth middleware.
 */
export function requireTenantMatch(req: Request, res: Response, next: NextFunction): void {
  const paramTenantId = req.params.tenantId;

  if (!paramTenantId) {
    // No tenantId in route — nothing to check
    next();
    return;
  }

  if (!req.user) {
    sendForbidden(res, 'Authentication required');
    return;
  }

  if (req.user.tenantId !== paramTenantId) {
    sendForbidden(res, 'You do not have access to this tenant');
    return;
  }

  next();
}

/**
 * Injects tenantId into req from the JWT payload.
 * Must be placed AFTER requireAuth middleware.
 */
export function injectTenant(req: Request, _res: Response, next: NextFunction): void {
  if (req.user) {
    req.tenantId = req.user.tenantId;
  }
  next();
}
