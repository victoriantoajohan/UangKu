import { Bot, InlineKeyboard } from "grammy";
import { and, desc, eq, isNull, or } from "drizzle-orm";
import { put } from "@vercel/blob";
import { db } from "@/db";
import { categories, telegramLinkCodes, telegramLinks, transactions, wallets } from "@/db/schema";
import { parseTransactionText } from "@/lib/ai-parser/text-parser";
import { parseReceiptImage } from "@/lib/ai-parser/receipt-parser";
import { matchByName } from "@/lib/telegram/match";
import { formatRupiah } from "@/lib/telegram/format";
import { formatDateID } from "@/lib/utils";
import { getDashboardSummary } from "@/lib/reports";
import { getWalletBalancesForUser } from "@/lib/wallet-balance";
import {
  createPendingAction,
  deletePendingAction,
  getLatestPendingActionForChat,
  getPendingAction,
  updatePendingActionPayload,
  type TextConfirmPayload,
  type ReceiptConfirmPayload,
} from "@/lib/telegram/pending";
import { getMostRecentlyUsedWalletId, saveTelegramTransaction } from "@/lib/telegram/save-transaction";

let botInstance: Bot | null = null;

export function getBot(): Bot {
  if (botInstance) return botInstance;

  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN is not set");

  const bot = new Bot(token);

  bot.command("start", handleStart);
  bot.command("link", handleLink);
  bot.command("saldo", handleSaldo);
  bot.command("laporan", handleLaporan);
  bot.command("undo", handleUndo);
  bot.on("message:photo", handlePhoto);
  bot.on("message:text", handleText);
  bot.on("callback_query:data", handleCallback);

  botInstance = bot;
  return bot;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function getLinkedUserId(chatId: string): Promise<string | null> {
  const link = await db.query.telegramLinks.findFirst({
    where: eq(telegramLinks.chatId, chatId),
  });
  return link?.userId ?? null;
}

async function requireLinkedUser(ctx: any): Promise<string | null> {
  const chatId = String(ctx.chat.id);
  const userId = await getLinkedUserId(chatId);
  if (!userId) {
    await ctx.reply(
      "Akun Telegram kamu belum terhubung ke UangKu.\n\n" +
        "1. Buka dashboard web UangKu → Pengaturan → Hubungkan Telegram\n" +
        "2. Salin kode OTP yang muncul\n" +
        "3. Kirim ke sini: /link 123456"
    );
    return null;
  }
  return userId;
}

async function getUserWallets(userId: string) {
  return db.query.wallets.findMany({ where: eq(wallets.userId, userId) });
}

async function getUserCategories(userId: string, kind: "income" | "expense") {
  return db.query.categories.findMany({
    where: and(or(isNull(categories.userId), eq(categories.userId, userId)), eq(categories.kind, kind)),
  });
}

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------

async function handleStart(ctx: any) {
  await ctx.reply(
    "👋 Selamat datang di *UangKu*!\n\n" +
      "Catat transaksi cukup dengan ketik pesan biasa, contoh:\n" +
      '  "makan siang 25rb pakai GoPay"\n' +
      '  "keluar 25000 makan gopay"\n' +
      '  "gaji bulan ini 5jt masuk BCA"\n\n' +
      "📸 Atau kirim foto struk belanja, aku akan baca otomatis.\n\n" +
      "*Perintah lain:*\n" +
      "/link <kode> — hubungkan akun Telegram ke akun web\n" +
      "/saldo — ringkasan saldo semua dompet\n" +
      "/laporan — ringkasan bulan berjalan\n" +
      "/undo — batalkan transaksi terakhir",
    { parse_mode: "Markdown" }
  );
}

async function handleLink(ctx: any) {
  const code = ctx.match?.toString().trim();
  if (!code) {
    await ctx.reply("Format: /link 123456\n\nDapatkan kode dari dashboard web → Pengaturan → Hubungkan Telegram.");
    return;
  }

  const linkCode = await db.query.telegramLinkCodes.findFirst({
    where: eq(telegramLinkCodes.code, code),
  });

  if (!linkCode || linkCode.usedAt || linkCode.expiresAt < new Date()) {
    await ctx.reply("❌ Kode tidak valid atau sudah kedaluwarsa. Generate kode baru dari dashboard web.");
    return;
  }

  const chatId = String(ctx.chat.id);
  const username = ctx.from?.username ?? null;

  await db.delete(telegramLinks).where(or(eq(telegramLinks.userId, linkCode.userId), eq(telegramLinks.chatId, chatId)));
  await db.insert(telegramLinks).values({ userId: linkCode.userId, chatId, username });
  await db.update(telegramLinkCodes).set({ usedAt: new Date() }).where(eq(telegramLinkCodes.id, linkCode.id));

  await ctx.reply("✅ Berhasil! Akun Telegram kamu sudah terhubung ke UangKu.");
}

async function handleSaldo(ctx: any) {
  const userId = await requireLinkedUser(ctx);
  if (!userId) return;

  const userWallets = await getUserWallets(userId);
  const balances = await getWalletBalancesForUser(userId);

  if (userWallets.length === 0) {
    await ctx.reply("Kamu belum punya dompet. Buat dompet dulu di dashboard web.");
    return;
  }

  const lines = userWallets.map((w) => `• ${w.name}: ${formatRupiah(balances[w.id] ?? 0)}`);
  const total = Object.values(balances).reduce((s, b) => s + b, 0);

  await ctx.reply(`💰 *Saldo Kamu*\n\n${lines.join("\n")}\n\n*Total: ${formatRupiah(total)}*`, {
    parse_mode: "Markdown",
  });
}

async function handleLaporan(ctx: any) {
  const userId = await requireLinkedUser(ctx);
  if (!userId) return;

  const summary = await getDashboardSummary(userId);
  const topCategories = summary.categoryBreakdown.slice(0, 5);

  const lines = [
    `📊 *Laporan Bulan Ini*`,
    ``,
    `Pemasukan: ${formatRupiah(summary.totals.income)}`,
    `Pengeluaran: ${formatRupiah(summary.totals.expense)}`,
    `Selisih: ${formatRupiah(summary.totals.net)}`,
  ];

  if (topCategories.length > 0) {
    lines.push("", "*Top 5 Kategori Pengeluaran:*");
    topCategories.forEach((c, i) => {
      lines.push(`${i + 1}. ${c.name}: ${formatRupiah(c.total)}`);
    });
  }

  await ctx.reply(lines.join("\n"), { parse_mode: "Markdown" });
}

async function handleUndo(ctx: any) {
  const userId = await requireLinkedUser(ctx);
  if (!userId) return;

  const last = await db.query.transactions.findFirst({
    where: eq(transactions.userId, userId),
    orderBy: [desc(transactions.createdAt)],
    with: { wallet: true, category: true },
  });

  if (!last) {
    await ctx.reply("Tidak ada transaksi untuk dibatalkan.");
    return;
  }

  if (last.type === "transfer" && last.transferPairId) {
    await db.delete(transactions).where(eq(transactions.id, last.transferPairId));
  }
  await db.delete(transactions).where(eq(transactions.id, last.id));

  const label = last.type === "expense" ? "Pengeluaran" : last.type === "income" ? "Pemasukan" : "Transfer";
  await ctx.reply(
    `↩️ Dibatalkan: ${label} ${formatRupiah(Number(last.amount))}` +
      (last.wallet ? ` (${last.wallet.name})` : "") +
      (last.category ? ` — ${last.category.name}` : "")
  );
}

// ---------------------------------------------------------------------------
// Free text: natural-language transaction parsing
// ---------------------------------------------------------------------------

async function handleText(ctx: any) {
  const text: string = ctx.message.text ?? "";
  if (text.startsWith("/")) return; // unrecognized command, ignore

  const userId = await requireLinkedUser(ctx);
  if (!userId) return;

  const chatId = String(ctx.chat.id);

  // If there's a pending receipt/text confirmation awaiting a manual amount edit
  const pending = await getLatestPendingActionForChat(chatId);
  if (pending?.kind === "receipt_confirm") {
    const payload = pending.payload as ReceiptConfirmPayload;
    const amount = Number(text.replace(/[^\d]/g, ""));
    if (amount > 0) {
      payload.total = amount;
      await updatePendingActionPayload(pending.id, payload);
      await replyReceiptConfirm(ctx, pending.id, payload);
      return;
    }
  }

  const userWallets = await getUserWallets(userId);
  const parsed = await parseTransactionText(text, {
    walletNames: userWallets.map((w) => w.name),
    categoryNames: [],
  });

  if (!parsed) {
    await ctx.reply(
      'Maaf, aku tidak paham. Coba format seperti "makan siang 25rb pakai GoPay" atau "keluar 25000 makan gopay".'
    );
    return;
  }

  const userCategories = await getUserCategories(userId, parsed.type);
  const walletMatch = matchByName(parsed.wallet, userWallets);
  const categoryMatch = matchByName(parsed.category, userCategories);

  const needs: Array<"wallet" | "category"> = [];
  if (!walletMatch.match) needs.push("wallet");
  if (!categoryMatch.match) needs.push("category");

  if (needs.length === 0) {
    await saveTelegramTransaction({
      userId,
      walletId: walletMatch.match!.id,
      categoryId: categoryMatch.match?.id ?? null,
      type: parsed.type,
      amount: parsed.amount,
      note: parsed.note,
      source: "telegram_text",
    });
    await replySavedTransaction(ctx, {
      type: parsed.type,
      amount: parsed.amount,
      walletName: walletMatch.match!.name,
      categoryName: categoryMatch.match?.name ?? null,
    });
    return;
  }

  const payload: TextConfirmPayload = {
    parsed,
    walletId: walletMatch.match?.id ?? null,
    categoryId: categoryMatch.match?.id ?? null,
    walletCandidates: (walletMatch.candidates.length ? walletMatch.candidates : userWallets).map((w) => ({
      id: w.id,
      name: w.name,
    })),
    categoryCandidates: (categoryMatch.candidates.length ? categoryMatch.candidates : userCategories).map((c) => ({
      id: c.id,
      name: c.name,
    })),
    needs,
  };

  const action = await createPendingAction({ chatId, userId, kind: "text_confirm", payload });
  await askNextQuestion(ctx, action.id, payload);
}

async function askNextQuestion(ctx: any, pendingId: string, payload: TextConfirmPayload) {
  const next = payload.needs[0];
  if (next === "wallet") {
    const kb = new InlineKeyboard();
    payload.walletCandidates.forEach((w, i) => {
      kb.text(w.name, `w:${pendingId}:${i}`).row();
    });
    await ctx.reply(`Dompet mana yang kamu maksud untuk transaksi ${formatRupiah(payload.parsed.amount)} ini?`, {
      reply_markup: kb,
    });
  } else if (next === "category") {
    const kb = new InlineKeyboard();
    payload.categoryCandidates.forEach((c, i) => {
      kb.text(c.name, `c:${pendingId}:${i}`).row();
    });
    await ctx.reply("Kategori mana yang paling sesuai?", { reply_markup: kb });
  }
}

async function replySavedTransaction(
  ctx: any,
  info: { type: "income" | "expense"; amount: number; walletName: string; categoryName: string | null }
) {
  const icon = info.type === "income" ? "💰" : "💸";
  await ctx.reply(
    `${icon} Tersimpan: ${formatRupiah(info.amount)}\n` +
      `Dompet: ${info.walletName}` +
      (info.categoryName ? `\nKategori: ${info.categoryName}` : "") +
      `\n\nSalah? Ketik /undo untuk membatalkan.`
  );
}

// ---------------------------------------------------------------------------
// Receipt photo: OCR via Claude vision
// ---------------------------------------------------------------------------

async function handlePhoto(ctx: any) {
  const userId = await requireLinkedUser(ctx);
  if (!userId) return;

  await ctx.reply("📸 Membaca struk...");

  const photos = ctx.message.photo;
  const largest = photos[photos.length - 1];
  const file = await ctx.api.getFile(largest.file_id);
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const fileUrl = `https://api.telegram.org/file/bot${token}/${file.file_path}`;

  const fileRes = await fetch(fileUrl);
  const arrayBuffer = await fileRes.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  let receiptUrl: string | null = null;
  try {
    const blob = await put(`receipts/${userId}/${Date.now()}.jpg`, buffer, {
      access: "public",
      contentType: "image/jpeg",
    });
    receiptUrl = blob.url;
  } catch (error) {
    console.error("Failed to upload receipt to Vercel Blob", error);
  }

  const parsed = await parseReceiptImage(buffer.toString("base64"), "image/jpeg");
  if (!parsed) {
    await ctx.reply(
      "Maaf, aku gagal membaca struk ini. Silakan catat manual, contoh: \"belanja 50rb pakai Cash\"."
    );
    return;
  }

  const expenseCategories = await getUserCategories(userId, "expense");
  const categoryMatch = matchByName(parsed.categoryGuess, expenseCategories);
  const fallbackCategory = expenseCategories.find((c) => c.name === "Lainnya");
  const categoryId = categoryMatch.match?.id ?? fallbackCategory?.id ?? null;

  const userWallets = await getUserWallets(userId);
  const recentWalletId = await getMostRecentlyUsedWalletId(userId);
  const defaultWallet =
    userWallets.find((w) => w.id === recentWalletId) ?? userWallets[0];

  if (!defaultWallet) {
    await ctx.reply("Kamu belum punya dompet. Buat dompet dulu di dashboard web sebelum mencatat struk.");
    return;
  }

  const chatId = String(ctx.chat.id);
  const payload: ReceiptConfirmPayload = {
    merchant: parsed.merchant,
    date: parsed.date,
    total: parsed.total,
    categoryGuess: parsed.categoryGuess,
    categoryId,
    walletId: defaultWallet.id,
    walletName: defaultWallet.name,
    walletCandidates: userWallets.map((w) => ({ id: w.id, name: w.name })),
    receiptUrl: receiptUrl ?? "",
  };

  const action = await createPendingAction({ chatId, userId, kind: "receipt_confirm", payload });
  await replyReceiptConfirm(ctx, action.id, payload);
}

async function replyReceiptConfirm(ctx: any, pendingId: string, payload: ReceiptConfirmPayload) {
  const kb = new InlineKeyboard()
    .text("✅ Simpan", `rs:${pendingId}`)
    .text("✏️ Edit", `re:${pendingId}`)
    .text("❌ Batal", `rc:${pendingId}`);

  const lines = [
    "🧾 *Hasil baca struk:*",
    payload.merchant ? `Toko: ${payload.merchant}` : null,
    payload.date ? `Tanggal: ${formatDateID(payload.date)}` : null,
    `Total: ${formatRupiah(payload.total)}`,
    `Kategori: ${payload.categoryGuess ?? "Lainnya"}`,
    `Dompet: ${payload.walletName}`,
  ].filter(Boolean);

  await ctx.reply(lines.join("\n"), { parse_mode: "Markdown", reply_markup: kb });
}

// ---------------------------------------------------------------------------
// Callback queries (inline keyboard button taps)
// ---------------------------------------------------------------------------

async function handleCallback(ctx: any) {
  const data: string = ctx.callbackQuery.data;
  const [prefix, id, arg] = data.split(":");

  if (prefix === "w" || prefix === "c") {
    await handleTextDisambiguation(ctx, prefix, id, Number(arg));
  } else if (prefix === "rs") {
    await handleReceiptSave(ctx, id);
  } else if (prefix === "re") {
    await handleReceiptEdit(ctx, id);
  } else if (prefix === "rw") {
    await handleReceiptWalletChosen(ctx, id, Number(arg));
  } else if (prefix === "rc") {
    await deletePendingAction(id);
    await ctx.editMessageText("❌ Dibatalkan.");
  }

  await ctx.answerCallbackQuery();
}

async function handleTextDisambiguation(ctx: any, kind: "w" | "c", pendingId: string, index: number) {
  const action = await getPendingAction(pendingId);
  if (!action || action.kind !== "text_confirm") {
    await ctx.editMessageText("Sesi kedaluwarsa. Silakan kirim ulang transaksinya.");
    return;
  }

  const payload = action.payload as TextConfirmPayload;
  if (kind === "w") {
    payload.walletId = payload.walletCandidates[index]?.id ?? null;
    payload.needs = payload.needs.filter((n) => n !== "wallet");
  } else {
    payload.categoryId = payload.categoryCandidates[index]?.id ?? null;
    payload.needs = payload.needs.filter((n) => n !== "category");
  }

  if (payload.needs.length > 0) {
    await updatePendingActionPayload(pendingId, payload);
    await askNextQuestion(ctx, pendingId, payload);
    return;
  }

  const wallet = await db.query.wallets.findFirst({ where: eq(wallets.id, payload.walletId!) });
  const category = payload.categoryId
    ? await db.query.categories.findFirst({ where: eq(categories.id, payload.categoryId) })
    : null;

  const tx = await saveTelegramTransaction({
    userId: action.userId,
    walletId: payload.walletId!,
    categoryId: payload.categoryId,
    type: payload.parsed.type,
    amount: payload.parsed.amount,
    note: payload.parsed.note,
    source: "telegram_text",
  });

  await deletePendingAction(pendingId);

  const icon = payload.parsed.type === "income" ? "💰" : "💸";
  await ctx.editMessageText(
    `${icon} Tersimpan: ${formatRupiah(payload.parsed.amount)}\n` +
      `Dompet: ${wallet?.name ?? "-"}` +
      (category ? `\nKategori: ${category.name}` : "") +
      `\n\nSalah? Ketik /undo, tx: ${tx.id.slice(0, 8)}`
  );
}

async function handleReceiptSave(ctx: any, pendingId: string) {
  const action = await getPendingAction(pendingId);
  if (!action || action.kind !== "receipt_confirm") {
    await ctx.editMessageText("Sesi kedaluwarsa. Silakan kirim ulang foto strukmu.");
    return;
  }
  const payload = action.payload as ReceiptConfirmPayload;

  await saveTelegramTransaction({
    userId: action.userId,
    walletId: payload.walletId,
    categoryId: payload.categoryId,
    type: "expense",
    amount: payload.total,
    date: payload.date ? new Date(payload.date) : new Date(),
    note: payload.merchant ?? "Struk belanja",
    source: "telegram_receipt",
    receiptUrl: payload.receiptUrl || null,
  });

  await deletePendingAction(pendingId);
  await ctx.editMessageText(`✅ Tersimpan: ${formatRupiah(payload.total)} (${payload.merchant ?? "Struk"})`);
}

async function handleReceiptEdit(ctx: any, pendingId: string) {
  const action = await getPendingAction(pendingId);
  if (!action || action.kind !== "receipt_confirm") {
    await ctx.editMessageText("Sesi kedaluwarsa. Silakan kirim ulang foto strukmu.");
    return;
  }
  const payload = action.payload as ReceiptConfirmPayload;

  const kb = new InlineKeyboard();
  payload.walletCandidates.forEach((w, i) => kb.text(w.name, `rw:${pendingId}:${i}`).row());

  await ctx.editMessageText(
    `Pilih dompet yang benar (saat ini: ${payload.walletName}).\n` +
      `Untuk mengubah jumlah, balas pesan ini dengan angka yang benar.`,
    { reply_markup: kb }
  );
}

async function handleReceiptWalletChosen(ctx: any, pendingId: string, index: number) {
  const action = await getPendingAction(pendingId);
  if (!action || action.kind !== "receipt_confirm") {
    await ctx.editMessageText("Sesi kedaluwarsa. Silakan kirim ulang foto strukmu.");
    return;
  }
  const payload = action.payload as ReceiptConfirmPayload;
  const chosen = payload.walletCandidates[index];
  if (chosen) {
    payload.walletId = chosen.id;
    payload.walletName = chosen.name;
    await updatePendingActionPayload(pendingId, payload);
  }
  await replyReceiptConfirmEdit(ctx, pendingId, payload);
}

async function replyReceiptConfirmEdit(ctx: any, pendingId: string, payload: ReceiptConfirmPayload) {
  const kb = new InlineKeyboard()
    .text("✅ Simpan", `rs:${pendingId}`)
    .text("✏️ Edit", `re:${pendingId}`)
    .text("❌ Batal", `rc:${pendingId}`);

  const lines = [
    "🧾 *Hasil baca struk:*",
    payload.merchant ? `Toko: ${payload.merchant}` : null,
    payload.date ? `Tanggal: ${formatDateID(payload.date)}` : null,
    `Total: ${formatRupiah(payload.total)}`,
    `Kategori: ${payload.categoryGuess ?? "Lainnya"}`,
    `Dompet: ${payload.walletName}`,
  ].filter(Boolean);

  await ctx.editMessageText(lines.join("\n"), { parse_mode: "Markdown", reply_markup: kb });
}

