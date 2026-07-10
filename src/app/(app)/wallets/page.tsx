import { getServerSession } from "next-auth";
import { eq } from "drizzle-orm";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { wallets } from "@/db/schema";
import { getWalletBalancesForUser } from "@/lib/wallet-balance";
import { WalletsClient } from "@/components/wallets/wallets-client";

export default async function WalletsPage() {
  const session = await getServerSession(authOptions);
  const userId = session!.user.id;

  const [userWallets, balances] = await Promise.all([
    db.query.wallets.findMany({ where: eq(wallets.userId, userId), orderBy: (w, { asc }) => [asc(w.createdAt)] }),
    getWalletBalancesForUser(userId),
  ]);

  const walletDTOs = userWallets.map((w) => ({
    ...w,
    initialBalance: Number(w.initialBalance),
    savingsMonthlyDeposit: w.savingsMonthlyDeposit ? Number(w.savingsMonthlyDeposit) : null,
    savingsAnnualInterestRate: w.savingsAnnualInterestRate ? Number(w.savingsAnnualInterestRate) : null,
    balance: balances[w.id] ?? Number(w.initialBalance),
  }));

  return <WalletsClient initialWallets={walletDTOs as any} />;
}
