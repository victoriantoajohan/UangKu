"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { apiFetch } from "@/lib/api-client";
import { formatDateID, formatIDR } from "@/lib/utils";
import type { CategoryDTO, RecurringDTO, WalletDTO } from "@/types/domain";
import { RecurringFormDialog } from "./recurring-form-dialog";

const FREQUENCY_LABEL: Record<string, string> = {
  daily: "Harian",
  weekly: "Mingguan",
  monthly: "Bulanan",
};

export function RecurringManager({ wallets, categories }: { wallets: WalletDTO[]; categories: CategoryDTO[] }) {
  const [items, setItems] = useState<RecurringDTO[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const res = await apiFetch<{ data: RecurringDTO[] }>("/api/recurring");
      setItems(res.data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function toggleActive(item: RecurringDTO) {
    await apiFetch(`/api/recurring/${item.id}`, {
      method: "PATCH",
      body: JSON.stringify({ active: !item.active }),
    });
    load();
  }

  async function remove(item: RecurringDTO) {
    if (!confirm("Hapus transaksi berulang ini?")) return;
    await apiFetch(`/api/recurring/${item.id}`, { method: "DELETE" });
    toast.success("Dihapus");
    load();
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Transaksi Berulang</CardTitle>
        <Button size="sm" onClick={() => setFormOpen(true)}>
          <Plus className="mr-1 h-4 w-4" /> Tambah
        </Button>
      </CardHeader>
      <CardContent className="space-y-2">
        {!loading && items.length === 0 && (
          <p className="py-4 text-center text-sm text-muted-foreground">
            Belum ada transaksi berulang (contoh: gaji bulanan, tagihan langganan).
          </p>
        )}
        {items.map((item) => (
          <div key={item.id} className="flex items-center justify-between gap-3 rounded-md border p-3">
            <div>
              <div className="text-sm font-medium">
                {item.category?.name ?? item.note ?? "Transaksi"} · {item.wallet?.name}
              </div>
              <div className="text-xs text-muted-foreground">
                {FREQUENCY_LABEL[item.frequency]} · {formatIDR(item.amount)} · Berikutnya:{" "}
                {formatDateID(item.nextRunDate)}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={item.active} onCheckedChange={() => toggleActive(item)} />
              <Button variant="ghost" size="icon" onClick={() => remove(item)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </CardContent>

      <RecurringFormDialog open={formOpen} onOpenChange={setFormOpen} wallets={wallets} categories={categories} onSaved={load} />
    </Card>
  );
}
