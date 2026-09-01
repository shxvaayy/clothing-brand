import { destroyAdminSession } from "@/lib/auth";
import { ok } from "@/lib/api-utils";

export async function POST() {
  await destroyAdminSession();
  return ok({ done: true });
}
