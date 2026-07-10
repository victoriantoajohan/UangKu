"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Download } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api-client";
import { monthKey } from "@/lib/utils";
import { CategoryDonut } from "@/components/dashboard/category-donut";
import { MonthlyComparisonCard } from "./monthly-comparison-card";

interface MonthlyReport {
  month: string;
  current: { income: number; expense: number; net: number };
  previous: { income: number; expense: number; net: number };
  incomeChange: number;
  expenseChange: number;
  expenseByCategory: Array<{ name: string; total: number }>;
  incomeByCategory: Array<{ name: string; total: number }>;
}

function shiftMonth(month: string, delta: number): string {
  const [year, mon] = month.split("-").map(Number);
  return monthKey(new Date(year, mon - 1 + delta, 1));
}

function monthLabel(month: string): string {
  const [year, mon] = month.split("-").map(Number);
  return new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric" }).format(new Date(year, mon - 1, 1));
}

export function ReportsClient() {
  const [month, setMonth] = useState(() => monthKey());
  const [report, setReport] = useState<MonthlyReport | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch<{ data: MonthlyReport }>(`/api/reports/monthly?month=${month}`);
      setReport(res.data);
    } catch (error: any) {
      toast.error(error.message ?? "Gagal memuat laporan");
    } finally {
      setLoading(false);
    }
  }, [month]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">Laporan</h1>
        <Button variant="outline" asChild>
          <a href={`/api/reports/export?month=${month}`} download>
            <Download className="mr-1 h-4 w-4" /> Ekspor CSV
          </a>
        </Button>
      </div>

      <div className="flex items-center justify-center gap-3">
        <Button variant="outline" size="icon" onClick={() => setMonth((m) => shiftMonth(m, -1))}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="min-w-40 text-center font-medium">{monthLabel(month)}</span>
        <Button variant="outline" size="icon" onClick={() => setMonth((m) => shiftMonth(m, 1))}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {!loading && report && (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <MonthlyComparisonCard
              label="Pemasukan"
              current={report.current.income}
              previous={report.previous.income}
              change={report.incomeChange}
              goodDirection="up"
            />
            <MonthlyComparisonCard
              label="Pengeluaran"
              current={report.current.expense}
              previous={report.previous.expense}
              change={report.expenseChange}
              goodDirection="down"
            />
          </div>

          <CategoryDonut data={report.expenseByCategory} />
        </>
      )}
    </div>
  );
}
