import { ORDER_NUMBER_PREFIX } from "@swoosh/config";

export function generateOrderNumber(): string {
  const year = new Date().getFullYear();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${ORDER_NUMBER_PREFIX}-${year}-${random}`;
}
