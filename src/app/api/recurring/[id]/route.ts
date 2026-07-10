import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { recurringTransactions } from "@/db/schema";
import { requireUserId, handleApiError, ApiError } from "@/lib/api-helpers";
import { updateRecurringSchema } from "@/lib/validations/recurring";

async function findOwnedRecurring(userId: string, id: string) {
  const recurring = await db.query.recurringTransactions.findFirst({
    where: and(eq(recurringTransactions.id, id), eq(recurringTransactions.userId, userId)),
  });
  if (!recurring) throw new ApiError(404, "Recurring transaction not found");
  return recurring;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = await requireUserId();
    await findOwnedRecurring(userId, params.id);
    const body = updateRecurringSchema.parse(await req.json());

    const [updated] = await db
      .update(recurringTransactions)
      .set({
        ...(body.amount !== undefined && { amount: body.amount.toString() }),
        ...(body.note !== undefined && { note: body.note }),
        ...(body.active !== undefined && { active: body.active }),
        updatedAt: new Date(),
      })
      .where(eq(recurringTransactions.id, params.id))
      .returning();

    return NextResponse.json({ data: { ...updated, amount: Number(updated.amount) } });
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
    await findOwnedRecurring(userId, params.id);
    await db.delete(recurringTransactions).where(eq(recurringTransactions.id, params.id));
    return NextResponse.json({ data: { success: true } });
  } catch (error) {
    return handleApiError(error);
  }
}
