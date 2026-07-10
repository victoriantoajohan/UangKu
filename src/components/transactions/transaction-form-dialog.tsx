"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiFetch } from "@/lib/api-client";
import type { CategoryDTO, TransactionDTO, WalletDTO } from "@/types/domain";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  wallets: WalletDTO[];
  categories: CategoryDTO[];
  transaction?: TransactionDTO | null;
  onSaved: () => void;
}

export function TransactionFormDialog({ open, onOpenChange, wallets, categories, transaction, onSaved }: Props) {
  const [type, setType] = useState<"income" | "expense">("expense");
  const [walletId, setWalletId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (transaction) {
      setType(transaction.type === "income" ? "income" : "expense");
      setWalletId(transaction.walletId);
      setCategoryId(transaction.categoryId ?? "");
      setAmount(String(transaction.amount));
      setDate(new Date(transaction.date).toISOString().slice(0, 10));
      setNote(transaction.note ?? "");
    } else if (open) {
      setType("expense");
      setWalletId(wallets[0]?.id ?? "");
      setCategoryId("");
      setAmount("");
      setDate(new Date().toISOString().slice(0, 10));
      setNote("");
    }
  }, [transaction, open, wallets]);

  const filteredCategories = categories.filter((c) => c.kind === type);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!walletId || !amount) return;
    setSaving(true);
    try {
      const payload = {
        type,
        walletId,
        categoryId: categoryId || null,
        amount: Number(amount),
        date: new Date(date).toISOString(),
        note: note || null,
      };

      if (transaction) {
        await apiFetch(`/api/transactions/${transaction.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
        toast.success("Transaksi berhasil diperbarui");
      } else {
        await apiFetch("/api/transactions", {
          method: "POST",
          body: JSON.stringify({ ...payload, source: "web" }),
        });
        toast.success("Transaksi berhasil disimpan");
      }
      onOpenChange(false);
      onSaved();
    } catch (error: any) {
      toast.error(error.message ?? "Gagal menyimpan transaksi");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{transaction ? "Edit Transaksi" : "Tambah Transaksi"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Tabs value={type} onValueChange={(v) => setType(v as "income" | "expense")}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="expense">Pengeluaran</TabsTrigger>
              <TabsTrigger value="income">Pemasukan</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="space-y-1.5">
            <Label>Jumlah (Rp)</Label>
            <Input
              type="number"
              min={0}
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="25000"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Dompet</Label>
              <Select value={walletId} onValueChange={setWalletId}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih dompet" />
                </SelectTrigger>
                <SelectContent>
                  {wallets.map((w) => (
                    <SelectItem key={w.id} value={w.id}>
                      {w.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Kategori</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih kategori" />
                </SelectTrigger>
                <SelectContent>
                  {filteredCategories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Tanggal</Label>
            <Input type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label>Catatan</Label>
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Opsional" rows={2} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Batal
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Menyimpan..." : "Simpan"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
