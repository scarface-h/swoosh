import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/AppError.js';
import { verifyAccessToken, type AccessTokenPayload } from '../security/tokens.js';
import { hasPermission } from '../../modules/permissions/permissions.js';

declare global {
  namespace Express {
    interface Request {
      auth?: AccessTokenPayload;
    }
  }
}

function extractToken(req: Request): string | null {
  const header = req.header('authorization');
  if (header?.startsWith('Bearer ')) return header.slice(7);
  const cookie = (req as unknown as { cookies?: Record<string, string> }).cookies?.access_token;
  return cookie ?? null;
}

/** Require a valid access token of any principal type. */
export function requireAuth(principal?: 'customer' | 'admin') {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const token = extractToken(req);
    if (!token) return next(AppError.unauthorized());
    try {
      const payload = verifyAccessToken(token);
      if (principal && payload.type !== principal) return next(AppError.forbidden());
      req.auth = payload;
      next();
    } catch {
      next(AppError.unauthorized('Invalid or expired token'));
    }
  };
}

/** Require the authenticated admin to hold a specific permission. */
export function requirePermission(permission: string) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.auth || req.auth.type !== 'admin') return next(AppError.unauthorized());
    if (!hasPermission(req.auth.permissions ?? [], permission)) return next(AppError.forbidden());
    next();
  };
}

/** Optional auth: attaches principal if a valid token is present, else continues. */
export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  const token = extractToken(req);
  if (!token) return next();
  try {
    req.auth = verifyAccessToken(token);
  } catch {
    /* ignore invalid token for optional auth */
  }
  next();
}
