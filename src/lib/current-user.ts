import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";

// UangKu runs without login (single-user personal deployment). Every
// request resolves to this one implicit account, auto-created on first use.
const DEFAULT_USER_EMAIL = "owner@uangku.local";
const DEFAULT_USER_NAME = "Saya";

let cachedUserId: string | null = null;

export async function getCurrentUserId(): Promise<string> {
  if (cachedUserId) return cachedUserId;

  const existing = await db.query.users.findFirst({
    where: eq(users.email, DEFAULT_USER_EMAIL),
  });
  if (existing) {
    cachedUserId = existing.id;
    return existing.id;
  }

  try {
    const [created] = await db
      .insert(users)
      .values({ email: DEFAULT_USER_EMAIL, name: DEFAULT_USER_NAME })
      .returning();
    cachedUserId = created.id;
    return created.id;
  } catch {
    // Unique violation race: a concurrent cold start created it first.
    const retry = await db.query.users.findFirst({
      where: eq(users.email, DEFAULT_USER_EMAIL),
    });
    if (!retry) throw new Error("Failed to resolve default user");
    cachedUserId = retry.id;
    return retry.id;
  }
}
