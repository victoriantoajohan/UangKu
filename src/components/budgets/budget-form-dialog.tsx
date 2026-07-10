"use client";

import { useState } from "react";
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
import type { CategoryDTO } from "@/types/domain";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: CategoryDTO[];
  month: string;
  existingCategoryIds: string[];
  onSaved: () => void;
}

export function BudgetFormDialog({ open, onOpenChange, categories, month, existingCategoryIds, onSaved }: Props) {
  const [categoryId, setCategoryId] = useState("");
  const [limitAmount, setLimitAmount] = useState("");
  const [saving, setSaving] = useState(false);

  const availableCategories = categories.filter(
    (c) => c.kind === "expense" && !existingCategoryIds.includes(c.id)
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!categoryId || !limitAmount) return;
    setSaving(true);
    try {
      await apiFetch("/api/budgets", {
        method: "POST",
        body: JSON.stringify({ categoryId, month, limitAmount: Number(limitAmount) }),
      });
      toast.success("Budget berhasil dibuat");
      onOpenChange(false);
      setCategoryId("");
      setLimitAmount("");
      onSaved();
    } catch (error: any) {
      toast.error(error.message ?? "Gagal membuat budget");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tambah Budget</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Kategori</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih kategori" />
              </SelectTrigger>
              <SelectContent>
                {availableCategories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Batas Bulanan (Rp)</Label>
            <Input
              type="number"
              min={0}
              required
              value={limitAmount}
              onChange={(e) => setLimitAmount(e.target.value)}
              placeholder="1000000"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Batal
            </Button>
            <Button type="submit" disabled={saving || !categoryId}>
              {saving ? "Menyimpan..." : "Simpan"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
