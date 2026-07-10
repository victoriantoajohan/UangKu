import { z } from "zod";

export const createCategorySchema = z.object({
  name: z.string().min(1).max(50),
  kind: z.enum(["income", "expense"]),
  icon: z.string().default("tag"),
  color: z.string().default("#94a3b8"),
});

export const updateCategorySchema = createCategorySchema.partial();

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
