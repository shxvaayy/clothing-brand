import { cookies } from "next/headers";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { trackServerEvent, parseUserAgent, EVENT_TYPES } from "@/lib/analytics";
import { ok, handleApiError, rateLimit, clientIp } from "@/lib/api-utils";
import crypto from "crypto";

const schema = z.object({
  type: z.string().min(1).max(40),
  path: z.string().max(512).optional(),
  productId: z.string().max(64).optional(),
  categoryId: z.string().max(64).optional(),
  query: z.string().max(256).optional(),
  referrer: z.string().max(512).optional(),
  utmSource: z.string().max(128).optional(),
  utmMedium: z.string().max(128).optional(),
  utmCampaign: z.string().max(128).optional(),
  // anything else lands in meta
}).passthrough();

const KNOWN = new Set([
  "type", "path", "productId", "categoryId", "query", "referrer",
  "utmSource", "utmMedium", "utmCampaign",
]);

export async function POST(req: Request) {
  try {
    const ip = clientIp(req);
    if (!rateLimit(`events:${ip}`, 120, 60_000)) return ok({ dropped: true });

    let raw: unknown;
    try {
      raw = await req.json();
    } catch {
      return ok({ dropped: true }); // empty/aborted beacon bodies are normal
    }
    const body = schema.parse(raw);
    if (!EVENT_TYPES.has(body.type)) return ok({ dropped: true });

    const store = await cookies();
    let visitorId = store.get("rn_vid")?.value;
    if (!visitorId) {
      visitorId = crypto.randomUUID();
      store.set("rn_vid", visitorId, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 60 * 60 * 24 * 365,
      });
    }
    let sessionId = store.get("rn_sid")?.value;
    if (!sessionId) {
      sessionId = crypto.randomUUID();
    }
    // rolling 30-minute session window
    store.set("rn_sid", sessionId, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 30 * 60,
    });

    const user = await getSessionUser();
    const ua = parseUserAgent(req.headers.get("user-agent") ?? "");
    // country from CDN/proxy headers only — no IP stored
    const country =
      req.headers.get("cf-ipcountry") ||
      req.headers.get("x-vercel-ip-country") ||
      req.headers.get("x-country") ||
      undefined;

    const meta: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(body)) {
      if (!KNOWN.has(k)) meta[k] = v;
    }

    await trackServerEvent({
      type: body.type,
      visitorId,
      sessionId,
      userId: user?.id,
      path: body.path,
      productId: body.productId,
      categoryId: body.categoryId,
      query: body.query,
      meta: Object.keys(meta).length ? meta : undefined,
      country: country ?? undefined,
      device: ua.device,
      browser: ua.browser,
      os: ua.os,
      referrer: body.referrer,
      utmSource: body.utmSource,
      utmMedium: body.utmMedium,
      utmCampaign: body.utmCampaign,
    });
    return ok({ tracked: true });
  } catch (e) {
    return handleApiError(e);
  }
}
