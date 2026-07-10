import { z } from "zod";

export const transactionTypeSchema = z.enum(["income", "expense", "transfer"]);
export const transactionSourceSchema = z.enum(["web", "telegram_text", "telegram_receipt"]);

export const createTransactionSchema = z.object({
  type: z.enum(["income", "expense"]),
  walletId: z.string().uuid(),
  categoryId: z.string().uuid().optional().nullable(),
  amount: z.number().positive("Jumlah harus lebih dari 0"),
  date: z.coerce.date().default(() => new Date()),
  note: z.string().max(500).optional().nullable(),
  source: transactionSourceSchema.default("web"),
  receiptUrl: z.string().url().optional().nullable(),
});

export const updateTransactionSchema = createTransactionSchema.partial();

export const listTransactionsQuerySchema = z.object({
  walletId: z.string().uuid().optional(),
  categoryId: z.string().uuid().optional(),
  type: transactionTypeSchema.optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(25),
});

export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;
export type UpdateTransactionInput = z.infer<typeof updateTransactionSchema>;
export type ListTransactionsQuery = z.infer<typeof listTransactionsQuerySchema>;
