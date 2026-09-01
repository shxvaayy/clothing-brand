import { db } from "@/lib/db";
import { leadSchema } from "@/lib/validation";
import { ok, handleApiError, rateLimit, clientIp, badRequest } from "@/lib/api-utils";
import { trackServerEvent } from "@/lib/analytics";

export async function POST(req: Request) {
  try {
    if (!rateLimit(`leads:${clientIp(req)}`, 10, 60_000)) {
      return badRequest("Too many requests. Please try again in a minute.");
    }
    const body = leadSchema.parse(await req.json());

    // avoid duplicate newsletter signups
    if (body.source === "NEWSLETTER" && body.email) {
      const existing = await db.lead.findFirst({
        where: { email: body.email, source: "NEWSLETTER" },
      });
      if (existing) return ok({ id: existing.id, duplicate: true });
    }

    const lead = await db.lead.create({
      data: {
        name: body.name,
        email: body.email,
        phone: body.phone,
        source: body.source,
        message: body.message,
        productInterest: body.productInterest,
        landingPage: req.headers.get("referer")?.slice(0, 512),
      },
    });
    void trackServerEvent({
      type: "lead_created",
      visitorId: "server",
      sessionId: "server",
      meta: { leadId: lead.id, source: body.source },
    });
    return ok({ id: lead.id });
  } catch (e) {
    return handleApiError(e);
  }
}
