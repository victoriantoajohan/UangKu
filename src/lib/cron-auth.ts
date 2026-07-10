import { NextRequest } from "next/server";
import { ApiError } from "@/lib/api-helpers";

/** Verifies the request came from Vercel Cron (or a manual call with the shared secret). */
export function requireCronSecret(req: NextRequest): void {
  const secret = process.env.CRON_SECRET;
  if (!secret) return; // no secret configured (e.g. local dev) — allow through
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    throw new ApiError(401, "Unauthorized cron request");
  }
}
