import { and, desc, eq, gt } from "drizzle-orm";
import { db } from "@/db";
import { telegramPendingActions } from "@/db/schema";
import type { ParsedTransaction } from "@/lib/ai-parser/text-parser";
import type { ParsedReceipt } from "@/lib/ai-parser/receipt-parser";

export function shortId(): string {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 10);
}

export const PENDING_TTL_MS = 5 * 60 * 1000;

export interface TextConfirmPayload {
  parsed: ParsedTransaction;
  walletId: string | null;
  categoryId: string | null;
  walletCandidates: Array<{ id: string; name: string }>;
  categoryCandidates: Array<{ id: string; name: string }>;
  needs: Array<"wallet" | "category">;
}

export interface ReceiptConfirmPayload {
  merchant: string | null;
  date: string | null;
  total: number;
  categoryGuess: string | null;
  categoryId: string | null;
  walletId: string;
  walletName: string;
  walletCandidates: Array<{ id: string; name: string }>;
  receiptUrl: string;
}

export async function createPendingAction(params: {
  chatId: string;
  userId: string;
  kind: "text_confirm" | "receipt_confirm";
  payload: TextConfirmPayload | ReceiptConfirmPayload;
}) {
  const id = shortId();
  const [row] = await db
    .insert(telegramPendingActions)
    .values({
      id,
      chatId: params.chatId,
      userId: params.userId,
      kind: params.kind,
      payload: params.payload,
      expiresAt: new Date(Date.now() + PENDING_TTL_MS),
    })
    .returning();
  return row;
}

export async function getPendingAction(id: string) {
  return db.query.telegramPendingActions.findFirst({
    where: and(eq(telegramPendingActions.id, id), gt(telegramPendingActions.expiresAt, new Date())),
  });
}

export async function getLatestPendingActionForChat(chatId: string) {
  return db.query.telegramPendingActions.findFirst({
    where: and(
      eq(telegramPendingActions.chatId, chatId),
      gt(telegramPendingActions.expiresAt, new Date())
    ),
    orderBy: [desc(telegramPendingActions.createdAt)],
  });
}

export async function updatePendingActionPayload(
  id: string,
  payload: TextConfirmPayload | ReceiptConfirmPayload
) {
  await db
    .update(telegramPendingActions)
    .set({ payload })
    .where(eq(telegramPendingActions.id, id));
}

export async function deletePendingAction(id: string) {
  await db.delete(telegramPendingActions).where(eq(telegramPendingActions.id, id));
}
