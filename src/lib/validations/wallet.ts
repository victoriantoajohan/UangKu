import { z } from "zod";

export const walletTypeSchema = z.enum(["bank", "ewallet", "cash", "savings", "other"]);

export const createWalletSchema = z.object({
  name: z.string().min(1, "Nama dompet wajib diisi").max(50),
  type: walletTypeSchema,
  initialBalance: z.number().finite().default(0),
  currency: z.string().default("IDR"),
  icon: z.string().default("wallet"),
  color: z.string().default("#6366f1"),
  savingsMonthlyDeposit: z.number().finite().nonnegative().optional(),
  savingsAnnualInterestRate: z.number().finite().min(0).max(100).optional(),
});

export const updateWalletSchema = createWalletSchema.partial();

export const transferSchema = z.object({
  fromWalletId: z.string().uuid(),
  toWalletId: z.string().uuid(),
  amount: z.number().positive(),
  date: z.coerce.date().optional(),
  note: z.string().max(500).optional(),
}).refine((data) => data.fromWalletId !== data.toWalletId, {
  message: "Dompet asal dan tujuan tidak boleh sama",
  path: ["toWalletId"],
});

export type CreateWalletInput = z.infer<typeof createWalletSchema>;
export type UpdateWalletInput = z.infer<typeof updateWalletSchema>;
export type TransferInput = z.infer<typeof transferSchema>;
