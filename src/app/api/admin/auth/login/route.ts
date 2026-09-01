import { db } from "@/lib/db";
import { verifyPassword, createAdminSession } from "@/lib/auth";
import { loginSchema } from "@/lib/validation";
import { ok, badRequest, handleApiError, rateLimit, clientIp } from "@/lib/api-utils";
import { audit } from "@/lib/audit";

export async function POST(req: Request) {
  try {
    if (!rateLimit(`admin-login:${clientIp(req)}`, 8, 60_000)) {
      return badRequest("Too many attempts. Please wait a minute.");
    }
    const body = loginSchema.parse(await req.json());
    const admin = await db.adminUser.findUnique({ where: { email: body.email } });
    if (!admin || !admin.active || !(await verifyPassword(body.password, admin.passwordHash))) {
      return badRequest("Incorrect email or password");
    }
    await createAdminSession(admin.id);
    await audit({ adminId: admin.id, actor: admin.email, action: "LOGIN", entity: "AdminUser", entityId: admin.id });
    return ok({ id: admin.id, role: admin.role });
  } catch (e) {
    return handleApiError(e);
  }
}
