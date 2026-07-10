import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { telegramLinkCodes, telegramLinks } from "@/db/schema";
import { requireUserId, handleApiError } from "@/lib/api-helpers";

function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function GET() {
  try {
    const userId = await requireUserId();
    const link = await db.query.telegramLinks.findFirst({
      where: eq(telegramLinks.userId, userId),
    });
    return NextResponse.json({ data: { linked: !!link, username: link?.username ?? null } });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST() {
  try {
    const userId = await requireUserId();

    const code = generateCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    const [linkCode] = await db
      .insert(telegramLinkCodes)
      .values({ userId, code, expiresAt })
      .returning();

    return NextResponse.json({
      data: { code: linkCode.code, expiresAt: linkCode.expiresAt },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE() {
  try {
    const userId = await requireUserId();
    await db.delete(telegramLinks).where(eq(telegramLinks.userId, userId));
    return NextResponse.json({ data: { success: true } });
  } catch (error) {
    return handleApiError(error);
  }
}
