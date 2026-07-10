"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";
import { Plus, ArrowLeftRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api-client";
import type { WalletDTO } from "@/types/domain";
import { WalletCard } from "./wallet-card";
import { WalletFormDialog } from "./wallet-form-dialog";
import { TransferDialog } from "./transfer-dialog";

export function WalletsClient({ initialWallets }: { initialWallets: WalletDTO[] }) {
  const [wallets, setWallets] = useState(initialWallets);
  const [formOpen, setFormOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [editing, setEditing] = useState<WalletDTO | null>(null);

  const reload = useCallback(async () => {
    const res = await apiFetch<{ data: WalletDTO[] }>("/api/wallets");
    setWallets(res.data);
  }, []);

  async function handleDelete(wallet: WalletDTO) {
    if (!confirm(`Hapus dompet "${wallet.name}"? Semua transaksi di dalamnya juga akan terhapus.`)) return;
    try {
      await apiFetch(`/api/wallets/${wallet.id}`, { method: "DELETE" });
      toast.success("Dompet dihapus");
      reload();
    } catch (error: any) {
      toast.error(error.message ?? "Gagal menghapus dompet");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">Dompet</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setTransferOpen(true)} disabled={wallets.length < 2}>
            <ArrowLeftRight className="mr-1 h-4 w-4" /> Transfer
          </Button>
          <Button
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            <Plus className="mr-1 h-4 w-4" /> Tambah Dompet
          </Button>
        </div>
      </div>

      {wallets.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">
          Belum ada dompet. Buat dompet pertamamu untuk mulai mencatat transaksi.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {wallets.map((w) => (
            <WalletCard
              key={w.id}
              wallet={w}
              onEdit={() => {
                setEditing(w);
                setFormOpen(true);
              }}
              onDelete={() => handleDelete(w)}
            />
          ))}
        </div>
      )}

      <WalletFormDialog open={formOpen} onOpenChange={setFormOpen} wallet={editing} onSaved={reload} />
      <TransferDialog open={transferOpen} onOpenChange={setTransferOpen} wallets={wallets} onSaved={reload} />
    </div>
  );
}
