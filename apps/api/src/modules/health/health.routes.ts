import { Router } from 'express';
import { prisma } from '../../config/prisma.js';
import { asyncHandler } from '../../common/utilities/asyncHandler.js';
import { redis } from '../../config/redis.js';

const router = Router();

router.get('/health', (_req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

router.get(
  '/ready',
  asyncHandler(async (_req, res) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      if (redis && !redis.isReady) throw new Error('Redis is not ready');
      res.json({ status: 'ready', dependencies: 'available' });
    } catch {
      res.status(503).json({ status: 'not-ready' });
    }
  })
);

router.get('/version', (_req, res) => {
  res.json({ name: 'swoosh-api', version: process.env.APP_VERSION ?? process.env.npm_package_version ?? 'dev' });
});

export const healthRouter = router;
