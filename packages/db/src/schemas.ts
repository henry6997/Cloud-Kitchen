import { z } from "zod";
import { normalizePhone } from "./phone";

/** Strip control characters and tags; notes and addresses are rendered as text only. */
export const cleanText = (max: number) =>
  z
    .string()
    .transform((s) => s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").replace(/[<>]/g, "").trim())
    .pipe(z.string().max(max));

export const emailSchema = z.string().trim().toLowerCase().pipe(z.email("Enter a valid email").max(120));
export const passwordSchema = z.string().min(8, "Use at least 8 characters").max(72);

export const phoneSchema = z
  .string()
  .transform((s, ctx) => {
    const p = normalizePhone(s);
    if (!p) {
      ctx.addIssue({ code: "custom", message: "Enter a 10-digit mobile number" });
      return z.NEVER;
    }
    return p;
  });

export const loginSchema = z.object({ email: emailSchema, password: z.string().min(1, "Enter your password").max(72) });

export const signupSchema = z.object({
  fullName: cleanText(60).pipe(z.string().min(2, "Enter your name")),
  email: emailSchema,
  phone: phoneSchema,
  password: passwordSchema,
});

export const resetSchema = z.object({ email: emailSchema });

export const addressSchema = z.object({
  id: z.string().optional(),
  label: cleanText(20).pipe(z.string().min(1, "Give it a name like Home")),
  line1: cleanText(120).pipe(z.string().min(3, "Enter the flat, building and street")),
  line2: cleanText(120).default(""),
  landmark: cleanText(80).default(""),
  pincode: z.string().trim().regex(/^\d{6}$/, "Enter a 6-digit pincode"),
  isDefault: z.boolean().default(false),
});

export const profileSchema = z.object({
  fullName: cleanText(60).pipe(z.string().min(2, "Enter your name")),
  phone: phoneSchema,
});

export const cartLineSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().min(1).max(20),
  optionIds: z.array(z.string()).max(30),
  note: cleanText(140).optional(),
});

export const createOrderSchema = z
  .object({
    type: z.enum(["delivery", "pickup"]),
    addressId: z.string().optional(),
    paymentMethod: z.enum(["online", "cod"]),
    note: cleanText(140).default(""),
    lines: z.array(cartLineSchema).min(1, "Your cart is empty").max(40),
  })
  .refine((v) => v.type === "pickup" || !!v.addressId, { message: "Choose a delivery address", path: ["addressId"] });

export const riderSchema = z.object({
  riderName: cleanText(60),
  riderPhone: z.union([z.literal(""), phoneSchema]),
});

export const cancelSchema = z.object({ reason: cleanText(200).pipe(z.string().min(3, "Add a short reason")) });

const money = z.coerce.number().int().min(0).max(10_000_000);

export const categorySchema = z.object({
  id: z.string().optional(),
  name: cleanText(40).pipe(z.string().min(2, "Enter a name")),
  emoji: cleanText(8).default("🍽️"),
  imageUrl: z.union([z.null(), z.string().max(500)]).optional(),
  isVisible: z.boolean().default(true),
});

export const optionSchema = z.object({
  id: z.string().optional(),
  name: cleanText(40).pipe(z.string().min(1)),
  priceDeltaPaise: money,
  isAvailable: z.boolean().default(true),
});

export const optionGroupSchema = z.object({
  id: z.string().optional(),
  name: cleanText(40).pipe(z.string().min(1)),
  kind: z.enum(["single", "multiple"]),
  isRequired: z.boolean(),
  options: z.array(optionSchema).min(1).max(12),
});

export const productSchema = z.object({
  id: z.string().optional(),
  categoryId: z.string().min(1, "Pick a category"),
  name: cleanText(60).pipe(z.string().min(2, "Enter a name")),
  description: cleanText(240).default(""),
  pricePaise: money.pipe(z.number().min(100, "Price must be at least ₹1")),
  comparePricePaise: z.union([z.null(), money]).default(null),
  imageUrl: z.union([z.null(), z.string().max(500)]).default(null),
  emoji: cleanText(8).default("🍽️"),
  isVeg: z.boolean(),
  isAvailable: z.boolean().default(true),
  isPopular: z.boolean().default(false),
  isCombo: z.boolean().default(false),
  tag: z.union([z.null(), cleanText(24)]).default(null),
  prepMinutes: z.coerce.number().int().min(1).max(180).default(20),
  optionGroups: z.array(optionGroupSchema).max(6).default([]),
});

export const bannerSchema = z.object({
  id: z.string().optional(),
  label: cleanText(60).default(""),
  imageUrl: z.union([z.null(), z.string().max(500)]).default(null),
  linkType: z.enum(["none", "category", "product", "url"]).default("none"),
  linkTarget: cleanText(300).default(""),
  slot: z.enum(["hero", "strip"]),
  isActive: z.boolean().default(true),
});

export const settingsSchema = z.object({
  kitchenName: cleanText(60).pipe(z.string().min(2)),
  address: cleanText(200),
  phone: phoneSchema,
  deliveryFeePaise: money,
  freeDeliveryThresholdPaise: money,
  minOrderPaise: money,
  gstPercent: z.coerce.number().min(0).max(28),
  deliveryPincodes: z.array(z.string().regex(/^\d{6}$/)).max(200),
  pickupEtaMinutes: z.coerce.number().int().min(5).max(180),
  deliveryEtaText: cleanText(30),
  enforceKitchenHours: z.boolean().default(false),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type AddressInput = z.infer<typeof addressSchema>;
export type ProductInput = z.infer<typeof productSchema>;
export type CategoryInput = z.infer<typeof categorySchema>;
export type BannerInput = z.infer<typeof bannerSchema>;
export type SettingsInput = z.infer<typeof settingsSchema>;
export type SignupInput = z.infer<typeof signupSchema>;
export type ProfileInput = z.infer<typeof profileSchema>;

export function firstError(err: z.ZodError): string {
  return err.issues[0]?.message ?? "Please check the form";
}
