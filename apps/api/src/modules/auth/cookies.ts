import type { Request, Response } from 'express';
import { env, isProd } from '../../config/env.js';
import { durationToMs } from '../../common/security/tokens.js';

const CUSTOMER_COOKIE = 'refresh_token';
const ADMIN_COOKIE = 'admin_refresh_token';

function cookieName(admin = false): string {
  return admin ? ADMIN_COOKIE : CUSTOMER_COOKIE;
}

export function setRefreshCookie(res: Response, token: string, admin = false): void {
  res.cookie(cookieName(admin), token, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'strict',
    domain: env.COOKIE_DOMAIN,
    maxAge: durationToMs(env.REFRESH_TOKEN_TTL),
    path: '/',
  });
}

export function clearRefreshCookie(res: Response, admin = false): void {
  res.clearCookie(cookieName(admin), {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'strict',
    domain: env.COOKIE_DOMAIN,
    path: '/',
  });
}

export function readRefreshToken(req: Request, admin = false): string | null {
  const cookies = (req as unknown as { cookies?: Record<string, string> }).cookies;
  return cookies?.[cookieName(admin)] ?? null;
}
