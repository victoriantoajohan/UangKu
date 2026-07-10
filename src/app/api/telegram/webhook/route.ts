import { webhookCallback } from "grammy";
import { getBot } from "@/lib/telegram/bot";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request) {
  const secretToken = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!secretToken) {
    return new Response("TELEGRAM_WEBHOOK_SECRET is not configured", { status: 500 });
  }

  const handler = webhookCallback(getBot(), "std/http", { secretToken });
  return handler(req);
}
