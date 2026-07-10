import { ArrowDownCircle, ArrowUpCircle, Wallet } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatIDR } from "@/lib/utils";

export function SummaryCards({
  totalBalance,
  income,
  expense,
}: {
  totalBalance: number;
  income: number;
  expense: number;
}) {
  const items = [
    { label: "Total Saldo", value: totalBalance, icon: Wallet, color: "text-primary" },
    { label: "Pemasukan Bulan Ini", value: income, icon: ArrowUpCircle, color: "text-success" },
    { label: "Pengeluaran Bulan Ini", value: expense, icon: ArrowDownCircle, color: "text-destructive" },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {items.map((item) => (
        <Card key={item.label}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{item.label}</CardTitle>
            <item.icon className={`h-5 w-5 ${item.color}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatIDR(item.value)}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
