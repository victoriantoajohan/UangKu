import { addDays, addMonths, addWeeks, setDate } from "date-fns";
import { and, eq, lte } from "drizzle-orm";
import { db } from "@/db";
import { recurringTransactions, transactions } from "@/db/schema";
import { checkBudgetThreshold } from "@/lib/budget-notify";
import { monthKey } from "@/lib/utils";

export function computeNextRunDate({
  from,
  frequency,
  dayOfMonth,
  dayOfWeek,
}: {
  from: Date;
  frequency: "daily" | "weekly" | "monthly";
  dayOfMonth?: number;
  dayOfWeek?: number;
}): Date {
  if (frequency === "daily") return addDays(from, 1);

  if (frequency === "weekly") {
    let next = addWeeks(from, 1);
    if (dayOfWeek !== undefined) {
      const diff = (dayOfWeek - next.getDay() + 7) % 7;
      next = addDays(next, diff);
    }
    return next;
  }

  // monthly
  let next = addMonths(from, 1);
  if (dayOfMonth !== undefined) {
    next = setDate(next, dayOfMonth);
  }
  return next;
}

/**
 * Executes every recurring transaction whose nextRunDate has arrived,
 * inserts the corresponding transaction, advances nextRunDate, and runs
 * budget-threshold notifications. Intended to be called from the daily
 * Vercel Cron job.
 */
export async function runDueRecurringTransactions(now: Date = new Date()): Promise<{
  processed: number;
}> {
  const due = await db.query.recurringTransactions.findMany({
    where: and(
      eq(recurringTransactions.active, true),
      lte(recurringTransactions.nextRunDate, now)
    ),
  });

  let processed = 0;
  for (const recurring of due) {
    await db.insert(transactions).values({
      userId: recurring.userId,
      walletId: recurring.walletId,
      categoryId: recurring.categoryId,
      type: recurring.type,
      amount: recurring.amount,
      date: now,
      note: recurring.note ?? `Recurring: ${recurring.frequency}`,
      source: "web",
      recurringTransactionId: recurring.id,
    });

    if (recurring.type === "expense" && recurring.categoryId) {
      await checkBudgetThreshold(recurring.userId, recurring.categoryId, monthKey(now));
    }

    const nextRunDate = computeNextRunDate({
      from: recurring.nextRunDate,
      frequency: recurring.frequency,
      dayOfMonth: recurring.dayOfMonth ?? undefined,
      dayOfWeek: recurring.dayOfWeek ?? undefined,
    });

    await db
      .update(recurringTransactions)
      .set({ nextRunDate, updatedAt: new Date() })
      .where(eq(recurringTransactions.id, recurring.id));

    processed++;
  }

  return { processed };
}
