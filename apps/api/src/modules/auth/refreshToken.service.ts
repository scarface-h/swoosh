import { randomUUID } from 'node:crypto';
import type { TokenSubjectType } from '@prisma/client';
import { prisma } from '../../config/prisma.js';
import { generateOpaqueToken, hashToken } from '../../common/security/crypto.js';
import { durationToMs } from '../../common/security/tokens.js';
import { env } from '../../config/env.js';
import { AppError } from '../../common/errors/AppError.js';

interface IssueParams {
  subjectType: TokenSubjectType;
  userId?: string;
  adminId?: string;
  familyId?: string;
  sessionVersion: number;
  ip?: string;
  userAgent?: string;
}
const storedHash = (raw: string) => hashToken(`${env.REFRESH_TOKEN_SECRET}:${raw}`);

export async function issueRefreshToken(input: IssueParams): Promise<string> {
  const raw = generateOpaqueToken();
  await prisma.refreshToken.create({
    data: {
      familyId: input.familyId ?? randomUUID(),
      tokenHash: storedHash(raw),
      subjectType: input.subjectType,
      userId: input.userId ?? null,
      adminId: input.adminId ?? null,
      sessionVersion: input.sessionVersion,
      expiresAt: new Date(Date.now() + durationToMs(env.REFRESH_TOKEN_TTL)),
      createdByIp: input.ip,
      userAgent: input.userAgent,
    },
  });
  return raw;
}

export async function rotateRefreshToken(raw: string, expectedType: TokenSubjectType) {
  const existing = await prisma.refreshToken.findUnique({ where: { tokenHash: storedHash(raw) } });
  if (!existing || existing.subjectType !== expectedType || existing.expiresAt <= new Date()) {
    throw AppError.unauthorized('Invalid or expired refresh token');
  }
  if (existing.revokedAt || existing.usedAt) {
    await prisma.refreshToken.updateMany({
      where: { familyId: existing.familyId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    throw AppError.unauthorized('Refresh token reuse detected; token family revoked');
  }
  const newRaw = generateOpaqueToken();
  const created = await prisma.$transaction(async (tx) => {
    const consumed = await tx.refreshToken.updateMany({
      where: { id: existing.id, usedAt: null, revokedAt: null },
      data: { usedAt: new Date() },
    });
    if (consumed.count !== 1) throw AppError.unauthorized('Refresh token reuse detected');
    const next = await tx.refreshToken.create({
      data: {
        familyId: existing.familyId,
        tokenHash: storedHash(newRaw),
        subjectType: existing.subjectType,
        userId: existing.userId,
        adminId: existing.adminId,
        sessionVersion: existing.sessionVersion,
        expiresAt: new Date(Date.now() + durationToMs(env.REFRESH_TOKEN_TTL)),
      },
    });
    await tx.refreshToken.update({
      where: { id: existing.id },
      data: { replacedByTokenId: next.id },
    });
    return next;
  });
  return {
    newToken: newRaw,
    userId: created.userId ?? undefined,
    adminId: created.adminId ?? undefined,
    sessionVersion: created.sessionVersion,
  };
}

export async function revokeRefreshToken(raw: string) {
  await prisma.refreshToken.updateMany({
    where: { tokenHash: storedHash(raw), revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function revokeAllForUser(userId: string) {
  await prisma.refreshToken.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } });
}

export async function revokeAllForAdmin(adminId: string) {
  await prisma.refreshToken.updateMany({ where: { adminId, revokedAt: null }, data: { revokedAt: new Date() } });
}
