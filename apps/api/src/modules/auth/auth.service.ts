import { prisma } from '../../config/prisma.js';
import { AppError } from '../../common/errors/AppError.js';
import { generateOpaqueToken, hashPassword, hashToken, verifyPassword } from '../../common/security/crypto.js';
import { signAccessToken } from '../../common/security/tokens.js';
import {
  issueRefreshToken,
  rotateRefreshToken,
  revokeRefreshToken,
  revokeAllForUser,
} from './refreshToken.service.js';
import { env } from '../../config/env.js';

const MAX_FAILED_LOGINS = 5;
const LOCK_MINUTES = 15;

export const normalizeEmail = (value: string) => value.trim().toLowerCase();
export const normalizePhone = (value: string) => {
  const digits = value.replace(/\D/g, '');
  if (digits.startsWith('880')) return `+${digits}`;
  if (digits.startsWith('0')) return `+880${digits.slice(1)}`;
  return `+880${digits}`;
};

async function customerSession(user: { id: string; sessionVersion: number }) {
  return {
    accessToken: signAccessToken({ sub: user.id, type: 'customer', sessionVersion: user.sessionVersion }),
    refreshToken: await issueRefreshToken({
      subjectType: 'CUSTOMER',
      userId: user.id,
      sessionVersion: user.sessionVersion,
    }),
    userId: user.id,
  };
}

export async function registerCustomer(input: {
  email: string;
  password: string;
  name: string;
  phone?: string;
}) {
  const email = normalizeEmail(input.email);
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash: await hashPassword(input.password),
      name: input.name.trim(),
      phone: input.phone ? normalizePhone(input.phone) : null,
    },
  }).catch((error: { code?: string }) => {
    if (error.code === 'P2002') throw AppError.conflict('EMAIL_ALREADY_EXISTS', 'Email or phone is already registered');
    throw error;
  });
  const verificationToken = generateOpaqueToken(32);
  await prisma.$transaction([
    prisma.emailVerificationToken.create({
      data: { userId: user.id, tokenHash: hashToken(verificationToken), expiresAt: new Date(Date.now() + 24 * 60 * 60_000) },
    }),
    prisma.notification.create({
      data: {
        userId: user.id, channel: 'EMAIL', template: 'EMAIL_VERIFICATION', recipient: user.email,
        subject: 'Verify your email', payload: { url: `${env.STOREFRONT_URL}/verify-email?token=${verificationToken}` },
      },
    }),
  ]);
  return customerSession(user);
}

export async function loginCustomer(input: { email: string; password: string }) {
  const user = await prisma.user.findUnique({ where: { email: normalizeEmail(input.email) } });
  if (!user || !(await verifyPassword(user.passwordHash, input.password))) {
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
  }
  if (user.status !== 'ACTIVE') throw AppError.forbidden('This account is suspended');
  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });
  return customerSession(updated);
}

export async function refreshCustomer(raw: string) {
  const rotated = await rotateRefreshToken(raw, 'CUSTOMER');
  const user = rotated.userId
    ? await prisma.user.findUnique({ where: { id: rotated.userId } })
    : null;
  if (!user || user.status !== 'ACTIVE' || user.sessionVersion !== rotated.sessionVersion) {
    throw AppError.unauthorized('Session is no longer valid');
  }
  return {
    accessToken: signAccessToken({ sub: user.id, type: 'customer', sessionVersion: user.sessionVersion }),
    refreshToken: rotated.newToken,
  };
}

export async function changeCustomerPassword(userId: string, current: string, next: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !(await verifyPassword(user.passwordHash, current))) {
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Current password is incorrect');
  }
  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { passwordHash: await hashPassword(next), sessionVersion: { increment: 1 } },
    }),
    prisma.refreshToken.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } }),
  ]);
}

export async function createPasswordReset(email: string) {
  const user = await prisma.user.findUnique({ where: { email: normalizeEmail(email) } });
  if (!user) return null; // enumeration-safe
  const raw = generateOpaqueToken(32);
  await prisma.passwordResetToken.create({
    data: { userId: user.id, tokenHash: hashToken(raw), expiresAt: new Date(Date.now() + 30 * 60_000) },
  });
  await prisma.notification.create({
    data: {
      userId: user.id, channel: 'EMAIL', template: 'PASSWORD_RESET', recipient: user.email,
      subject: 'Reset your password', payload: { url: `${env.STOREFRONT_URL}/reset-password?token=${raw}` },
    },
  });
  return { userId: user.id, token: raw };
}

export async function verifyCustomerEmail(raw: string) {
  const token = await prisma.emailVerificationToken.findUnique({ where: { tokenHash: hashToken(raw) } });
  if (!token || token.usedAt || token.expiresAt <= new Date()) {
    throw AppError.badRequest('VALIDATION_ERROR', 'Verification token is invalid or expired');
  }
  await prisma.$transaction([
    prisma.emailVerificationToken.update({ where: { id: token.id }, data: { usedAt: new Date() } }),
    prisma.user.update({ where: { id: token.userId }, data: { emailVerifiedAt: new Date() } }),
  ]);
}

export async function resendCustomerVerification(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.emailVerifiedAt) return;
  const raw = generateOpaqueToken(32);
  await prisma.$transaction([
    prisma.emailVerificationToken.create({
      data: { userId, tokenHash: hashToken(raw), expiresAt: new Date(Date.now() + 24 * 60 * 60_000) },
    }),
    prisma.notification.create({
      data: {
        userId, channel: 'EMAIL', template: 'EMAIL_VERIFICATION', recipient: user.email,
        subject: 'Verify your email', payload: { url: `${env.STOREFRONT_URL}/verify-email?token=${raw}` },
      },
    }),
  ]);
}

export async function resetPassword(raw: string, password: string) {
  const token = await prisma.passwordResetToken.findUnique({ where: { tokenHash: hashToken(raw) } });
  if (!token || token.usedAt || token.expiresAt <= new Date()) {
    throw AppError.badRequest('VALIDATION_ERROR', 'Reset token is invalid or expired');
  }
  await prisma.$transaction([
    prisma.passwordResetToken.update({ where: { id: token.id }, data: { usedAt: new Date() } }),
    prisma.user.update({
      where: { id: token.userId },
      data: { passwordHash: await hashPassword(password), sessionVersion: { increment: 1 } },
    }),
    prisma.refreshToken.updateMany({
      where: { userId: token.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    }),
  ]);
}

async function adminPermissions(adminId: string) {
  const roles = await prisma.adminRole.findMany({
    where: { adminId },
    include: { role: { include: { permissions: { include: { permission: true } } } } },
  });
  return [...new Set(roles.flatMap((r) => r.role.permissions.map((p) => p.permission.code)))];
}

export async function loginAdmin(input: { email: string; password: string }) {
  const admin = await prisma.adminUser.findUnique({ where: { email: normalizeEmail(input.email) } });
  if (!admin) throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid credentials');
  if (admin.status !== 'ACTIVE') throw AppError.forbidden('Admin account is disabled');
  if (admin.lockedUntil && admin.lockedUntil > new Date()) {
    throw new AppError(423, 'ACCOUNT_LOCKED', 'Account is temporarily locked');
  }
  if (!(await verifyPassword(admin.passwordHash, input.password))) {
    const attempts = admin.failedLoginAttempts + 1;
    await prisma.adminUser.update({
      where: { id: admin.id },
      data: {
        failedLoginAttempts: attempts,
        lockedUntil: attempts >= MAX_FAILED_LOGINS ? new Date(Date.now() + LOCK_MINUTES * 60_000) : null,
      },
    });
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid credentials');
  }
  await prisma.adminUser.update({
    where: { id: admin.id },
    data: { failedLoginAttempts: 0, lockedUntil: null, lastLoginAt: new Date() },
  });
  const permissions = await adminPermissions(admin.id);
  const accessToken = signAccessToken({
    sub: admin.id,
    type: 'admin',
    permissions,
    sessionVersion: admin.sessionVersion,
  });
  const refreshToken = await issueRefreshToken({
    subjectType: 'ADMIN',
    adminId: admin.id,
    sessionVersion: admin.sessionVersion,
  });
  return { accessToken, refreshToken, permissions, adminId: admin.id };
}

export async function refreshAdmin(raw: string) {
  const rotated = await rotateRefreshToken(raw, 'ADMIN');
  const admin = rotated.adminId
    ? await prisma.adminUser.findUnique({ where: { id: rotated.adminId } })
    : null;
  if (!admin || admin.status !== 'ACTIVE' || admin.sessionVersion !== rotated.sessionVersion) {
    throw AppError.unauthorized('Session is no longer valid');
  }
  const permissions = await adminPermissions(admin.id);
  return {
    accessToken: signAccessToken({
      sub: admin.id,
      type: 'admin',
      permissions,
      sessionVersion: admin.sessionVersion,
    }),
    refreshToken: rotated.newToken,
    permissions,
  };
}

export async function logout(raw: string) {
  await revokeRefreshToken(raw);
}

export async function logoutAllCustomer(userId: string) {
  await revokeAllForUser(userId);
  await prisma.user.update({ where: { id: userId }, data: { sessionVersion: { increment: 1 } } });
}
