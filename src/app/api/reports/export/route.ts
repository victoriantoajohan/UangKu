import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq, gte, lt } from "drizzle-orm";
import { db } from "@/db";
import { transactions } from "@/db/schema";
import { requireUserId, handleApiError } from "@/lib/api-helpers";
import { monthSchema } from "@/lib/validations/budget";
import { monthKey } from "@/lib/utils";
import { monthRange } from "@/lib/reports";

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export async function GET(req: NextRequest) {
  try {
    const userId = await requireUserId();
    const { searchParams } = new URL(req.url);
    const month = monthSchema.parse(searchParams.get("month") ?? monthKey());
    const { from, to } = monthRange(month);

    const rows = await db.query.transactions.findMany({
      where: and(
        eq(transactions.userId, userId),
        gte(transactions.date, from),
        lt(transactions.date, to)
      ),
      orderBy: [desc(transactions.date)],
      with: { wallet: true, category: true },
    });

    const header = ["Tanggal", "Tipe", "Dompet", "Kategori", "Jumlah", "Catatan", "Sumber"];
    const lines = [header.join(",")];

    for (const tx of rows) {
      lines.push(
        [
          new Date(tx.date).toISOString().slice(0, 10),
          tx.type,
          tx.wallet?.name ?? "",
          tx.category?.name ?? "",
          Number(tx.amount).toString(),
          tx.note ?? "",
          tx.source,
        ]
          .map((v) => csvEscape(String(v)))
          .join(",")
      );
    }

    return new NextResponse(lines.join("\n"), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="uangku-${month}.csv"`,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
