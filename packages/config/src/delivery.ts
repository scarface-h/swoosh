import type { DeliveryZone } from "@swoosh/types";

export const DELIVERY_CHARGES: Record<DeliveryZone, number> = {
  DHAKA_INSIDE: 100,
  OUTSIDE_DHAKA: 150,
};

export const DHAKA_DIVISION = "Dhaka";

export function getDeliveryZone(division: string): DeliveryZone {
  return division === DHAKA_DIVISION ? "DHAKA_INSIDE" : "OUTSIDE_DHAKA";
}

export function getDeliveryCharge(division: string): number {
  return DELIVERY_CHARGES[getDeliveryZone(division)];
}

export const ESTIMATED_DELIVERY_DAYS: Record<DeliveryZone, string> = {
  DHAKA_INSIDE: "1-2 business days",
  OUTSIDE_DHAKA: "3-5 business days",
};
