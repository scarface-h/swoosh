import type { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'node:crypto';

/** Attach a request ID to every request for tracing and log correlation. */
export function requestId(req: Request, res: Response, next: NextFunction): void {
  const incoming = req.header('x-request-id');
  const id = incoming && incoming.length <= 100 ? incoming : randomUUID();
  res.locals.requestId = id;
  res.setHeader('x-request-id', id);
  next();
}
