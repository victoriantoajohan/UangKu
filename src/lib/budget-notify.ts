import { and, eq, gte, lt, sql } from "drizzle-orm";
import { db } from "@/db";
import { budgets, categories, telegramLinks, transactions } from "@/db/schema";
import { formatIDR } from "@/lib/utils";
import { sendTelegramMessage } from "@/lib/telegram/send";

function monthRange(month: string): { from: Date; to: Date } {
  const [year, mon] = month.split("-").map(Number);
  const from = new Date(Date.UTC(year, mon - 1, 1));
  const to = new Date(Date.UTC(year, mon, 1));
  return { from, to };
}

/**
 * Recomputes spend-vs-limit for a user's budget on `categoryId`/`month` and,
 * if a threshold (80% or 100%) was just crossed, notifies the user via
 * Telegram (if linked). Call this after any expense transaction is created,
 * updated, or deleted for that category/month.
 */
export async function checkBudgetThreshold(
  userId: string,
  categoryId: string,
  month: string
): Promise<void> {
  const budget = await db.query.budgets.findFirst({
    where: and(
      eq(budgets.userId, userId),
      eq(budgets.categoryId, categoryId),
      eq(budgets.month, month)
    ),
  });
  if (!budget) return;

  const { from, to } = monthRange(month);
  const [{ total }] = await db
    .select({ total: sql<string>`coalesce(sum(${transactions.amount}), 0)` })
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, userId),
        eq(transactions.categoryId, categoryId),
        eq(transactions.type, "expense"),
        gte(transactions.date, from),
        lt(transactions.date, to)
      )
    );

  const spent = Number(total);
  const limit = Number(budget.limitAmount);
  const ratio = limit > 0 ? spent / limit : 0;

  let shouldNotify100 = false;
  let shouldNotify80 = false;

  if (ratio >= 1 && !budget.notified100) shouldNotify100 = true;
  else if (ratio >= 0.8 && !budget.notified80) shouldNotify80 = true;

  if (!shouldNotify100 && !shouldNotify80) return;

  await db
    .update(budgets)
    .set({
      notified80: budget.notified80 || ratio >= 0.8,
      notified100: budget.notified100 || ratio >= 1,
      updatedAt: new Date(),
    })
    .where(eq(budgets.id, budget.id));

  const link = await db.query.telegramLinks.findFirst({
    where: eq(telegramLinks.userId, userId),
  });
  if (!link) return;

  const category = await db.query.categories.findFirst({
    where: eq(categories.id, categoryId),
  });
  const categoryName = category?.name ?? "kategori ini";

  const message = shouldNotify100
    ? `🚨 *Budget Terlampaui!*\nPengeluaran untuk *${categoryName}* bulan ini sudah ${formatIDR(spent)} dari batas ${formatIDR(limit)} (${Math.round(ratio * 100)}%).`
    : `⚠️ *Peringatan Budget*\nPengeluaran untuk *${categoryName}* bulan ini sudah mencapai ${Math.round(ratio * 100)}% dari batas (${formatIDR(spent)} / ${formatIDR(limit)}).`;

  await sendTelegramMessage(link.chatId, message);
}
