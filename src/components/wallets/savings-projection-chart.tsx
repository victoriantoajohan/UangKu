"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiFetch } from "@/lib/api-client";
import { CHART_CHROME, CATEGORICAL_LIGHT, CATEGORICAL_DARK } from "@/lib/chart-colors";
import { formatIDR } from "@/lib/utils";

interface ProjectionPoint {
  year: number;
  balance: number;
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border bg-popover px-3 py-2 text-xs shadow-md">
      <div className="mb-1 font-medium">Tahun ke-{label}</div>
      <div className="font-medium tabular-nums">{formatIDR(payload[0].value)}</div>
    </div>
  );
}

export function SavingsProjectionChart({ walletId }: { walletId: string }) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const chrome = isDark ? CHART_CHROME.dark : CHART_CHROME.light;
  const seriesColor = isDark ? CATEGORICAL_DARK[0] : CATEGORICAL_LIGHT[0];

  const [points, setPoints] = useState<ProjectionPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<{ data: { points: ProjectionPoint[] } }>(`/api/wallets/${walletId}/projection`)
      .then((res) => setPoints(res.data.points))
      .finally(() => setLoading(false));
  }, [walletId]);

  if (loading) {
    return <div className="h-56 animate-pulse rounded-md bg-muted" />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Proyeksi Pertumbuhan (1-5 Tahun)</CardTitle>
      </CardHeader>
      <CardContent className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={points} margin={{ left: 8, right: 8 }}>
            <defs>
              <linearGradient id={`fill-${walletId}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={seriesColor} stopOpacity={0.35} />
                <stop offset="100%" stopColor={seriesColor} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke={chrome.grid} />
            <XAxis
              dataKey="year"
              tickFormatter={(y) => `Th ${y}`}
              axisLine={{ stroke: chrome.axis }}
              tickLine={false}
              tick={{ fill: chrome.mutedText, fontSize: 12 }}
            />
            <YAxis
              tickFormatter={(v) => `${Math.round(v / 1_000_000)}jt`}
              axisLine={false}
              tickLine={false}
              tick={{ fill: chrome.mutedText, fontSize: 12 }}
              width={48}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="balance"
              stroke={seriesColor}
              strokeWidth={2}
              fill={`url(#fill-${walletId})`}
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
