import { z } from "zod";

export const emailSchema = z.string().trim().toLowerCase().email("Enter a valid email");
export const phoneSchema = z
  .string()
  .trim()
  .regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit mobile number");
export const pincodeSchema = z
  .string()
  .trim()
  .regex(/^[1-9][0-9]{5}$/, "Enter a valid 6-digit pincode");

export const registerSchema = z.object({
  name: z.string().trim().min(2, "Enter your name").max(80),
  email: emailSchema,
  password: z.string().min(8, "Password must be at least 8 characters").max(100),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Enter your password"),
});

export const addressSchema = z.object({
  label: z.string().trim().max(30).default("Home"),
  fullName: z.string().trim().min(2, "Enter full name").max(80),
  phone: phoneSchema,
  line1: z.string().trim().min(3, "Enter house/flat and building").max(160),
  line2: z.string().trim().max(160).optional().or(z.literal("")),
  landmark: z.string().trim().max(120).optional().or(z.literal("")),
  city: z.string().trim().min(2, "Enter city").max(80),
  state: z.string().trim().min(2, "Enter state").max(80),
  pincode: pincodeSchema,
  country: z.string().trim().default("India"),
  isDefault: z.boolean().optional(),
});

export const cartAddSchema = z.object({
  variantId: z.string().min(1),
  quantity: z.number().int().min(1).max(10).default(1),
});

export const cartUpdateSchema = z.object({
  itemId: z.string().min(1),
  quantity: z.number().int().min(0).max(10),
});

export const checkoutSchema = z.object({
  address: addressSchema,
  guestEmail: emailSchema.optional(),
  saveAddress: z.boolean().optional(),
});

export const leadSchema = z.object({
  name: z.string().trim().max(80).optional(),
  email: emailSchema.optional(),
  phone: z.string().trim().max(15).optional(),
  source: z.enum(["NEWSLETTER", "CONTACT_FORM", "PRODUCT_INQUIRY", "BACK_IN_STOCK"]),
  message: z.string().trim().max(2000).optional(),
  productInterest: z.string().trim().max(200).optional(),
}).refine((d) => d.email || d.phone, { message: "Email or phone is required" });

export const reviewSchema = z.object({
  productId: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  title: z.string().trim().max(120).optional(),
  body: z.string().trim().max(2000).optional(),
});

// ---------- Admin ----------

export const variantInputSchema = z.object({
  id: z.string().optional(),
  size: z.string().trim().min(1, "Size required").max(20),
  color: z.string().trim().min(1, "Colour required").max(40),
  colorHex: z.string().trim().regex(/^#[0-9a-fA-F]{6}$/).optional().or(z.literal("")).or(z.null()),
  priceOverride: z.number().int().min(0).nullable().optional(),
  stock: z.number().int().min(0, "Stock cannot be negative"),
  active: z.boolean().default(true),
});

export const productInputSchema = z
  .object({
    name: z.string().trim().min(2, "Enter product name").max(160),
    slug: z.string().trim().regex(/^[a-z0-9-]+$/, "Slug can contain lowercase letters, numbers, hyphens").max(160),
    sku: z.string().trim().min(2, "Enter SKU").max(60),
    description: z.string().trim().min(10, "Description is too short"),
    shortDescription: z.string().trim().max(300).optional().or(z.literal("")),
    fabric: z.string().trim().max(160).optional().or(z.literal("")),
    fit: z.string().trim().max(160).optional().or(z.literal("")),
    care: z.string().trim().max(300).optional().or(z.literal("")),
    mrp: z.number().int().min(1, "MRP must be greater than 0"),
    sellingPrice: z.number().int().min(1, "Selling price must be greater than 0"),
    costPrice: z.number().int().min(0).nullable().optional(),
    lowStockThreshold: z.number().int().min(0).max(1000).default(5),
    categoryId: z.string().nullable().optional(),
    collectionIds: z.array(z.string()).default([]),
    tags: z.array(z.string().trim().toLowerCase()).default([]),
    featured: z.boolean().default(false),
    bestSeller: z.boolean().default(false),
    newArrival: z.boolean().default(false),
    onSale: z.boolean().default(false),
    seoTitle: z.string().trim().max(70).optional().or(z.literal("")),
    seoDescription: z.string().trim().max(170).optional().or(z.literal("")),
    seoKeywords: z.string().trim().max(300).optional().or(z.literal("")),
    variants: z.array(variantInputSchema).min(1, "Add at least one size/colour variant"),
    images: z
      .array(
        z.object({
          id: z.string().optional(),
          url: z.string().min(1),
          alt: z.string().max(200).optional().or(z.literal("")),
        })
      )
      .default([]),
  })
  .refine((d) => d.sellingPrice <= d.mrp, {
    message: "Selling price cannot be higher than MRP",
    path: ["sellingPrice"],
  });

export const couponInputSchema = z.object({
  code: z.string().trim().toUpperCase().regex(/^[A-Z0-9]{3,20}$/, "3–20 letters/numbers"),
  type: z.enum(["PERCENT", "FIXED"]),
  value: z.number().int().min(1),
  minCartValue: z.number().int().min(0).default(0),
  maxDiscount: z.number().int().min(0).nullable().optional(),
  startsAt: z.string().nullable().optional(),
  endsAt: z.string().nullable().optional(),
  usageLimit: z.number().int().min(1).nullable().optional(),
  perUserLimit: z.number().int().min(1).nullable().optional(),
  active: z.boolean().default(true),
});

export type ProductInput = z.infer<typeof productInputSchema>;
export type VariantInput = z.infer<typeof variantInputSchema>;
