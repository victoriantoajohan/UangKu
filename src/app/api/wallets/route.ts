import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { wallets } from "@/db/schema";
import { requireUserId, handleApiError } from "@/lib/api-helpers";
import { createWalletSchema } from "@/lib/validations/wallet";
import { getWalletBalancesForUser } from "@/lib/wallet-balance";

export async function GET() {
  try {
    const userId = await requireUserId();
    const userWallets = await db.query.wallets.findMany({
      where: eq(wallets.userId, userId),
      orderBy: (w, { asc }) => [asc(w.createdAt)],
    });
    const balances = await getWalletBalancesForUser(userId);

    const data = userWallets.map((w) => ({
      ...w,
      initialBalance: Number(w.initialBalance),
      savingsMonthlyDeposit: w.savingsMonthlyDeposit ? Number(w.savingsMonthlyDeposit) : null,
      savingsAnnualInterestRate: w.savingsAnnualInterestRate
        ? Number(w.savingsAnnualInterestRate)
        : null,
      balance: balances[w.id] ?? Number(w.initialBalance),
    }));

    return NextResponse.json({ data });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await requireUserId();
    const body = createWalletSchema.parse(await req.json());

    const [wallet] = await db
      .insert(wallets)
      .values({
        userId,
        name: body.name,
        type: body.type,
        initialBalance: body.initialBalance.toString(),
        currency: body.currency,
        icon: body.icon,
        color: body.color,
        savingsMonthlyDeposit: body.savingsMonthlyDeposit?.toString(),
        savingsAnnualInterestRate: body.savingsAnnualInterestRate?.toString(),
      })
      .returning();

    return NextResponse.json({ data: wallet }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
