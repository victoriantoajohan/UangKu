import { NextRequest, NextResponse } from "next/server";
import { eq, isNull, or } from "drizzle-orm";
import { db } from "@/db";
import { categories } from "@/db/schema";
import { requireUserId, handleApiError } from "@/lib/api-helpers";
import { createCategorySchema } from "@/lib/validations/category";

export async function GET() {
  try {
    const userId = await requireUserId();
    const data = await db.query.categories.findMany({
      where: or(isNull(categories.userId), eq(categories.userId, userId)),
      orderBy: (c, { asc }) => [asc(c.kind), asc(c.name)],
    });
    return NextResponse.json({ data });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await requireUserId();
    const body = createCategorySchema.parse(await req.json());
    const [category] = await db
      .insert(categories)
      .values({ ...body, userId, isDefault: false })
      .returning();
    return NextResponse.json({ data: category }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
