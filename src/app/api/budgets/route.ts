import { NextRequest, NextResponse } from "next/server";
import { and, eq, gte, lt } from "drizzle-orm";
import { db } from "@/db";
import { budgets, transactions } from "@/db/schema";
import { requireUserId, handleApiError, ApiError } from "@/lib/api-helpers";
import { createBudgetSchema, monthSchema } from "@/lib/validations/budget";
import { monthKey } from "@/lib/utils";

function monthRange(month: string) {
  const [year, mon] = month.split("-").map(Number);
  return {
    from: new Date(Date.UTC(year, mon - 1, 1)),
    to: new Date(Date.UTC(year, mon, 1)),
  };
}

export async function GET(req: NextRequest) {
  try {
    const userId = await requireUserId();
    const { searchParams } = new URL(req.url);
    const month = monthSchema.parse(searchParams.get("month") ?? monthKey());

    const rows = await db.query.budgets.findMany({
      where: and(eq(budgets.userId, userId), eq(budgets.month, month)),
      with: { category: true },
    });

    const { from, to } = monthRange(month);
    const data = await Promise.all(
      rows.map(async (b) => {
        const spentRows = await db.query.transactions.findMany({
          where: and(
            eq(transactions.userId, userId),
            eq(transactions.categoryId, b.categoryId),
            eq(transactions.type, "expense"),
            gte(transactions.date, from),
            lt(transactions.date, to)
          ),
        });
        const spent = spentRows.reduce((sum, t) => sum + Number(t.amount), 0);
        return {
          ...b,
          limitAmount: Number(b.limitAmount),
          spent,
          percentage: Number(b.limitAmount) > 0 ? spent / Number(b.limitAmount) : 0,
        };
      })
    );

    return NextResponse.json({ data });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await requireUserId();
    const body = createBudgetSchema.parse(await req.json());

    const existing = await db.query.budgets.findFirst({
      where: and(
        eq(budgets.userId, userId),
        eq(budgets.categoryId, body.categoryId),
        eq(budgets.month, body.month)
      ),
    });
    if (existing) {
      throw new ApiError(409, "Budget untuk kategori dan bulan ini sudah ada");
    }

    const [budget] = await db
      .insert(budgets)
      .values({
        userId,
        categoryId: body.categoryId,
        month: body.month,
        limitAmount: body.limitAmount.toString(),
      })
      .returning();

    return NextResponse.json({ data: budget }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
