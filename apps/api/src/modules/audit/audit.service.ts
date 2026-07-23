import { prisma } from '../../config/prisma.js';
import { logger } from '../../common/logging/logger.js';

export interface AuditEntry {
  adminId?: string;
  action: string;
  entityType: string;
  entityId?: string;
  previousValue?: unknown;
  newValue?: unknown;
  requestId?: string;
  ipAddress?: string;
  userAgent?: string;
}

/** Persist a sensitive-action audit record. Failures never break the request. */
export async function writeAuditLog(entry: AuditEntry): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        adminId: entry.adminId ?? null,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId ?? null,
        previousValue: entry.previousValue == null ? undefined : JSON.parse(JSON.stringify(entry.previousValue)),
        newValue: entry.newValue == null ? undefined : JSON.parse(JSON.stringify(entry.newValue)),
        requestId: entry.requestId ?? null,
        ipAddress: entry.ipAddress ?? null,
        userAgent: entry.userAgent ?? null,
      },
    });
  } catch (err) {
    logger.error({ err, action: entry.action }, 'Failed to write audit log');
  }
}
