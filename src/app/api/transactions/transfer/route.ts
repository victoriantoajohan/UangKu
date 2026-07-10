import { NextRequest, NextResponse } from "next/server";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { transactions, wallets } from "@/db/schema";
import { requireUserId, handleApiError, ApiError } from "@/lib/api-helpers";
import { transferSchema } from "@/lib/validations/wallet";

export async function POST(req: NextRequest) {
  try {
    const userId = await requireUserId();
    const body = transferSchema.parse(await req.json());

    const ownedWallets = await db.query.wallets.findMany({
      where: and(
        eq(wallets.userId, userId),
        inArray(wallets.id, [body.fromWalletId, body.toWalletId])
      ),
    });
    if (ownedWallets.length !== 2) {
      throw new ApiError(404, "Salah satu dompet tidak ditemukan");
    }

    const date = body.date ?? new Date();
    const pairId = crypto.randomUUID();

    const [outTx] = await db
      .insert(transactions)
      .values({
        id: pairId,
        userId,
        walletId: body.fromWalletId,
        type: "transfer",
        transferDirection: "out",
        amount: body.amount.toString(),
        date,
        note: body.note ?? null,
        source: "web",
      })
      .returning();

    const [inTx] = await db
      .insert(transactions)
      .values({
        userId,
        walletId: body.toWalletId,
        type: "transfer",
        transferDirection: "in",
        amount: body.amount.toString(),
        date,
        note: body.note ?? null,
        source: "web",
        transferPairId: outTx.id,
      })
      .returning();

    await db
      .update(transactions)
      .set({ transferPairId: inTx.id })
      .where(eq(transactions.id, outTx.id));

    return NextResponse.json(
      {
        data: {
          out: { ...outTx, amount: Number(outTx.amount), transferPairId: inTx.id },
          in: { ...inTx, amount: Number(inTx.amount) },
        },
      },
      { status: 201 }
    );
  } catch (error) {
    return handleApiError(error);
  }
}
