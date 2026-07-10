export type WalletType = "bank" | "ewallet" | "cash" | "savings" | "other";
export type TransactionType = "income" | "expense" | "transfer";
export type TransactionSource = "web" | "telegram_text" | "telegram_receipt";
export type CategoryKind = "income" | "expense";

export interface WalletDTO {
  id: string;
  name: string;
  type: WalletType;
  initialBalance: number;
  balance: number;
  currency: string;
  icon: string;
  color: string;
  savingsMonthlyDeposit: number | null;
  savingsAnnualInterestRate: number | null;
}

export interface CategoryDTO {
  id: string;
  name: string;
  kind: CategoryKind;
  icon: string;
  color: string;
  isDefault: boolean;
}

export interface TransactionDTO {
  id: string;
  type: TransactionType;
  amount: number;
  walletId: string;
  categoryId: string | null;
  date: string;
  note: string | null;
  source: TransactionSource;
  receiptUrl: string | null;
  transferPairId: string | null;
  wallet?: { id: string; name: string; color: string } | null;
  category?: { id: string; name: string; color: string } | null;
}

export interface BudgetDTO {
  id: string;
  categoryId: string;
  month: string;
  limitAmount: number;
  spent: number;
  percentage: number;
  category?: { id: string; name: string; color: string; icon: string };
}

export interface RecurringDTO {
  id: string;
  walletId: string;
  categoryId: string | null;
  type: TransactionType;
  amount: number;
  note: string | null;
  frequency: "daily" | "weekly" | "monthly";
  dayOfMonth: number | null;
  dayOfWeek: number | null;
  nextRunDate: string;
  active: boolean;
  wallet?: { id: string; name: string };
  category?: { id: string; name: string } | null;
}
