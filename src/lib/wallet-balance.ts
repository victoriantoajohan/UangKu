import { eq } from "drizzle-orm";
import { db } from "@/db";
import { transactions, wallets } from "@/db/schema";

/**
 * A wallet's balance is always derived (never stored) from its initial
 * balance plus the net effect of every transaction that touches it:
 *  - income:  +amount
 *  - expense: -amount
 *  - transfer: +amount when this wallet is the destination ("in"),
 *              -amount when this wallet is the source ("out")
 */
export function applyTransactionEffect(
  balance: number,
  tx: { type: "income" | "expense" | "transfer"; amount: number; transferDirection?: "in" | "out" | null }
): number {
  if (tx.type === "income") return balance + tx.amount;
  if (tx.type === "expense") return balance - tx.amount;
  // transfer
  return tx.transferDirection === "out" ? balance - tx.amount : balance + tx.amount;
}

export async function getWalletBalance(walletId: string): Promise<number> {
  const wallet = await db.query.wallets.findFirst({
    where: eq(wallets.id, walletId),
  });
  if (!wallet) throw new Error("Wallet not found");

  const txs = await db.query.transactions.findMany({
    where: eq(transactions.walletId, walletId),
  });

  let balance = Number(wallet.initialBalance);
  for (const tx of txs) {
    balance = applyTransactionEffect(balance, {
      type: tx.type,
      amount: Number(tx.amount),
      transferDirection: tx.transferDirection,
    });
  }
  return balance;
}

export async function getWalletBalancesForUser(
  userId: string
): Promise<Record<string, number>> {
  const userWallets = await db.query.wallets.findMany({
    where: eq(wallets.userId, userId),
  });
  const userTransactions = await db.query.transactions.findMany({
    where: eq(transactions.userId, userId),
  });

  const balances: Record<string, number> = {};
  for (const w of userWallets) {
    balances[w.id] = Number(w.initialBalance);
  }
  for (const tx of userTransactions) {
    if (balances[tx.walletId] === undefined) continue;
    balances[tx.walletId] = applyTransactionEffect(balances[tx.walletId], {
      type: tx.type,
      amount: Number(tx.amount),
      transferDirection: tx.transferDirection,
    });
  }
  return balances;
}
