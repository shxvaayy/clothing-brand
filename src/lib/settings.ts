import { db } from "./db";
import type { Prisma } from "@/generated/prisma/client";

export type StoreSettings = {
  storeName: string;
  supportEmail: string;
  supportPhone: string;
  freeShippingAbove: number; // paise; 0 = always free
  shippingFee: number; // paise
  codEnabled: boolean;
  announcementText: string;
  instagramUrl: string;
  returnWindowDays: number;
};

export const DEFAULT_SETTINGS: StoreSettings = {
  storeName: "Rare Naari",
  supportEmail: "care@rarenaari.com",
  supportPhone: "",
  freeShippingAbove: 99900,
  shippingFee: 7900,
  codEnabled: false,
  announcementText: "Free shipping on orders above ₹999",
  instagramUrl: "",
  returnWindowDays: 7,
};

export async function getSettings(): Promise<StoreSettings> {
  const row = await db.setting.findUnique({ where: { key: "store" } });
  if (!row) return DEFAULT_SETTINGS;
  return { ...DEFAULT_SETTINGS, ...(row.value as Partial<StoreSettings>) };
}

export async function saveSettings(value: Partial<StoreSettings>) {
  const current = await getSettings();
  const next = { ...current, ...value };
  await db.setting.upsert({
    where: { key: "store" },
    create: { key: "store", value: next as unknown as Prisma.InputJsonValue },
    update: { value: next as unknown as Prisma.InputJsonValue },
  });
  return next;
}
