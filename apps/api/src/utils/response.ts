import type { Response } from 'express';
import type { ApiMeta } from '@pim/types';

export function sendSuccess<T>(
  res: Response,
  data: T,
  statusCode = 200,
  meta?: ApiMeta
): void {
  res.status(statusCode).json({
    success: true,
    data,
    ...(meta ? { meta } : {}),
    timestamp: new Date().toISOString(),
  });
}

export function sendCreated<T>(res: Response, data: T): void {
  sendSuccess(res, data, 201);
}

export function sendNoContent(res: Response): void {
  res.status(204).send();
}

export function sendError(
  res: Response,
  statusCode: number,
  code: string,
  message: string,
  details?: { field?: string; message: string }[]
): void {
  res.status(statusCode).json({
    success: false,
    error: {
      code,
      message,
      ...(details ? { details } : {}),
    },
    timestamp: new Date().toISOString(),
  });
}

export function sendNotFound(res: Response, resource = 'Resource'): void {
  sendError(res, 404, 'NOT_FOUND', `${resource} not found`);
}

export function sendUnauthorized(res: Response, message = 'Unauthorized'): void {
  sendError(res, 401, 'UNAUTHORIZED', message);
}

export function sendForbidden(res: Response, message = 'Forbidden'): void {
  sendError(res, 403, 'FORBIDDEN', message);
}

export function sendBadRequest(
  res: Response,
  message: string,
  details?: { field?: string; message: string }[]
): void {
  sendError(res, 400, 'BAD_REQUEST', message, details);
}

export function sendConflict(res: Response, message: string): void {
  sendError(res, 409, 'CONFLICT', message);
}

export function sendInternalError(res: Response, message = 'Internal server error'): void {
  sendError(res, 500, 'INTERNAL_ERROR', message);
}
