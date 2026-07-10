import { getServerSession } from "next-auth";
import { eq, isNull, or } from "drizzle-orm";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { categories } from "@/db/schema";
import { BudgetsClient } from "@/components/budgets/budgets-client";

export default async function BudgetsPage() {
  const session = await getServerSession(authOptions);
  const userId = session!.user.id;

  const userCategories = await db.query.categories.findMany({
    where: or(isNull(categories.userId), eq(categories.userId, userId)),
  });

  return <BudgetsClient categories={userCategories as any} />;
}
