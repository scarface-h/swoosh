import { CURRENCY_LOCALE, CURRENCY_CODE, CURRENCY_SYMBOL } from "@swoosh/config";

const formatter = new Intl.NumberFormat(CURRENCY_LOCALE, {
  style: "currency",
  currency: CURRENCY_CODE,
  maximumFractionDigits: 0,
});

export function formatCurrency(amount: number): string {
  return formatter.format(amount).replace(CURRENCY_CODE, CURRENCY_SYMBOL).replace("BDT", CURRENCY_SYMBOL).trim();
}

export function getDiscountPercentage(price: number, previousPrice: number): number {
  if (previousPrice <= price) return 0;
  return Math.round(((previousPrice - price) / previousPrice) * 100);
}
