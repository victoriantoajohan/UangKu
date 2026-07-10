"use client";

import { Pencil, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { formatIDR } from "@/lib/utils";
import type { BudgetDTO } from "@/types/domain";

function progressColor(percentage: number): string {
  if (percentage >= 1) return "bg-destructive";
  if (percentage >= 0.8) return "bg-warning";
  return "bg-primary";
}

export function BudgetList({
  budgets,
  onEdit,
  onDelete,
}: {
  budgets: BudgetDTO[];
  onEdit: (b: BudgetDTO) => void;
  onDelete: (b: BudgetDTO) => void;
}) {
  if (budgets.length === 0) {
    return <p className="py-12 text-center text-sm text-muted-foreground">Belum ada budget bulan ini.</p>;
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {budgets.map((b) => {
        const pct = Math.min(b.percentage, 1) * 100;
        return (
          <Card key={b.id}>
            <CardContent className="space-y-3 p-5">
              <div className="flex items-center justify-between">
                <div className="font-medium">{b.category?.name}</div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => onEdit(b)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => onDelete(b)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <Progress value={pct} indicatorClassName={progressColor(b.percentage)} />
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {formatIDR(b.spent)} / {formatIDR(b.limitAmount)}
                </span>
                <span
                  className={
                    b.percentage >= 1
                      ? "font-semibold text-destructive"
                      : b.percentage >= 0.8
                        ? "font-semibold text-warning"
                        : "text-muted-foreground"
                  }
                >
                  {Math.round(b.percentage * 100)}%
                </span>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
