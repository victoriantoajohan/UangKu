const TELEGRAM_API = "https://api.telegram.org";

/**
 * Sends a message directly via the Telegram Bot HTTP API. Used by places
 * that need to notify a user (budget alerts, recap crons) without pulling
 * in the full grammY bot/webhook handling stack.
 */
export async function sendTelegramMessage(
  chatId: string,
  text: string,
  options?: { parseMode?: "Markdown" | "HTML" }
): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.warn("TELEGRAM_BOT_TOKEN not set, skipping Telegram notification");
    return;
  }

  const res = await fetch(`${TELEGRAM_API}/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: options?.parseMode ?? "Markdown",
    }),
  });

  if (!res.ok) {
    console.error("Failed to send Telegram message", await res.text());
  }
}
