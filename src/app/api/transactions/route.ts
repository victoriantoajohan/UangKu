import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq, gte, ilike, lt, count } from "drizzle-orm";
import { db } from "@/db";
import { transactions, wallets } from "@/db/schema";
import { requireUserId, handleApiError, ApiError } from "@/lib/api-helpers";
import { createTransactionSchema, listTransactionsQuerySchema } from "@/lib/validations/transaction";
import { checkBudgetThreshold } from "@/lib/budget-notify";
import { monthKey } from "@/lib/utils";

export async function GET(req: NextRequest) {
  try {
    const userId = await requireUserId();
    const { searchParams } = new URL(req.url);
    const query = listTransactionsQuerySchema.parse(
      Object.fromEntries(searchParams.entries())
    );

    const conditions = [eq(transactions.userId, userId)];
    if (query.walletId) conditions.push(eq(transactions.walletId, query.walletId));
    if (query.categoryId) conditions.push(eq(transactions.categoryId, query.categoryId));
    if (query.type) conditions.push(eq(transactions.type, query.type));
    if (query.from) conditions.push(gte(transactions.date, query.from));
    if (query.to) conditions.push(lt(transactions.date, query.to));
    if (query.search) conditions.push(ilike(transactions.note, `%${query.search}%`));

    const where = and(...conditions);

    const [{ total }] = await db.select({ total: count() }).from(transactions).where(where);

    const rows = await db.query.transactions.findMany({
      where,
      orderBy: [desc(transactions.date), desc(transactions.createdAt)],
      limit: query.pageSize,
      offset: (query.page - 1) * query.pageSize,
      with: { wallet: true, category: true },
    });

    return NextResponse.json({
      data: rows.map((r) => ({ ...r, amount: Number(r.amount) })),
      pagination: {
        page: query.page,
        pageSize: query.pageSize,
        total: Number(total),
        totalPages: Math.ceil(Number(total) / query.pageSize),
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await requireUserId();
    const body = createTransactionSchema.parse(await req.json());

    const wallet = await db.query.wallets.findFirst({
      where: and(eq(wallets.id, body.walletId), eq(wallets.userId, userId)),
    });
    if (!wallet) throw new ApiError(404, "Wallet not found");

    const [tx] = await db
      .insert(transactions)
      .values({
        userId,
        walletId: body.walletId,
        type: body.type,
        amount: body.amount.toString(),
        categoryId: body.categoryId ?? null,
        date: body.date,
        note: body.note ?? null,
        source: body.source,
        receiptUrl: body.receiptUrl ?? null,
      })
      .returning();

    if (body.type === "expense" && body.categoryId) {
      await checkBudgetThreshold(userId, body.categoryId, monthKey(body.date));
    }

    return NextResponse.json({ data: { ...tx, amount: Number(tx.amount) } }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
