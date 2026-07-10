import { NextRequest, NextResponse } from "next/server";
import { subMonths } from "date-fns";
import { db } from "@/db";
import { handleApiError } from "@/lib/api-helpers";
import { requireCronSecret } from "@/lib/cron-auth";
import { getMonthlyTotals, getCategoryBreakdown } from "@/lib/reports";
import { sendTelegramMessage } from "@/lib/telegram/send";
import { formatRupiah } from "@/lib/telegram/format";
import { monthKey } from "@/lib/utils";

export const dynamic = "force-dynamic";

/** Sends every linked user their previous month's recap. Runs on the 1st via Vercel Cron. */
export async function GET(req: NextRequest) {
  try {
    requireCronSecret(req);

    const previousMonth = monthKey(subMonths(new Date(), 1));
    const links = await db.query.telegramLinks.findMany();
    let sent = 0;

    for (const link of links) {
      const totals = await getMonthlyTotals(link.userId, previousMonth);
      const topCategories = (await getCategoryBreakdown(link.userId, previousMonth, "expense")).slice(0, 5);

      const lines = [
        `🗓️ *Recap Bulanan (${previousMonth})*`,
        ``,
        `Pemasukan: ${formatRupiah(totals.income)}`,
        `Pengeluaran: ${formatRupiah(totals.expense)}`,
        `Selisih: ${formatRupiah(totals.net)}`,
      ];
      if (topCategories.length > 0) {
        lines.push("", "*Top 5 Kategori Pengeluaran:*");
        topCategories.forEach((c, i) => lines.push(`${i + 1}. ${c.name}: ${formatRupiah(c.total)}`));
      }

      await sendTelegramMessage(link.chatId, lines.join("\n"));
      sent++;
    }

    return NextResponse.json({ data: { sent } });
  } catch (error) {
    return handleApiError(error);
  }
}
