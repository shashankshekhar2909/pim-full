import type { JwtPayload } from '@pim/types';

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
      tenantId?: string;
    }
  }
}

export {};
