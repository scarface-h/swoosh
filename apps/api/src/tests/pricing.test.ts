import { describe, it, expect } from 'vitest';
import {
  resolveEffectivePrice,
  calculateCouponDiscount,
  buildPricing,
} from '../modules/pricing/pricing.service.js';
import { canTransition, assertTransition } from '../modules/orders/orderStatus.js';
import { generateOrderNumber } from '../modules/orders/orderNumber.js';
import { money, addMoney, percentageOf } from '../common/utilities/money.js';
import { defaultDeliveryCharge } from '../modules/checkout/delivery.service.js';
import { hasPermission } from '../modules/permissions/permissions.js';
import { sanitizePlainText, sanitizeRichText } from '../common/security/sanitize.js';

describe('money utilities', () => {
  it('formats to 2 decimals deterministically', () => {
    expect(money(100)).toBe('100.00');
    expect(money('99.9')).toBe('99.90');
  });
  it('adds without floating drift', () => {
    expect(addMoney(0.1, 0.2)).toBe(0.3);
  });
  it('computes percentages', () => {
    expect(percentageOf(1000, 10)).toBe(100);
  });
});

describe('resolveEffectivePrice', () => {
  it('uses base price when no sale', () => {
    const r = resolveEffectivePrice({ basePrice: 1000 });
    expect(r.effectivePrice).toBe(1000);
    expect(r.onSale).toBe(false);
  });
  it('applies an in-window sale price', () => {
    const r = resolveEffectivePrice({
      basePrice: 1000,
      salePrice: 800,
      saleStartsAt: new Date(Date.now() - 1000),
      saleEndsAt: new Date(Date.now() + 100000),
    });
    expect(r.effectivePrice).toBe(800);
    expect(r.onSale).toBe(true);
  });
  it('ignores an expired sale', () => {
    const r = resolveEffectivePrice({
      basePrice: 1000,
      salePrice: 800,
      saleEndsAt: new Date(Date.now() - 1000),
    });
    expect(r.effectivePrice).toBe(1000);
  });
  it('prefers variant override', () => {
    const r = resolveEffectivePrice({ basePrice: 1000, variantPriceOverride: 1200 });
    expect(r.regularPrice).toBe(1200);
  });
});

describe('calculateCouponDiscount', () => {
  it('percentage discount', () => {
    expect(calculateCouponDiscount(1000, { type: 'PERCENTAGE', value: 10 })).toBe(100);
  });
  it('caps at maxDiscount', () => {
    expect(calculateCouponDiscount(1000, { type: 'PERCENTAGE', value: 50, maxDiscount: 200 })).toBe(200);
  });
  it('fixed discount never exceeds subtotal', () => {
    expect(calculateCouponDiscount(150, { type: 'FIXED', value: 500 })).toBe(150);
  });
});

describe('buildPricing', () => {
  it('produces an itemized breakdown with delivery', () => {
    const p = buildPricing({
      lines: [
        { productName: 'Tee', variantSku: 'T-1', optionsLabel: 'Black / M', unitPrice: 800, regularPrice: 1000, quantity: 2 },
      ],
      deliveryCharge: 100,
    });
    expect(p.subtotal).toBe('1600.00');
    expect(p.productDiscount).toBe('400.00');
    expect(p.deliveryCharge).toBe('100.00');
    expect(p.grandTotal).toBe('1700.00');
  });

  it('applies a coupon to the grand total', () => {
    const p = buildPricing({
      lines: [
        { productName: 'Tee', variantSku: 'T-1', optionsLabel: 'M', unitPrice: 1000, regularPrice: 1000, quantity: 1 },
      ],
      deliveryCharge: 150,
      coupon: { type: 'PERCENTAGE', value: 10 },
    });
    expect(p.subtotal).toBe('1000.00');
    expect(p.couponDiscount).toBe('100.00');
    expect(p.grandTotal).toBe('1050.00'); // 1000 - 100 + 150
  });
});

describe('order status transitions', () => {
  it('allows valid forward transitions', () => {
    expect(canTransition('PENDING', 'CONFIRMED')).toBe(true);
    expect(canTransition('CONFIRMED', 'PROCESSING')).toBe(true);
  });
  it('rejects invalid transitions', () => {
    expect(canTransition('DELIVERED', 'PROCESSING')).toBe(false);
    expect(canTransition('CANCELLED', 'SHIPPED')).toBe(false);
    expect(() => assertTransition('REFUNDED', 'PENDING')).toThrow();
  });
});

describe('order number', () => {
  it('is unique and correctly prefixed', () => {
    const a = generateOrderNumber();
    const b = generateOrderNumber();
    expect(a).toMatch(/^SW-\d{6}-[A-Z0-9]{8}$/);
    expect(a).not.toBe(b);
  });
});

describe('delivery and permission policy', () => {
  it('uses Bangladesh delivery defaults', () => {
    expect(defaultDeliveryCharge('DHAKA_INSIDE')).toBe(100);
    expect(defaultDeliveryCharge('OUTSIDE_DHAKA')).toBe(150);
  });
  it('requires the exact backend permission', () => {
    expect(hasPermission(['orders.read'], 'orders.read')).toBe(true);
    expect(hasPermission(['orders.read'], 'orders.refund')).toBe(false);
  });
});

describe('content sanitization', () => {
  it('strips executable markup from customer content', () => {
    expect(sanitizePlainText('<script>alert(1)</script>Hello')).toBe('Hello');
    expect(sanitizeRichText('<p>Hello</p><img src=x onerror=alert(1)>')).toBe('<p>Hello</p>');
  });
});
