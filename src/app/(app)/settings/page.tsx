import { eq, isNull, or } from "drizzle-orm";
import { getCurrentUserId } from "@/lib/current-user";
import { db } from "@/db";
import { categories, wallets } from "@/db/schema";
import { TelegramLinkCard } from "@/components/settings/telegram-link-card";
import { CategoriesManager } from "@/components/settings/categories-manager";
import { RecurringManager } from "@/components/settings/recurring-manager";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const userId = await getCurrentUserId();

  const [userWallets, userCategories] = await Promise.all([
    db.query.wallets.findMany({ where: eq(wallets.userId, userId) }),
    db.query.categories.findMany({
      where: or(isNull(categories.userId), eq(categories.userId, userId)),
    }),
  ]);

  const walletDTOs = userWallets.map((w) => ({
    ...w,
    initialBalance: Number(w.initialBalance),
    savingsMonthlyDeposit: w.savingsMonthlyDeposit ? Number(w.savingsMonthlyDeposit) : null,
    savingsAnnualInterestRate: w.savingsAnnualInterestRate ? Number(w.savingsAnnualInterestRate) : null,
    balance: 0,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Pengaturan</h1>
        <p className="text-sm text-muted-foreground">Kelola integrasi Telegram, kategori, dan transaksi berulang.</p>
      </div>

      <TelegramLinkCard />
      <RecurringManager wallets={walletDTOs as any} categories={userCategories as any} />
      <CategoriesManager initialCategories={userCategories as any} />
    </div>
  );
}
