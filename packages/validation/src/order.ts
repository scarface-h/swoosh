import { z } from "zod";

const bdPhone = z.string().regex(/^(\+?880|0)?1[3-9]\d{8}$/, "Valid phone number required");

export const bangladeshDivisions = [
  "Dhaka", "Chittagong", "Rajshahi", "Khulna",
  "Barisal", "Sylhet", "Rangpur", "Mymensingh",
] as const;

export const checkoutSchema = z.object({
  customerName: z.string().min(2, "Name is required").max(100),
  customerPhone: bdPhone,
  customerEmail: z.string().email("Valid email required").optional().or(z.literal("")),
  division: z.enum(bangladeshDivisions, { required_error: "Division is required" }),
  district: z.string().min(2, "District is required").max(100),
  area: z.string().min(2, "Area is required").max(200),
  address: z.string().min(5, "Complete address is required").max(500),
  deliveryInstructions: z.string().max(500).optional(),
  paymentMethod: z.enum(["COD"]),
  couponCode: z.string().max(50).optional(),
  items: z.array(z.object({
    variantId: z.string().uuid(),
    quantity: z.number().int().min(1).max(10),
  })).min(1, "Cart cannot be empty"),
  idempotencyKey: z.string().uuid(),
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;
