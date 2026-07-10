import "dotenv/config";

async function main() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  const appUrl = process.env.APP_URL;

  if (!token) throw new Error("TELEGRAM_BOT_TOKEN is not set");
  if (!secret) throw new Error("TELEGRAM_WEBHOOK_SECRET is not set");
  if (!appUrl) throw new Error("APP_URL is not set (e.g. https://your-app.vercel.app)");

  const webhookUrl = `${appUrl.replace(/\/$/, "")}/api/telegram/webhook`;

  console.log(`Registering Telegram webhook -> ${webhookUrl}`);

  const res = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      url: webhookUrl,
      secret_token: secret,
      allowed_updates: ["message", "callback_query"],
    }),
  });

  const data = await res.json();
  if (!data.ok) {
    console.error("Failed to set webhook:", data);
    process.exit(1);
  }

  console.log("Webhook registered successfully:", data.result ?? data.description);

  const infoRes = await fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`);
  const info = await infoRes.json();
  console.log("Current webhook info:", JSON.stringify(info.result, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
