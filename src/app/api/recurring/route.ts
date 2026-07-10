import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { recurringTransactions, wallets } from "@/db/schema";
import { requireUserId, handleApiError, ApiError } from "@/lib/api-helpers";
import { createRecurringSchema } from "@/lib/validations/recurring";
import { computeNextRunDate } from "@/lib/recurring";

export async function GET() {
  try {
    const userId = await requireUserId();
    const data = await db.query.recurringTransactions.findMany({
      where: eq(recurringTransactions.userId, userId),
      orderBy: (r, { asc }) => [asc(r.nextRunDate)],
      with: { wallet: true, category: true },
    });
    return NextResponse.json({
      data: data.map((r) => ({ ...r, amount: Number(r.amount) })),
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await requireUserId();
    const body = createRecurringSchema.parse(await req.json());

    const wallet = await db.query.wallets.findFirst({
      where: eq(wallets.id, body.walletId),
    });
    if (!wallet || wallet.userId !== userId) {
      throw new ApiError(404, "Wallet not found");
    }

    const nextRunDate = computeNextRunDate({
      from: body.startDate,
      frequency: body.frequency,
      dayOfMonth: body.dayOfMonth,
      dayOfWeek: body.dayOfWeek,
    });

    const [recurring] = await db
      .insert(recurringTransactions)
      .values({
        userId,
        walletId: body.walletId,
        categoryId: body.categoryId ?? null,
        type: body.type,
        amount: body.amount.toString(),
        note: body.note ?? null,
        frequency: body.frequency,
        dayOfMonth: body.dayOfMonth,
        dayOfWeek: body.dayOfWeek,
        nextRunDate,
      })
      .returning();

    return NextResponse.json({ data: { ...recurring, amount: Number(recurring.amount) } }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
