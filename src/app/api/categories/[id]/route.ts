import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { categories } from "@/db/schema";
import { requireUserId, handleApiError, ApiError } from "@/lib/api-helpers";
import { updateCategorySchema } from "@/lib/validations/category";

async function findOwnedCategory(userId: string, id: string) {
  const category = await db.query.categories.findFirst({
    where: and(eq(categories.id, id), eq(categories.userId, userId)),
  });
  if (!category) throw new ApiError(404, "Category not found or not editable");
  return category;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = await requireUserId();
    await findOwnedCategory(userId, params.id);
    const body = updateCategorySchema.parse(await req.json());
    const [updated] = await db
      .update(categories)
      .set(body)
      .where(eq(categories.id, params.id))
      .returning();
    return NextResponse.json({ data: updated });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = await requireUserId();
    await findOwnedCategory(userId, params.id);
    await db.delete(categories).where(eq(categories.id, params.id));
    return NextResponse.json({ data: { success: true } });
  } catch (error) {
    return handleApiError(error);
  }
}
