"use client";

import { useState } from "react";
import { Wallet, Landmark, Smartphone, PiggyBank, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatIDR } from "@/lib/utils";
import type { WalletDTO } from "@/types/domain";
import { SavingsProjectionChart } from "./savings-projection-chart";

const TYPE_ICON: Record<string, typeof Wallet> = {
  bank: Landmark,
  ewallet: Smartphone,
  cash: Wallet,
  savings: PiggyBank,
  other: Wallet,
};

const TYPE_LABEL: Record<string, string> = {
  bank: "Bank",
  ewallet: "E-Wallet",
  cash: "Tunai",
  savings: "Tabungan",
  other: "Lainnya",
};

export function WalletCard({
  wallet,
  onEdit,
  onDelete,
}: {
  wallet: WalletDTO;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [showProjection, setShowProjection] = useState(false);
  const Icon = TYPE_ICON[wallet.type] ?? Wallet;

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className="flex h-11 w-11 items-center justify-center rounded-full text-white"
              style={{ backgroundColor: wallet.color }}
            >
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <div className="font-semibold">{wallet.name}</div>
              <Badge variant="secondary" className="mt-0.5">
                {TYPE_LABEL[wallet.type]}
              </Badge>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onEdit}>
                <Pencil className="mr-2 h-4 w-4" /> Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive">
                <Trash2 className="mr-2 h-4 w-4" /> Hapus
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="mt-4 text-2xl font-bold tabular-nums">{formatIDR(wallet.balance)}</div>

        {wallet.type === "savings" && (
          <div className="mt-3">
            <Button variant="outline" size="sm" onClick={() => setShowProjection((s) => !s)}>
              {showProjection ? "Sembunyikan proyeksi" : "Lihat proyeksi pertumbuhan"}
            </Button>
            {showProjection && (
              <div className="mt-3">
                <SavingsProjectionChart walletId={wallet.id} />
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
