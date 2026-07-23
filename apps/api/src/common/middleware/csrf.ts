import type { NextFunction, Request, Response } from 'express';
import { corsOrigins } from '../../config/env.js';
import { AppError } from '../errors/AppError.js';

/** Origin check for state-changing requests that carry authentication cookies. */
export function csrfOriginGuard(req: Request, _res: Response, next: NextFunction): void {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method) || !req.headers.cookie) return next();
  const origin = req.get('origin');
  if (!origin || !corsOrigins.includes(origin)) {
    return next(AppError.forbidden('Request origin is not allowed'));
  }
  next();
}
