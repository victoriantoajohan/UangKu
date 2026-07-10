"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiFetch } from "@/lib/api-client";
import type { CategoryDTO } from "@/types/domain";

export function CategoriesManager({ initialCategories }: { initialCategories: CategoryDTO[] }) {
  const [categories, setCategories] = useState(initialCategories);
  const [name, setName] = useState("");
  const [kind, setKind] = useState<"income" | "expense">("expense");
  const [saving, setSaving] = useState(false);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      const res = await apiFetch<{ data: CategoryDTO }>("/api/categories", {
        method: "POST",
        body: JSON.stringify({ name: name.trim(), kind }),
      });
      setCategories((prev) => [...prev, res.data]);
      setName("");
      toast.success("Kategori ditambahkan");
    } catch (error: any) {
      toast.error(error.message ?? "Gagal menambah kategori");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(category: CategoryDTO) {
    if (!confirm(`Hapus kategori "${category.name}"?`)) return;
    await apiFetch(`/api/categories/${category.id}`, { method: "DELETE" });
    setCategories((prev) => prev.filter((c) => c.id !== category.id));
    toast.success("Kategori dihapus");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Kategori</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleAdd} className="flex flex-wrap gap-2">
          <Input
            placeholder="Nama kategori baru"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="max-w-xs"
          />
          <Select value={kind} onValueChange={(v) => setKind(v as "income" | "expense")}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="expense">Pengeluaran</SelectItem>
              <SelectItem value="income">Pemasukan</SelectItem>
            </SelectContent>
          </Select>
          <Button type="submit" disabled={saving}>
            <Plus className="mr-1 h-4 w-4" /> Tambah
          </Button>
        </form>

        <div className="flex flex-wrap gap-2">
          {categories.map((c) => (
            <Badge key={c.id} variant={c.isDefault ? "secondary" : "outline"} className="gap-1.5 py-1.5 pl-3 pr-2">
              {c.name}
              {!c.isDefault && (
                <button onClick={() => handleDelete(c)} aria-label={`Hapus ${c.name}`}>
                  <Trash2 className="h-3 w-3" />
                </button>
              )}
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
