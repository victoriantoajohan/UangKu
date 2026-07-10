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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiFetch } from "@/lib/api-client";
import type { WalletDTO, WalletType } from "@/types/domain";

const WALLET_TYPES: { value: WalletType; label: string }[] = [
  { value: "bank", label: "Bank" },
  { value: "ewallet", label: "E-Wallet" },
  { value: "cash", label: "Tunai" },
  { value: "savings", label: "Tabungan/Investasi" },
  { value: "other", label: "Lainnya" },
];

const COLORS = ["#6366f1", "#22c55e", "#ec4899", "#f97316", "#0ea5e9", "#a855f7", "#eab308"];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  wallet?: WalletDTO | null;
  onSaved: () => void;
}

export function WalletFormDialog({ open, onOpenChange, wallet, onSaved }: Props) {
  const [name, setName] = useState("");
  const [type, setType] = useState<WalletType>("cash");
  const [initialBalance, setInitialBalance] = useState("0");
  const [color, setColor] = useState(COLORS[0]);
  const [monthlyDeposit, setMonthlyDeposit] = useState("0");
  const [annualInterest, setAnnualInterest] = useState("0");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (wallet) {
      setName(wallet.name);
      setType(wallet.type);
      setInitialBalance(String(wallet.initialBalance));
      setColor(wallet.color);
      setMonthlyDeposit(String(wallet.savingsMonthlyDeposit ?? 0));
      setAnnualInterest(String(wallet.savingsAnnualInterestRate ?? 0));
    } else if (open) {
      setName("");
      setType("cash");
      setInitialBalance("0");
      setColor(COLORS[0]);
      setMonthlyDeposit("0");
      setAnnualInterest("0");
    }
  }, [wallet, open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name) return;
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        name,
        type,
        color,
        icon: "wallet",
      };
      if (!wallet) payload.initialBalance = Number(initialBalance);
      if (type === "savings") {
        payload.savingsMonthlyDeposit = Number(monthlyDeposit);
        payload.savingsAnnualInterestRate = Number(annualInterest);
      }

      if (wallet) {
        await apiFetch(`/api/wallets/${wallet.id}`, { method: "PATCH", body: JSON.stringify(payload) });
        toast.success("Dompet berhasil diperbarui");
      } else {
        await apiFetch("/api/wallets", { method: "POST", body: JSON.stringify(payload) });
        toast.success("Dompet berhasil dibuat");
      }
      onOpenChange(false);
      onSaved();
    } catch (error: any) {
      toast.error(error.message ?? "Gagal menyimpan dompet");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{wallet ? "Edit Dompet" : "Tambah Dompet"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Nama Dompet</Label>
            <Input required value={name} onChange={(e) => setName(e.target.value)} placeholder="BCA, GoPay, Cash..." />
          </div>

          <div className="space-y-1.5">
            <Label>Tipe</Label>
            <Select value={type} onValueChange={(v) => setType(v as WalletType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {WALLET_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {!wallet && (
            <div className="space-y-1.5">
              <Label>Saldo Awal (Rp)</Label>
              <Input
                type="number"
                min={0}
                value={initialBalance}
                onChange={(e) => setInitialBalance(e.target.value)}
              />
            </div>
          )}

          {type === "savings" && (
            <div className="grid grid-cols-2 gap-4 rounded-md border p-3">
              <div className="space-y-1.5">
                <Label>Setoran Rutin/Bulan (Rp)</Label>
                <Input type="number" min={0} value={monthlyDeposit} onChange={(e) => setMonthlyDeposit(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Estimasi Bunga/Tahun (%)</Label>
                <Input
                  type="number"
                  min={0}
                  step="0.1"
                  value={annualInterest}
                  onChange={(e) => setAnnualInterest(e.target.value)}
                />
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Warna</Label>
            <div className="flex gap-2">
              {COLORS.map((c) => (
                <button
                  type="button"
                  key={c}
                  onClick={() => setColor(c)}
                  className="h-7 w-7 rounded-full ring-offset-2 transition-all"
                  style={{ backgroundColor: c, outline: color === c ? `2px solid ${c}` : "none", outlineOffset: 2 }}
                  aria-label={c}
                />
              ))}
            </div>
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
