import { NextRequest, NextResponse } from "next/server";
import { subMonths } from "date-fns";
import { requireUserId, handleApiError } from "@/lib/api-helpers";
import { getCategoryBreakdown, getMonthlyTotals } from "@/lib/reports";
import { monthKey } from "@/lib/utils";
import { monthSchema } from "@/lib/validations/budget";

export async function GET(req: NextRequest) {
  try {
    const userId = await requireUserId();
    const { searchParams } = new URL(req.url);
    const month = monthSchema.parse(searchParams.get("month") ?? monthKey());
    const [year, mon] = month.split("-").map(Number);
    const previousMonth = monthKey(subMonths(new Date(Date.UTC(year, mon - 1, 1)), 1));

    const [current, previous, expenseByCategory, incomeByCategory] = await Promise.all([
      getMonthlyTotals(userId, month),
      getMonthlyTotals(userId, previousMonth),
      getCategoryBreakdown(userId, month, "expense"),
      getCategoryBreakdown(userId, month, "income"),
    ]);

    const change = (curr: number, prev: number) =>
      prev === 0 ? (curr === 0 ? 0 : 1) : (curr - prev) / prev;

    return NextResponse.json({
      data: {
        month,
        previousMonth,
        current,
        previous,
        incomeChange: change(current.income, previous.income),
        expenseChange: change(current.expense, previous.expense),
        expenseByCategory,
        incomeByCategory,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
