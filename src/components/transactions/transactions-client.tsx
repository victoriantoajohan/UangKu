"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, ArrowDownLeft, ArrowUpRight, ArrowLeftRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { apiFetch } from "@/lib/api-client";
import { formatDateID, formatIDR } from "@/lib/utils";
import type { CategoryDTO, TransactionDTO, WalletDTO } from "@/types/domain";
import { TransactionFormDialog } from "./transaction-form-dialog";

interface Props {
  initialWallets: WalletDTO[];
  initialCategories: CategoryDTO[];
}

export function TransactionsClient({ initialWallets, initialCategories }: Props) {
  const [wallets] = useState(initialWallets);
  const [categories] = useState(initialCategories);
  const [transactions, setTransactions] = useState<TransactionDTO[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const [walletFilter, setWalletFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [search, setSearch] = useState("");

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<TransactionDTO | null>(null);

  const loadTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: "20" });
      if (walletFilter !== "all") params.set("walletId", walletFilter);
      if (categoryFilter !== "all") params.set("categoryId", categoryFilter);
      if (typeFilter !== "all") params.set("type", typeFilter);
      if (search) params.set("search", search);

      const res = await apiFetch<{ data: TransactionDTO[]; pagination: { totalPages: number } }>(
        `/api/transactions?${params.toString()}`
      );
      setTransactions(res.data);
      setTotalPages(res.pagination.totalPages || 1);
    } catch (error: any) {
      toast.error(error.message ?? "Gagal memuat transaksi");
    } finally {
      setLoading(false);
    }
  }, [page, walletFilter, categoryFilter, typeFilter, search]);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  async function handleDelete(tx: TransactionDTO) {
    if (!confirm("Hapus transaksi ini?")) return;
    try {
      await apiFetch(`/api/transactions/${tx.id}`, { method: "DELETE" });
      toast.success("Transaksi dihapus");
      loadTransactions();
    } catch (error: any) {
      toast.error(error.message ?? "Gagal menghapus transaksi");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">Transaksi</h1>
        <Button
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
        >
          <Plus className="mr-1 h-4 w-4" /> Tambah Transaksi
        </Button>
      </div>

      <Card>
        <CardContent className="flex flex-wrap gap-3 p-4">
          <Input
            placeholder="Cari catatan..."
            value={search}
            onChange={(e) => {
              setPage(1);
              setSearch(e.target.value);
            }}
            className="w-full sm:w-48"
          />
          <Select
            value={typeFilter}
            onValueChange={(v) => {
              setPage(1);
              setTypeFilter(v);
            }}
          >
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="Tipe" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Tipe</SelectItem>
              <SelectItem value="income">Pemasukan</SelectItem>
              <SelectItem value="expense">Pengeluaran</SelectItem>
              <SelectItem value="transfer">Transfer</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={walletFilter}
            onValueChange={(v) => {
              setPage(1);
              setWalletFilter(v);
            }}
          >
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="Dompet" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Dompet</SelectItem>
              {wallets.map((w) => (
                <SelectItem key={w.id} value={w.id}>
                  {w.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={categoryFilter}
            onValueChange={(v) => {
              setPage(1);
              setCategoryFilter(v);
            }}
          >
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Kategori" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Kategori</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tanggal</TableHead>
              <TableHead>Dompet</TableHead>
              <TableHead>Kategori</TableHead>
              <TableHead>Catatan</TableHead>
              <TableHead className="text-right">Jumlah</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!loading && transactions.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                  Tidak ada transaksi.
                </TableCell>
              </TableRow>
            )}
            {transactions.map((tx) => {
              const Icon = tx.type === "income" ? ArrowUpRight : tx.type === "expense" ? ArrowDownLeft : ArrowLeftRight;
              const color =
                tx.type === "income" ? "text-success" : tx.type === "expense" ? "text-destructive" : "text-muted-foreground";
              const sign = tx.type === "income" ? "+" : tx.type === "expense" ? "-" : "";
              return (
                <TableRow key={tx.id}>
                  <TableCell>{formatDateID(tx.date)}</TableCell>
                  <TableCell>{tx.wallet?.name ?? "-"}</TableCell>
                  <TableCell>{tx.category?.name ?? "-"}</TableCell>
                  <TableCell className="max-w-[200px] truncate">{tx.note ?? "-"}</TableCell>
                  <TableCell className={`text-right font-medium tabular-nums ${color}`}>
                    <span className="inline-flex items-center justify-end gap-1">
                      <Icon className="h-3.5 w-3.5" />
                      {sign}
                      {formatIDR(tx.amount)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    {tx.type !== "transfer" && (
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setEditing(tx);
                            setFormOpen(true);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(tx)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Sebelumnya
          </Button>
          <span className="text-sm text-muted-foreground">
            Halaman {page} dari {totalPages}
          </span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
            Berikutnya
          </Button>
        </div>
      )}

      <TransactionFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        wallets={wallets}
        categories={categories}
        transaction={editing}
        onSaved={loadTransactions}
      />
    </div>
  );
}
