/**
 * Deterministic money helpers. We work in integer "paisa" (1 BDT = 100 paisa)
 * internally to avoid floating-point drift, then format to 2-decimal strings
 * suitable for Prisma DECIMAL(12,2) columns.
 */

export function toPaisa(amount: number | string): number {
  const n = typeof amount === 'string' ? Number(amount) : amount;
  if (!Number.isFinite(n)) throw new Error(`Invalid money amount: ${amount}`);
  return Math.round(n * 100);
}

export function fromPaisa(paisa: number): number {
  return Math.round(paisa) / 100;
}

/** Returns a fixed 2-decimal string, e.g. "1234.00" — safe for DECIMAL columns. */
export function money(amount: number | string): string {
  return fromPaisa(toPaisa(amount)).toFixed(2);
}

export function addMoney(...amounts: Array<number | string>): number {
  return fromPaisa(amounts.reduce<number>((sum, a) => sum + toPaisa(a), 0));
}

export function subtractMoney(a: number | string, b: number | string): number {
  return fromPaisa(toPaisa(a) - toPaisa(b));
}

export function multiplyMoney(amount: number | string, qty: number): number {
  return fromPaisa(toPaisa(amount) * qty);
}

export function percentageOf(amount: number | string, percent: number): number {
  return fromPaisa(Math.round((toPaisa(amount) * percent) / 100));
}

export function clampMoney(amount: number, min: number, max: number): number {
  return Math.min(Math.max(amount, min), max);
}
