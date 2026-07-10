import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { wallets } from "@/db/schema";
import { requireUserId, handleApiError, ApiError } from "@/lib/api-helpers";
import { getWalletBalance } from "@/lib/wallet-balance";
import { projectSavingsGrowth } from "@/lib/savings-projection";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = await requireUserId();
    const wallet = await db.query.wallets.findFirst({
      where: and(eq(wallets.id, params.id), eq(wallets.userId, userId)),
    });
    if (!wallet) throw new ApiError(404, "Wallet not found");
    if (wallet.type !== "savings") {
      throw new ApiError(400, "Projection is only available for savings wallets");
    }

    const balance = await getWalletBalance(wallet.id);
    const points = projectSavingsGrowth({
      currentBalance: balance,
      monthlyDeposit: Number(wallet.savingsMonthlyDeposit ?? 0),
      annualInterestRatePercent: Number(wallet.savingsAnnualInterestRate ?? 0),
      years: 5,
    });

    return NextResponse.json({ data: { currentBalance: balance, points } });
  } catch (error) {
    return handleApiError(error);
  }
}
