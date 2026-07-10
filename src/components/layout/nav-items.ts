import type { LucideIcon } from "lucide-react";
import { LayoutDashboard, ArrowLeftRight, Wallet, PiggyBank, FileBarChart, Settings } from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/transactions", label: "Transaksi", icon: ArrowLeftRight },
  { href: "/wallets", label: "Dompet", icon: Wallet },
  { href: "/budgets", label: "Budget", icon: PiggyBank },
  { href: "/reports", label: "Laporan", icon: FileBarChart },
  { href: "/settings", label: "Pengaturan", icon: Settings },
];
