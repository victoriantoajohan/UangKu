import { eq } from "drizzle-orm";
import { db } from "@/db";
import { transactions } from "@/db/schema";
import { checkBudgetThreshold } from "@/lib/budget-notify";
import { monthKey } from "@/lib/utils";

export async function saveTelegramTransaction(params: {
  userId: string;
  walletId: string;
  categoryId: string | null;
  type: "income" | "expense";
  amount: number;
  date?: Date;
  note?: string | null;
  source: "telegram_text" | "telegram_receipt";
  receiptUrl?: string | null;
}) {
  const date = params.date ?? new Date();
  const [tx] = await db
    .insert(transactions)
    .values({
      userId: params.userId,
      walletId: params.walletId,
      categoryId: params.categoryId,
      type: params.type,
      amount: params.amount.toString(),
      date,
      note: params.note ?? null,
      source: params.source,
      receiptUrl: params.receiptUrl ?? null,
    })
    .returning();

  if (params.type === "expense" && params.categoryId) {
    await checkBudgetThreshold(params.userId, params.categoryId, monthKey(date));
  }

  return tx;
}

export async function getMostRecentlyUsedWalletId(userId: string): Promise<string | null> {
  const last = await db.query.transactions.findFirst({
    where: eq(transactions.userId, userId),
    orderBy: (t, { desc }) => [desc(t.createdAt)],
  });
  return last?.walletId ?? null;
}
