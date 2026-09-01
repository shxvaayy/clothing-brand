import { mkdir, writeFile } from "fs/promises";
import path from "path";
import crypto from "crypto";
import { requireAdmin } from "@/lib/auth";
import { ok, badRequest, handleApiError } from "@/lib/api-utils";

const ALLOWED = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
  ["image/avif", "avif"],
]);
const MAX_BYTES = 8 * 1024 * 1024;

/**
 * Local disk storage under public/uploads. On Render attach a persistent
 * disk, or swap this handler for S3/R2 — the admin UI only consumes the
 * returned { url }.
 */
export async function POST(req: Request) {
  try {
    await requireAdmin(["ADMIN", "EDITOR", "INVENTORY_MANAGER"]);
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return badRequest("No file uploaded");
    const ext = ALLOWED.get(file.type);
    if (!ext) return badRequest("Only JPG, PNG, WEBP or AVIF images are allowed");
    if (file.size > MAX_BYTES) return badRequest("Image must be under 8 MB");

    const buffer = Buffer.from(await file.arrayBuffer());
    const name = `${Date.now().toString(36)}-${crypto.randomBytes(5).toString("hex")}.${ext}`;
    const dir = path.join(process.cwd(), "public", "uploads");
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, name), buffer);

    return ok({ url: `/uploads/${name}` });
  } catch (e) {
    return handleApiError(e);
  }
}
