import { eq, isNull, or } from "drizzle-orm";
import { getCurrentUserId } from "@/lib/current-user";
import { db } from "@/db";
import { categories } from "@/db/schema";
import { BudgetsClient } from "@/components/budgets/budgets-client";

export const dynamic = "force-dynamic";

export default async function BudgetsPage() {
  const userId = await getCurrentUserId();

  const userCategories = await db.query.categories.findMany({
    where: or(isNull(categories.userId), eq(categories.userId, userId)),
  });

  return <BudgetsClient categories={userCategories as any} />;
}
