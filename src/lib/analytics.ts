import { db } from "./db";
import type { Prisma } from "@/generated/prisma/client";

export type TrackInput = {
  type: string;
  visitorId: string;
  sessionId: string;
  userId?: string | null;
  path?: string;
  productId?: string | null;
  categoryId?: string | null;
  query?: string;
  meta?: Record<string, unknown>;
  country?: string;
  device?: string;
  browser?: string;
  os?: string;
  referrer?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
};

export const EVENT_TYPES = new Set([
  "page_view",
  "product_view",
  "category_view",
  "collection_view",
  "search",
  "filter_used",
  "sort_used",
  "variant_selected",
  "add_to_cart",
  "remove_from_cart",
  "wishlist_add",
  "wishlist_remove",
  "cart_view",
  "checkout_started",
  "address_added",
  "payment_started",
  "payment_success",
  "payment_failed",
  "purchase",
  "coupon_applied",
  "coupon_failed",
  "signup",
  "login",
  "lead_created",
]);

export async function trackServerEvent(input: TrackInput) {
  if (!EVENT_TYPES.has(input.type)) return;
  try {
    await db.analyticsEvent.create({
      data: {
        type: input.type,
        visitorId: input.visitorId.slice(0, 64),
        sessionId: input.sessionId.slice(0, 64),
        userId: input.userId ?? null,
        path: input.path?.slice(0, 512),
        productId: input.productId ?? null,
        categoryId: input.categoryId ?? null,
        query: input.query?.slice(0, 256),
        meta: (input.meta ?? undefined) as Prisma.InputJsonValue | undefined,
        country: input.country,
        device: input.device,
        browser: input.browser,
        os: input.os,
        referrer: input.referrer?.slice(0, 512),
        utmSource: input.utmSource?.slice(0, 128),
        utmMedium: input.utmMedium?.slice(0, 128),
        utmCampaign: input.utmCampaign?.slice(0, 128),
      },
    });
  } catch (e) {
    console.error("analytics track failed", e);
  }
}

/** Parse device/browser/os from a user-agent string (approximate, no PII). */
export function parseUserAgent(ua: string) {
  const device = /Mobi|Android.+Mobile|iPhone/.test(ua)
    ? "mobile"
    : /iPad|Tablet/.test(ua)
      ? "tablet"
      : "desktop";
  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /Chrome\//.test(ua)
      ? "Chrome"
      : /Safari\//.test(ua) && /Version\//.test(ua)
        ? "Safari"
        : /Firefox\//.test(ua)
          ? "Firefox"
          : "Other";
  const os = /Windows/.test(ua)
    ? "Windows"
    : /Android/.test(ua)
      ? "Android"
      : /iPhone|iPad|iOS/.test(ua)
        ? "iOS"
        : /Mac OS X/.test(ua)
          ? "macOS"
          : /Linux/.test(ua)
            ? "Linux"
            : "Other";
  return { device, browser, os };
}
