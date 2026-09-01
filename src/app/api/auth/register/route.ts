import { db } from "@/lib/db";
import { hashPassword, createUserSession } from "@/lib/auth";
import { registerSchema } from "@/lib/validation";
import { ok, badRequest, handleApiError, rateLimit, clientIp } from "@/lib/api-utils";
import { sendWelcome } from "@/lib/email/send";
import { trackServerEvent } from "@/lib/analytics";

export async function POST(req: Request) {
  try {
    if (!rateLimit(`register:${clientIp(req)}`, 10, 60_000)) {
      return badRequest("Too many attempts. Please wait a minute.");
    }
    const body = registerSchema.parse(await req.json());
    const existing = await db.user.findUnique({ where: { email: body.email } });
    if (existing) return badRequest("An account with this email already exists");

    const user = await db.user.create({
      data: {
        name: body.name,
        email: body.email,
        passwordHash: await hashPassword(body.password),
      },
    });
    await createUserSession(user.id);
    void sendWelcome(user.email, user.name).catch(() => {});
    void trackServerEvent({
      type: "signup",
      visitorId: "server",
      sessionId: "server",
      userId: user.id,
    });
    return ok({ id: user.id, name: user.name });
  } catch (e) {
    return handleApiError(e);
  }
}
