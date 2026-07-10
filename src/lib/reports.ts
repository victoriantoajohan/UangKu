import { and, desc, eq, gte, lt, sql } from "drizzle-orm";
import { subMonths, startOfMonth, startOfWeek, endOfWeek } from "date-fns";
import { db } from "@/db";
import { categories, transactions } from "@/db/schema";
import { getWalletBalancesForUser } from "@/lib/wallet-balance";
import { monthKey } from "@/lib/utils";

export function monthRange(month: string): { from: Date; to: Date } {
  const [year, mon] = month.split("-").map(Number);
  return {
    from: new Date(Date.UTC(year, mon - 1, 1)),
    to: new Date(Date.UTC(year, mon, 1)),
  };
}

export async function getMonthlyTotals(userId: string, month: string) {
  const { from, to } = monthRange(month);
  const rows = await db.query.transactions.findMany({
    where: and(
      eq(transactions.userId, userId),
      gte(transactions.date, from),
      lt(transactions.date, to)
    ),
  });

  let income = 0;
  let expense = 0;
  for (const tx of rows) {
    if (tx.type === "income") income += Number(tx.amount);
    if (tx.type === "expense") expense += Number(tx.amount);
  }
  return { income, expense, net: income - expense };
}

export async function getWeeklyTotals(userId: string, reference: Date = new Date()) {
  const from = startOfWeek(reference, { weekStartsOn: 1 }); // Monday
  const to = endOfWeek(reference, { weekStartsOn: 1 });

  const rows = await db.query.transactions.findMany({
    where: and(eq(transactions.userId, userId), gte(transactions.date, from), lt(transactions.date, to)),
  });

  let income = 0;
  let expense = 0;
  for (const tx of rows) {
    if (tx.type === "income") income += Number(tx.amount);
    if (tx.type === "expense") expense += Number(tx.amount);
  }
  return { income, expense, net: income - expense, from, to };
}

export async function getTrend(userId: string, months = 6) {
  const now = new Date();
  const result: Array<{ month: string; income: number; expense: number }> = [];
  for (let i = months - 1; i >= 0; i--) {
    const month = monthKey(subMonths(startOfMonth(now), i));
    const totals = await getMonthlyTotals(userId, month);
    result.push({ month, income: totals.income, expense: totals.expense });
  }
  return result;
}

export async function getCategoryBreakdown(
  userId: string,
  month: string,
  type: "income" | "expense" = "expense"
) {
  const { from, to } = monthRange(month);
  const rows = await db
    .select({
      categoryId: transactions.categoryId,
      name: categories.name,
      color: categories.color,
      total: sql<string>`sum(${transactions.amount})`,
    })
    .from(transactions)
    .leftJoin(categories, eq(categories.id, transactions.categoryId))
    .where(
      and(
        eq(transactions.userId, userId),
        eq(transactions.type, type),
        gte(transactions.date, from),
        lt(transactions.date, to)
      )
    )
    .groupBy(transactions.categoryId, categories.name, categories.color)
    .orderBy(desc(sql`sum(${transactions.amount})`));

  return rows.map((r) => ({
    categoryId: r.categoryId,
    name: r.name ?? "Tanpa kategori",
    color: r.color ?? "#94a3b8",
    total: Number(r.total),
  }));
}

export async function getRecentTransactions(userId: string, limit = 5) {
  return db.query.transactions.findMany({
    where: eq(transactions.userId, userId),
    orderBy: [desc(transactions.date), desc(transactions.createdAt)],
    limit,
    with: { wallet: true, category: true },
  });
}

export async function getDashboardSummary(userId: string) {
  const month = monthKey();
  const [totals, trend, categoryBreakdown, recent, balances] = await Promise.all([
    getMonthlyTotals(userId, month),
    getTrend(userId, 6),
    getCategoryBreakdown(userId, month, "expense"),
    getRecentTransactions(userId, 5),
    getWalletBalancesForUser(userId),
  ]);

  const totalBalance = Object.values(balances).reduce((sum, b) => sum + b, 0);

  return {
    month,
    totalBalance,
    totals,
    trend,
    categoryBreakdown: categoryBreakdown.slice(0, 8),
    recentTransactions: recent.map((r) => ({ ...r, amount: Number(r.amount) })),
  };
}
