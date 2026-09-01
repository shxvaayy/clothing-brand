import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { cache } from "react";
import { db } from "./db";
import type { AdminRole } from "@/generated/prisma/enums";

const secret = new TextEncoder().encode(
  process.env.AUTH_SECRET || "dev-secret"
);

const USER_COOKIE = "rn_session";
const ADMIN_COOKIE = "rn_admin";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export async function hashPassword(plain: string) {
  return bcrypt.hash(plain, 10);
}

export async function verifyPassword(plain: string, hash: string) {
  return bcrypt.compare(plain, hash);
}

async function sign(payload: Record<string, unknown>) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secret);
}

async function verify<T>(token: string): Promise<T | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload as T;
  } catch {
    return null;
  }
}

const cookieOpts = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: MAX_AGE,
};

// ---------- Customer sessions ----------

export async function createUserSession(userId: string) {
  const token = await sign({ uid: userId });
  (await cookies()).set(USER_COOKIE, token, cookieOpts);
}

export async function destroyUserSession() {
  (await cookies()).delete(USER_COOKIE);
}

export const getSessionUser = cache(async () => {
  const token = (await cookies()).get(USER_COOKIE)?.value;
  if (!token) return null;
  const payload = await verify<{ uid: string }>(token);
  if (!payload?.uid) return null;
  return db.user.findUnique({
    where: { id: payload.uid },
    select: { id: true, email: true, name: true, phone: true, createdAt: true },
  });
});

// ---------- Admin sessions ----------

export async function createAdminSession(adminId: string) {
  const token = await sign({ aid: adminId });
  (await cookies()).set(ADMIN_COOKIE, token, { ...cookieOpts, maxAge: 60 * 60 * 12 });
}

export async function destroyAdminSession() {
  (await cookies()).delete(ADMIN_COOKIE);
}

export const getSessionAdmin = cache(async () => {
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!token) return null;
  const payload = await verify<{ aid: string }>(token);
  if (!payload?.aid) return null;
  const admin = await db.adminUser.findUnique({
    where: { id: payload.aid },
    select: { id: true, email: true, name: true, role: true, active: true },
  });
  if (!admin || !admin.active) return null;
  return admin;
});

export async function requireAdmin(roles?: AdminRole[]) {
  const admin = await getSessionAdmin();
  if (!admin) throw new AuthError("UNAUTHORIZED");
  if (roles && roles.length > 0 && admin.role !== "SUPER_ADMIN" && !roles.includes(admin.role)) {
    throw new AuthError("FORBIDDEN");
  }
  return admin;
}

export class AuthError extends Error {
  constructor(public code: "UNAUTHORIZED" | "FORBIDDEN") {
    super(code);
  }
}
