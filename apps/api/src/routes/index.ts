import { Router } from 'express';
import { healthRouter } from '../modules/health/health.routes.js';
import { authRouter, adminAuthRouter } from '../modules/auth/auth.routes.js';
import { productRouter } from '../modules/products/product.routes.js';
import { checkoutRouter, orderRouter2 as orderRouter } from '../modules/checkout/checkout.routes.js';
import { adminRouter } from '../modules/admin/admin.routes.js';
import { publicRouter } from '../modules/public/public.routes.js';

const v1 = Router();

// Health (no version prefix — standard convention)
v1.use('/', healthRouter);

// Customer auth
v1.use('/auth', authRouter);

// Admin auth
v1.use('/admin/auth', adminAuthRouter);

// Catalogue
v1.use('/products', productRouter);
v1.use('/', publicRouter);

// Checkout & orders
v1.use('/checkout', checkoutRouter);
v1.use('/orders', orderRouter);

// Admin management
v1.use('/admin', adminRouter);

export const apiRouter = v1;
