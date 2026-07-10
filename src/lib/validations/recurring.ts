import { z } from "zod";

export const createRecurringSchema = z
  .object({
    walletId: z.string().uuid(),
    categoryId: z.string().uuid().optional().nullable(),
    type: z.enum(["income", "expense"]),
    amount: z.number().positive(),
    note: z.string().max(500).optional().nullable(),
    frequency: z.enum(["daily", "weekly", "monthly"]),
    dayOfMonth: z.number().int().min(1).max(28).optional(),
    dayOfWeek: z.number().int().min(0).max(6).optional(),
    startDate: z.coerce.date().default(() => new Date()),
  })
  .refine((data) => data.frequency !== "monthly" || data.dayOfMonth !== undefined, {
    message: "dayOfMonth wajib diisi untuk frekuensi bulanan",
    path: ["dayOfMonth"],
  })
  .refine((data) => data.frequency !== "weekly" || data.dayOfWeek !== undefined, {
    message: "dayOfWeek wajib diisi untuk frekuensi mingguan",
    path: ["dayOfWeek"],
  });

export const updateRecurringSchema = z.object({
  amount: z.number().positive().optional(),
  note: z.string().max(500).optional().nullable(),
  active: z.boolean().optional(),
});

export type CreateRecurringInput = z.infer<typeof createRecurringSchema>;
export type UpdateRecurringInput = z.infer<typeof updateRecurringSchema>;
