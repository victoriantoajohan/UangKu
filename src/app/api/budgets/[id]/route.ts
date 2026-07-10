import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { budgets } from "@/db/schema";
import { requireUserId, handleApiError, ApiError } from "@/lib/api-helpers";
import { updateBudgetSchema } from "@/lib/validations/budget";

async function findOwnedBudget(userId: string, id: string) {
  const budget = await db.query.budgets.findFirst({
    where: and(eq(budgets.id, id), eq(budgets.userId, userId)),
  });
  if (!budget) throw new ApiError(404, "Budget not found");
  return budget;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = await requireUserId();
    await findOwnedBudget(userId, params.id);
    const body = updateBudgetSchema.parse(await req.json());
    const [updated] = await db
      .update(budgets)
      .set({
        limitAmount: body.limitAmount.toString(),
        notified80: false,
        notified100: false,
        updatedAt: new Date(),
      })
      .where(eq(budgets.id, params.id))
      .returning();
    return NextResponse.json({ data: updated });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = await requireUserId();
    await findOwnedBudget(userId, params.id);
    await db.delete(budgets).where(eq(budgets.id, params.id));
    return NextResponse.json({ data: { success: true } });
  } catch (error) {
    return handleApiError(error);
  }
}
