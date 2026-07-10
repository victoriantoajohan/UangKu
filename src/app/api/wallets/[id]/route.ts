import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { wallets } from "@/db/schema";
import { requireUserId, handleApiError, ApiError } from "@/lib/api-helpers";
import { updateWalletSchema } from "@/lib/validations/wallet";
import { getWalletBalance } from "@/lib/wallet-balance";

async function findOwnedWallet(userId: string, walletId: string) {
  const wallet = await db.query.wallets.findFirst({
    where: and(eq(wallets.id, walletId), eq(wallets.userId, userId)),
  });
  if (!wallet) throw new ApiError(404, "Wallet not found");
  return wallet;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = await requireUserId();
    const wallet = await findOwnedWallet(userId, params.id);
    const balance = await getWalletBalance(wallet.id);
    return NextResponse.json({ data: { ...wallet, balance } });
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
    await findOwnedWallet(userId, params.id);
    const body = updateWalletSchema.parse(await req.json());

    const [updated] = await db
      .update(wallets)
      .set({
        ...(body.name !== undefined && { name: body.name }),
        ...(body.type !== undefined && { type: body.type }),
        ...(body.initialBalance !== undefined && {
          initialBalance: body.initialBalance.toString(),
        }),
        ...(body.currency !== undefined && { currency: body.currency }),
        ...(body.icon !== undefined && { icon: body.icon }),
        ...(body.color !== undefined && { color: body.color }),
        ...(body.savingsMonthlyDeposit !== undefined && {
          savingsMonthlyDeposit: body.savingsMonthlyDeposit.toString(),
        }),
        ...(body.savingsAnnualInterestRate !== undefined && {
          savingsAnnualInterestRate: body.savingsAnnualInterestRate.toString(),
        }),
        updatedAt: new Date(),
      })
      .where(eq(wallets.id, params.id))
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
    await findOwnedWallet(userId, params.id);
    await db.delete(wallets).where(eq(wallets.id, params.id));
    return NextResponse.json({ data: { success: true } });
  } catch (error) {
    return handleApiError(error);
  }
}
