import { db } from "@/lib/db";
import { verifyPassword, createUserSession } from "@/lib/auth";
import { loginSchema } from "@/lib/validation";
import { ok, badRequest, handleApiError, rateLimit, clientIp } from "@/lib/api-utils";

export async function POST(req: Request) {
  try {
    if (!rateLimit(`login:${clientIp(req)}`, 15, 60_000)) {
      return badRequest("Too many attempts. Please wait a minute.");
    }
    const body = loginSchema.parse(await req.json());
    const user = await db.user.findUnique({ where: { email: body.email } });
    if (!user || !(await verifyPassword(body.password, user.passwordHash))) {
      return badRequest("Incorrect email or password");
    }
    await createUserSession(user.id);
    return ok({ id: user.id, name: user.name });
  } catch (e) {
    return handleApiError(e);
  }
}
