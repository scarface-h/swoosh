import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../../common/utilities/asyncHandler.js";
import { validate } from "../../common/middleware/validate.js";
import { sendSuccess } from "../../common/http/response.js";
import { requireAuth } from "../../common/middleware/auth.js";
import { authLimiter } from "../../common/middleware/rateLimit.js";
import {
  setRefreshCookie,
  clearRefreshCookie,
  readRefreshToken,
} from "./cookies.js";
import {
  registerCustomer,
  loginCustomer,
  refreshCustomer,
  changeCustomerPassword,
  createPasswordReset,
  resetPassword,
  verifyCustomerEmail,
  resendCustomerVerification,
  loginAdmin,
  refreshAdmin,
  logout,
  logoutAllCustomer,
  changeAdminPassword,
} from "./auth.service.js";
import { AppError } from "../../common/errors/AppError.js";
import { writeAuditLog } from "../audit/audit.service.js";

const router = Router();

const credentials = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

const registerSchema = credentials
  .extend({
    name: z.string().min(2).max(120),
    phone: z.string().min(6).optional(),
    password: z.string().min(12).max(128),
  })
  .strict();

// ------------------------------ Customer -----------------------------------

router.post(
  "/register",
  authLimiter,
  validate({ body: registerSchema }),
  asyncHandler(async (req, res) => {
    const result = await registerCustomer(req.body);
    setRefreshCookie(res, result.refreshToken);
    sendSuccess(
      res,
      { accessToken: result.accessToken, userId: result.userId },
      201,
    );
  }),
);

router.post(
  "/login",
  authLimiter,
  validate({ body: credentials }),
  asyncHandler(async (req, res) => {
    const result = await loginCustomer(req.body);
    setRefreshCookie(res, result.refreshToken);
    sendSuccess(res, {
      accessToken: result.accessToken,
      userId: result.userId,
    });
  }),
);

router.post(
  "/refresh",
  asyncHandler(async (req, res) => {
    const raw = readRefreshToken(req);
    if (!raw) throw AppError.unauthorized("Missing refresh token");
    const result = await refreshCustomer(raw);
    setRefreshCookie(res, result.refreshToken);
    sendSuccess(res, { accessToken: result.accessToken });
  }),
);

router.post(
  "/logout",
  asyncHandler(async (req, res) => {
    const raw = readRefreshToken(req);
    if (raw) await logout(raw);
    clearRefreshCookie(res);
    sendSuccess(res, { success: true });
  }),
);

router.post(
  "/forgot-password",
  authLimiter,
  validate({ body: z.object({ email: z.string().email() }).strict() }),
  asyncHandler(async (req, res) => {
    await createPasswordReset(req.body.email);
    sendSuccess(res, {
      message: "If the account exists, reset instructions will be sent",
    });
  }),
);

router.post(
  "/reset-password",
  authLimiter,
  validate({
    body: z
      .object({
        token: z.string().min(32),
        password: z.string().min(12).max(128),
      })
      .strict(),
  }),
  asyncHandler(async (req, res) => {
    await resetPassword(req.body.token, req.body.password);
    sendSuccess(res, { reset: true });
  }),
);

router.post(
  "/verify-email",
  authLimiter,
  validate({ body: z.object({ token: z.string().min(32) }).strict() }),
  asyncHandler(async (req, res) => {
    await verifyCustomerEmail(req.body.token);
    sendSuccess(res, { verified: true });
  }),
);

router.post(
  "/resend-verification",
  authLimiter,
  requireAuth("customer"),
  asyncHandler(async (req, res) => {
    await resendCustomerVerification(req.auth!.sub);
    sendSuccess(res, { queued: true });
  }),
);

router.post(
  "/change-password",
  requireAuth("customer"),
  validate({
    body: z.object({
      currentPassword: z.string().min(1),
      newPassword: z.string().min(12).max(128),
    }),
  }),
  asyncHandler(async (req, res) => {
    await changeCustomerPassword(
      req.auth!.sub,
      req.body.currentPassword,
      req.body.newPassword,
    );
    clearRefreshCookie(res);
    sendSuccess(res, { success: true });
  }),
);

router.post(
  "/logout-all",
  requireAuth("customer"),
  asyncHandler(async (req, res) => {
    await logoutAllCustomer(req.auth!.sub);
    clearRefreshCookie(res);
    sendSuccess(res, { revoked: true });
  }),
);

export const authRouter = router;

// ------------------------------- Admin -------------------------------------

const adminRouter = Router();

adminRouter.post(
  "/login",
  authLimiter,
  validate({ body: credentials }),
  asyncHandler(async (req, res) => {
    try {
      const result = await loginAdmin(req.body);
      await writeAuditLog({
        adminId: result.adminId,
        action: "admin.login",
        entityType: "AdminUser",
        entityId: result.adminId,
        requestId: res.locals.requestId,
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
      });
      setRefreshCookie(res, result.refreshToken, true);
      sendSuccess(res, {
        accessToken: result.accessToken,
        permissions: result.permissions,
      });
    } catch (error) {
      await writeAuditLog({
        action: "admin.login_failed",
        entityType: "AdminUser",
        requestId: res.locals.requestId,
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
      });
      throw error;
    }
  }),
);

adminRouter.post(
  "/refresh",
  asyncHandler(async (req, res) => {
    const raw = readRefreshToken(req, true);
    if (!raw) throw AppError.unauthorized("Missing refresh token");
    const result = await refreshAdmin(raw);
    setRefreshCookie(res, result.refreshToken, true);
    sendSuccess(res, {
      accessToken: result.accessToken,
      permissions: result.permissions,
    });
  }),
);

adminRouter.post(
  "/logout",
  asyncHandler(async (req, res) => {
    const raw = readRefreshToken(req, true);
    if (raw) await logout(raw);
    clearRefreshCookie(res, true);
    sendSuccess(res, { success: true });
  }),
);

adminRouter.post(
  "/change-password",
  requireAuth("admin"),
  validate({
    body: z
      .object({
        currentPassword: z.string().min(1),
        newPassword: z.string().min(12).max(128),
      })
      .strict(),
  }),
  asyncHandler(async (req, res) => {
    await changeAdminPassword(
      req.auth!.sub,
      req.body.currentPassword,
      req.body.newPassword,
    );
    clearRefreshCookie(res, true);
    await writeAuditLog({
      adminId: req.auth!.sub,
      action: "admin.password_change",
      entityType: "AdminUser",
      entityId: req.auth!.sub,
      requestId: res.locals.requestId,
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });
    sendSuccess(res, { success: true });
  }),
);

export const adminAuthRouter = adminRouter;
