import { destroyUserSession } from "@/lib/auth";
import { ok } from "@/lib/api-utils";

export async function POST() {
  await destroyUserSession();
  return ok({ done: true });
}
