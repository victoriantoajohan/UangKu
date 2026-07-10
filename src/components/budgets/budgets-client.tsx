"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api-client";
import { monthKey } from "@/lib/utils";
import type { BudgetDTO, CategoryDTO } from "@/types/domain";
import { BudgetList } from "./budget-list";
import { BudgetFormDialog } from "./budget-form-dialog";

function shiftMonth(month: string, delta: number): string {
  const [year, mon] = month.split("-").map(Number);
  const date = new Date(year, mon - 1 + delta, 1);
  return monthKey(date);
}

function monthLabel(month: string): string {
  const [year, mon] = month.split("-").map(Number);
  return new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric" }).format(new Date(year, mon - 1, 1));
}

export function BudgetsClient({ categories }: { categories: CategoryDTO[] }) {
  const [month, setMonth] = useState(() => monthKey());
  const [budgets, setBudgets] = useState<BudgetDTO[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch<{ data: BudgetDTO[] }>(`/api/budgets?month=${month}`);
      setBudgets(res.data);
    } catch (error: any) {
      toast.error(error.message ?? "Gagal memuat budget");
    } finally {
      setLoading(false);
    }
  }, [month]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleDelete(b: BudgetDTO) {
    if (!confirm(`Hapus budget untuk "${b.category?.name}"?`)) return;
    await apiFetch(`/api/budgets/${b.id}`, { method: "DELETE" });
    toast.success("Budget dihapus");
    load();
  }

  async function handleEdit(b: BudgetDTO) {
    const input = prompt(`Batas baru untuk ${b.category?.name} (Rp):`, String(b.limitAmount));
    if (!input) return;
    const value = Number(input);
    if (!value || value <= 0) return;
    await apiFetch(`/api/budgets/${b.id}`, { method: "PATCH", body: JSON.stringify({ limitAmount: value }) });
    toast.success("Budget diperbarui");
    load();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">Budget</h1>
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="mr-1 h-4 w-4" /> Tambah Budget
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

      {!loading && <BudgetList budgets={budgets} onEdit={handleEdit} onDelete={handleDelete} />}

      <BudgetFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        categories={categories}
        month={month}
        existingCategoryIds={budgets.map((b) => b.categoryId)}
        onSaved={load}
      />
    </div>
  );
}
