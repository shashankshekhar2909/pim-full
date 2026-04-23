import type { Request, Response, NextFunction } from 'express';
import { sendForbidden } from '../utils/response.js';

/**
 * Allow the request only if the authenticated user has at least one of the
 * given roles. Must run after requireAuth.
 *
 * Conventions in this codebase:
 *   - admin:  full access incl. user/role management, tenant settings
 *   - editor: catalog read/write (categories, attributes, SKUs, imports)
 *   - viewer: read-only
 */
export function requireRole(...allowed: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const roles = req.user?.roles ?? [];
    if (!roles.some((r) => allowed.includes(r))) {
      sendForbidden(res, `Requires role: ${allowed.join(' or ')}`);
      return;
    }
    next();
  };
}

export const requireAdmin = requireRole('admin');
export const requireEditor = requireRole('admin', 'editor');
