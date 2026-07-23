import type { NotificationChannel, Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma.js';

export interface NotificationMessage {
  userId?: string;
  channel: NotificationChannel;
  template: string;
  recipient: string;
  subject?: string;
  payload: Prisma.InputJsonValue;
}

/** Durable outbox. A worker may deliver email now and SMS through a future adapter. */
export async function enqueueNotification(message: NotificationMessage) {
  return prisma.notification.create({ data: message });
}
