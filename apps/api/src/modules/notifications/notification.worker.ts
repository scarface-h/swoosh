import nodemailer from "nodemailer";
import type { Notification } from "@prisma/client";
import { env } from "../../config/env.js";
import { logger } from "../../common/logging/logger.js";
import { prisma } from "../../config/prisma.js";

const MAX_ATTEMPTS = 5;
const POLL_INTERVAL_MS = 30_000;

const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

function emailContent(notification: Notification) {
  const payload =
    notification.payload &&
    typeof notification.payload === "object" &&
    !Array.isArray(notification.payload)
      ? (notification.payload as Record<string, unknown>)
      : {};
  const url = typeof payload.url === "string" ? payload.url : null;
  const subject = notification.subject ?? "Swoosh Shop notification";
  const action =
    notification.template === "verify_email"
      ? "Verify your email address"
      : notification.template === "password_reset"
        ? "Reset your password"
        : "View notification";

  if (notification.template === "contact_submission") {
    const name = typeof payload.name === "string" ? payload.name : "Customer";
    const email =
      typeof payload.email === "string" ? payload.email : "Not provided";
    const message =
      typeof payload.message === "string" ? payload.message : "No message";
    return {
      subject,
      text: `From: ${name} <${email}>\n\n${message}`,
      html: `<p><strong>From:</strong> ${escapeHtml(name)} &lt;${escapeHtml(email)}&gt;</p><p>${escapeHtml(message).replaceAll("\n", "<br>")}</p>`,
    };
  }

  return {
    subject,
    text: url
      ? `${action}: ${url}\n\nIf you did not request this, you can ignore this email.`
      : `${subject}\n\n${JSON.stringify(payload)}`,
    html: url
      ? `<p>${escapeHtml(action)}</p><p><a href="${escapeHtml(url)}">${escapeHtml(action)}</a></p><p>If you did not request this, you can ignore this email.</p>`
      : `<p>${escapeHtml(subject)}</p>`,
  };
}

export function startNotificationWorker() {
  if (!env.SMTP_HOST || !env.EMAIL_FROM) {
    logger.warn(
      "SMTP_HOST and EMAIL_FROM are not configured; email notifications will remain queued",
    );
    return () => undefined;
  }

  const transport = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT ?? 587,
    secure: (env.SMTP_PORT ?? 587) === 465,
    ...(env.SMTP_USER
      ? {
          auth: {
            user: env.SMTP_USER,
            pass: env.SMTP_PASSWORD,
          },
        }
      : {}),
  });
  let working = false;
  let stopped = false;

  const processBatch = async () => {
    if (working || stopped) return;
    working = true;
    try {
      const pending = await prisma.notification.findMany({
        where: { status: "PENDING", availableAt: { lte: new Date() } },
        orderBy: { createdAt: "asc" },
        take: 10,
      });

      for (const notification of pending) {
        const claimed = await prisma.notification.updateMany({
          where: { id: notification.id, status: "PENDING" },
          data: { status: "PROCESSING" },
        });
        if (claimed.count !== 1) continue;

        const attempts = notification.attempts + 1;
        try {
          if (notification.channel !== "EMAIL") {
            throw new Error(
              `${notification.channel} delivery is not configured`,
            );
          }
          const content = emailContent(notification);
          await transport.sendMail({
            from: env.EMAIL_FROM,
            to: notification.recipient,
            ...content,
          });
          await prisma.notification.update({
            where: { id: notification.id },
            data: {
              status: "SENT",
              attempts,
              sentAt: new Date(),
              lastError: null,
            },
          });
        } catch (error) {
          const failed = attempts >= MAX_ATTEMPTS;
          await prisma.notification.update({
            where: { id: notification.id },
            data: {
              status: failed ? "FAILED" : "PENDING",
              attempts,
              lastError:
                error instanceof Error
                  ? error.message.slice(0, 1000)
                  : "Unknown delivery error",
              availableAt: new Date(
                Date.now() + Math.min(60, 2 ** attempts) * 60_000,
              ),
            },
          });
          logger.error(
            { err: error, notificationId: notification.id, attempts },
            "Notification delivery failed",
          );
        }
      }
    } catch (error) {
      logger.error({ err: error }, "Notification worker batch failed");
    } finally {
      working = false;
    }
  };

  void prisma.notification
    .updateMany({
      where: { status: "PROCESSING" },
      data: { status: "PENDING", availableAt: new Date() },
    })
    .then(() => processBatch())
    .catch((error) =>
      logger.error({ err: error }, "Notification worker recovery failed"),
    );

  const interval = setInterval(() => void processBatch(), POLL_INTERVAL_MS);
  interval.unref();
  return () => {
    stopped = true;
    clearInterval(interval);
    transport.close();
  };
}
