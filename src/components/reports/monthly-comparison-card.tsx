import { TrendingDown, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatIDR } from "@/lib/utils";

export function MonthlyComparisonCard({
  label,
  current,
  previous,
  change,
  goodDirection,
}: {
  label: string;
  current: number;
  previous: number;
  change: number;
  goodDirection: "up" | "down";
}) {
  const isUp = change >= 0;
  const isGood = goodDirection === "up" ? isUp : !isUp;
  const Icon = isUp ? TrendingUp : TrendingDown;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold tabular-nums">{formatIDR(current)}</div>
        <div className={`mt-1 flex items-center gap-1 text-sm ${isGood ? "text-success" : "text-destructive"}`}>
          <Icon className="h-4 w-4" />
          <span>{Math.abs(Math.round(change * 100))}% dari bulan lalu</span>
        </div>
        <div className="mt-1 text-xs text-muted-foreground">Bulan lalu: {formatIDR(previous)}</div>
      </CardContent>
    </Card>
  );
}
