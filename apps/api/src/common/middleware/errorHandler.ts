import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../errors/AppError.js';
import { sendError } from '../http/response.js';
import { logger } from '../logging/logger.js';
import { isProd } from '../../config/env.js';

export function notFoundHandler(_req: Request, res: Response): void {
  sendError(res, 404, 'RESOURCE_NOT_FOUND', 'The requested resource was not found');
}

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof ZodError) {
    const fields: Record<string, string[]> = {};
    for (const issue of err.issues) {
      const key = issue.path.join('.') || 'root';
      (fields[key] ??= []).push(issue.message);
    }
    sendError(res, 422, 'VALIDATION_ERROR', 'Request validation failed', fields);
    return;
  }

  if (err instanceof AppError) {
    if (err.statusCode >= 500) {
      logger.error({ err, requestId: res.locals.requestId }, err.message);
    }
    sendError(res, err.statusCode, err.code, err.message, err.fields);
    return;
  }

  // Prisma unique-constraint errors surface as P2002.
  const anyErr = err as { code?: string; meta?: unknown };
  if ((err as { type?: string })?.type === 'entity.too.large') {
    sendError(res, 413, 'PAYLOAD_TOO_LARGE', 'Request body exceeds the 2 MB limit');
    return;
  }
  if ((err as { type?: string })?.type === 'entity.parse.failed') {
    sendError(res, 400, 'VALIDATION_ERROR', 'Malformed JSON request body');
    return;
  }
  if (anyErr?.code === 'P2002') {
    sendError(res, 409, 'CONFLICT', 'A record with these details already exists');
    return;
  }

  logger.error({ err, requestId: res.locals.requestId }, 'Unhandled error');
  sendError(
    res,
    500,
    'INTERNAL_ERROR',
    isProd ? 'An unexpected error occurred' : String((err as Error)?.message ?? err)
  );
}
