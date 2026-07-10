import Link from "next/link";
import { ArrowDownLeft, ArrowUpRight, ArrowLeftRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatDateID, formatIDR } from "@/lib/utils";

interface RecentTx {
  id: string;
  type: "income" | "expense" | "transfer";
  amount: number;
  date: string | Date;
  note: string | null;
  wallet: { name: string } | null;
  category: { name: string; color: string } | null;
}

export function RecentTransactions({ transactions }: { transactions: RecentTx[] }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Transaksi Terbaru</CardTitle>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/transactions">Lihat semua</Link>
        </Button>
      </CardHeader>
      <CardContent className="space-y-1">
        {transactions.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">Belum ada transaksi.</p>
        )}
        {transactions.map((tx) => {
          const Icon = tx.type === "income" ? ArrowUpRight : tx.type === "expense" ? ArrowDownLeft : ArrowLeftRight;
          const color =
            tx.type === "income" ? "text-success" : tx.type === "expense" ? "text-destructive" : "text-muted-foreground";
          const sign = tx.type === "income" ? "+" : tx.type === "expense" ? "-" : "";
          return (
            <div key={tx.id} className="flex items-center justify-between gap-3 rounded-md px-2 py-2.5 hover:bg-accent/50">
              <div className="flex items-center gap-3">
                <div className={`flex h-9 w-9 items-center justify-center rounded-full bg-muted ${color}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-sm font-medium">{tx.category?.name ?? tx.note ?? "Transaksi"}</div>
                  <div className="text-xs text-muted-foreground">
                    {tx.wallet?.name} • {formatDateID(tx.date)}
                  </div>
                </div>
              </div>
              <div className={`text-sm font-semibold tabular-nums ${color}`}>
                {sign}
                {formatIDR(tx.amount)}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
