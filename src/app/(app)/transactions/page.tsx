import { getServerSession } from "next-auth";
import { eq, isNull, or } from "drizzle-orm";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { categories, wallets } from "@/db/schema";
import { getWalletBalancesForUser } from "@/lib/wallet-balance";
import { TransactionsClient } from "@/components/transactions/transactions-client";

export default async function TransactionsPage() {
  const session = await getServerSession(authOptions);
  const userId = session!.user.id;

  const [userWallets, userCategories, balances] = await Promise.all([
    db.query.wallets.findMany({ where: eq(wallets.userId, userId) }),
    db.query.categories.findMany({
      where: or(isNull(categories.userId), eq(categories.userId, userId)),
    }),
    getWalletBalancesForUser(userId),
  ]);

  const walletDTOs = userWallets.map((w) => ({
    ...w,
    initialBalance: Number(w.initialBalance),
    savingsMonthlyDeposit: w.savingsMonthlyDeposit ? Number(w.savingsMonthlyDeposit) : null,
    savingsAnnualInterestRate: w.savingsAnnualInterestRate ? Number(w.savingsAnnualInterestRate) : null,
    balance: balances[w.id] ?? Number(w.initialBalance),
  }));

  return <TransactionsClient initialWallets={walletDTOs as any} initialCategories={userCategories as any} />;
}
