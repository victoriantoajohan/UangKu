"use client";

import { useTheme } from "next-themes";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { STATUS, CHART_CHROME } from "@/lib/chart-colors";
import { formatIDR } from "@/lib/utils";

interface TrendPoint {
  month: string;
  income: number;
  expense: number;
}

function monthLabel(monthKey: string): string {
  const [year, month] = monthKey.split("-").map(Number);
  return new Intl.DateTimeFormat("id-ID", { month: "short" }).format(new Date(year, month - 1, 1));
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border bg-popover px-3 py-2 text-xs shadow-md">
      <div className="mb-1 font-medium">{label}</div>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: p.fill }} />
          <span className="text-muted-foreground">{p.name}:</span>
          <span className="font-medium tabular-nums">{formatIDR(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

export function TrendChart({ data }: { data: TrendPoint[] }) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const chrome = isDark ? CHART_CHROME.dark : CHART_CHROME.light;
  const incomeColor = isDark ? STATUS.good.dark : STATUS.good.light;
  const expenseColor = isDark ? STATUS.critical.dark : STATUS.critical.light;

  const chartData = data.map((d) => ({ ...d, label: monthLabel(d.month) }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tren 6 Bulan Terakhir</CardTitle>
      </CardHeader>
      <CardContent className="h-72 w-full pl-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} barGap={4} margin={{ left: 8, right: 8 }}>
            <CartesianGrid vertical={false} stroke={chrome.grid} />
            <XAxis
              dataKey="label"
              axisLine={{ stroke: chrome.axis }}
              tickLine={false}
              tick={{ fill: chrome.mutedText, fontSize: 12 }}
            />
            <YAxis
              tickFormatter={(v) => `${Math.round(v / 1000)}k`}
              axisLine={false}
              tickLine={false}
              tick={{ fill: chrome.mutedText, fontSize: 12 }}
              width={48}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(128,128,128,0.08)" }} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="income" name="Pemasukan" fill={incomeColor} radius={[4, 4, 0, 0]} maxBarSize={28} />
            <Bar dataKey="expense" name="Pengeluaran" fill={expenseColor} radius={[4, 4, 0, 0]} maxBarSize={28} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
