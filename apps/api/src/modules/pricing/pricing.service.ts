import { addMoney, money, multiplyMoney, percentageOf, subtractMoney } from '../../common/utilities/money.js';

export interface EffectivePriceInput {
  basePrice: number | string;
  salePrice?: number | string | null;
  saleStartsAt?: Date | null;
  saleEndsAt?: Date | null;
  variantPriceOverride?: number | string | null;
  variantSalePriceOverride?: number | string | null;
  now?: Date;
}

/**
 * Resolve the authoritative unit price for a variant at a given time.
 * Variant overrides take precedence over the product price. An active,
 * in-window sale price wins over the regular price.
 */
export function resolveEffectivePrice(input: EffectivePriceInput): {
  regularPrice: number;
  effectivePrice: number;
  onSale: boolean;
} {
  const now = input.now ?? new Date();

  const regularPrice =
    input.variantPriceOverride != null ? Number(input.variantPriceOverride) : Number(input.basePrice);

  const saleCandidate =
    input.variantSalePriceOverride != null
      ? Number(input.variantSalePriceOverride)
      : input.salePrice != null
        ? Number(input.salePrice)
        : null;

  const saleWindowOpen =
    (!input.saleStartsAt || input.saleStartsAt <= now) &&
    (!input.saleEndsAt || input.saleEndsAt >= now);

  const onSale = saleCandidate != null && saleCandidate < regularPrice && saleWindowOpen;
  const effectivePrice = onSale ? (saleCandidate as number) : regularPrice;

  return { regularPrice, effectivePrice, onSale };
}

export type CouponType = 'PERCENTAGE' | 'FIXED';

export interface CouponForCalc {
  type: CouponType;
  value: number | string;
  maxDiscount?: number | string | null;
  eligibleSubtotal?: number;
}

/** Calculate a coupon discount against a subtotal (deterministic decimal). */
export function calculateCouponDiscount(subtotal: number, coupon: CouponForCalc): number {
  const discountableSubtotal = Math.min(subtotal, coupon.eligibleSubtotal ?? subtotal);
  let discount =
    coupon.type === 'PERCENTAGE' ? percentageOf(discountableSubtotal, Number(coupon.value)) : Number(coupon.value);

  if (coupon.maxDiscount != null) {
    discount = Math.min(discount, Number(coupon.maxDiscount));
  }
  // Never discount more than the subtotal.
  discount = Math.min(discount, discountableSubtotal);
  return discount < 0 ? 0 : discount;
}

export interface PricingLineInput {
  productName: string;
  variantSku: string;
  optionsLabel: string;
  unitPrice: number; // effective unit price
  regularPrice: number;
  quantity: number;
}

export interface PricingLineResult extends PricingLineInput {
  discount: number; // per-line sale discount (regular - effective) * qty
  lineTotal: string; // effective * qty, formatted
}

export interface PricingBreakdown {
  lines: PricingLineResult[];
  subtotal: string;
  productDiscount: string;
  couponDiscount: string;
  discountTotal: string;
  deliveryCharge: string;
  grandTotal: string;
}

export interface BuildPricingInput {
  lines: PricingLineInput[];
  deliveryCharge: number;
  coupon?: CouponForCalc | null;
}

/**
 * Central pricing engine. Produces an itemized, deterministic breakdown.
 * The backend is the single source of truth — browser totals are never trusted.
 */
export function buildPricing(input: BuildPricingInput): PricingBreakdown {
  const lines: PricingLineResult[] = input.lines.map((l) => {
    const lineTotal = multiplyMoney(l.unitPrice, l.quantity);
    const perUnitSaleDiscount = subtractMoney(l.regularPrice, l.unitPrice);
    const discount = multiplyMoney(perUnitSaleDiscount, l.quantity);
    return { ...l, discount, lineTotal: money(lineTotal) };
  });

  const subtotal = addMoney(...lines.map((l) => l.lineTotal));
  const productDiscount = addMoney(...lines.map((l) => l.discount));

  const couponDiscount = input.coupon ? calculateCouponDiscount(subtotal, input.coupon) : 0;
  const discountTotal = couponDiscount; // product sale is already reflected in subtotal

  const grandTotal = addMoney(subtractMoney(subtotal, couponDiscount), input.deliveryCharge);

  return {
    lines,
    subtotal: money(subtotal),
    productDiscount: money(productDiscount),
    couponDiscount: money(couponDiscount),
    discountTotal: money(discountTotal),
    deliveryCharge: money(input.deliveryCharge),
    grandTotal: money(grandTotal),
  };
}
