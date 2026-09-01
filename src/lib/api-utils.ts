import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AuthError } from "./auth";
import { OrderError } from "./orders";

export function ok(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export function badRequest(error: string) {
  return NextResponse.json({ error }, { status: 400 });
}

export function unauthorized() {
  return NextResponse.json({ error: "Please log in to continue" }, { status: 401 });
}

export function forbidden() {
  return NextResponse.json({ error: "You don't have permission for this" }, { status: 403 });
}

export function handleApiError(e: unknown) {
  if (e instanceof ZodError) {
    const first = e.issues[0];
    return badRequest(first?.message ?? "Invalid input");
  }
  if (e instanceof AuthError) {
    return e.code === "UNAUTHORIZED" ? unauthorized() : forbidden();
  }
  if (e instanceof OrderError) {
    return badRequest(e.message);
  }
  console.error("API error:", e);
  return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
}

// Simple in-memory rate limiter (per-process). Good enough for a single
// Render instance; swap for Redis if the store scales horizontally.
const buckets = new Map<string, { count: number; reset: number }>();

export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.reset < now) {
    buckets.set(key, { count: 1, reset: now + windowMs });
    return true;
  }
  bucket.count += 1;
  return bucket.count <= limit;
}

export function clientIp(req: Request) {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "local"
  );
}
