import { getCurrentUserId } from "@/lib/current-user";
import { getDashboardSummary } from "@/lib/reports";
import { SummaryCards } from "@/components/dashboard/summary-cards";
import { TrendChart } from "@/components/dashboard/trend-chart";
import { CategoryDonut } from "@/components/dashboard/category-donut";
import { RecentTransactions } from "@/components/dashboard/recent-transactions";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const userId = await getCurrentUserId();
  const summary = await getDashboardSummary(userId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Ringkasan keuangan kamu bulan ini.</p>
      </div>

      <SummaryCards
        totalBalance={summary.totalBalance}
        income={summary.totals.income}
        expense={summary.totals.expense}
      />

      <div className="grid gap-4 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <TrendChart data={summary.trend} />
        </div>
        <div className="lg:col-span-2">
          <CategoryDonut data={summary.categoryBreakdown} />
        </div>
      </div>

      <RecentTransactions transactions={summary.recentTransactions as any} />
    </div>
  );
}
