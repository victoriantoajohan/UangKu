import { z } from "zod";

export const monthSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Format bulan harus YYYY-MM");

export const createBudgetSchema = z.object({
  categoryId: z.string().uuid(),
  month: monthSchema,
  limitAmount: z.number().positive(),
});

export const updateBudgetSchema = z.object({
  limitAmount: z.number().positive(),
});

export type CreateBudgetInput = z.infer<typeof createBudgetSchema>;
export type UpdateBudgetInput = z.infer<typeof updateBudgetSchema>;
