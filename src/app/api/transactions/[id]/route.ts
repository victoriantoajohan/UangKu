import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { transactions } from "@/db/schema";
import { requireUserId, handleApiError, ApiError } from "@/lib/api-helpers";
import { updateTransactionSchema } from "@/lib/validations/transaction";
import { checkBudgetThreshold } from "@/lib/budget-notify";
import { monthKey } from "@/lib/utils";

async function findOwnedTransaction(userId: string, id: string) {
  const tx = await db.query.transactions.findFirst({
    where: and(eq(transactions.id, id), eq(transactions.userId, userId)),
  });
  if (!tx) throw new ApiError(404, "Transaction not found");
  return tx;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = await requireUserId();
    const tx = await findOwnedTransaction(userId, params.id);
    return NextResponse.json({ data: { ...tx, amount: Number(tx.amount) } });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = await requireUserId();
    const existing = await findOwnedTransaction(userId, params.id);
    const body = updateTransactionSchema.parse(await req.json());

    if (existing.type === "transfer") {
      throw new ApiError(400, "Gunakan endpoint transfer untuk mengubah transaksi transfer");
    }

    const [updated] = await db
      .update(transactions)
      .set({
        ...(body.type !== undefined && { type: body.type }),
        ...(body.walletId !== undefined && { walletId: body.walletId }),
        ...(body.categoryId !== undefined && { categoryId: body.categoryId }),
        ...(body.amount !== undefined && { amount: body.amount.toString() }),
        ...(body.date !== undefined && { date: body.date }),
        ...(body.note !== undefined && { note: body.note }),
        updatedAt: new Date(),
      })
      .where(eq(transactions.id, params.id))
      .returning();

    const categoryId = updated.categoryId;
    if (updated.type === "expense" && categoryId) {
      await checkBudgetThreshold(userId, categoryId, monthKey(updated.date));
    }

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
    const existing = await findOwnedTransaction(userId, params.id);

    if (existing.type === "transfer" && existing.transferPairId) {
      await db
        .delete(transactions)
        .where(
          and(
            eq(transactions.userId, userId),
            eq(transactions.id, existing.transferPairId)
          )
        );
    }
    await db.delete(transactions).where(eq(transactions.id, params.id));

    return NextResponse.json({ data: { success: true } });
  } catch (error) {
    return handleApiError(error);
  }
}
