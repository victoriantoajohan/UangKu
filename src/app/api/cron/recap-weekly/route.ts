import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { handleApiError } from "@/lib/api-helpers";
import { requireCronSecret } from "@/lib/cron-auth";
import { getWeeklyTotals } from "@/lib/reports";
import { sendTelegramMessage } from "@/lib/telegram/send";
import { formatRupiah } from "@/lib/telegram/format";

export const dynamic = "force-dynamic";

/** Sends every linked user their weekly income/expense recap. Runs Monday mornings via Vercel Cron. */
export async function GET(req: NextRequest) {
  try {
    requireCronSecret(req);

    const links = await db.query.telegramLinks.findMany();
    let sent = 0;

    for (const link of links) {
      const totals = await getWeeklyTotals(link.userId);
      const message =
        `📅 *Recap Mingguan*\n\n` +
        `Pemasukan: ${formatRupiah(totals.income)}\n` +
        `Pengeluaran: ${formatRupiah(totals.expense)}\n` +
        `Selisih: ${formatRupiah(totals.net)}\n\n` +
        `Ketik /laporan untuk detail bulan ini.`;
      await sendTelegramMessage(link.chatId, message);
      sent++;
    }

    return NextResponse.json({ data: { sent } });
  } catch (error) {
    return handleApiError(error);
  }
}
