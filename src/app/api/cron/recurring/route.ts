import { NextRequest, NextResponse } from "next/server";
import { handleApiError } from "@/lib/api-helpers";
import { requireCronSecret } from "@/lib/cron-auth";
import { runDueRecurringTransactions } from "@/lib/recurring";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    requireCronSecret(req);
    const result = await runDueRecurringTransactions();
    return NextResponse.json({ data: result });
  } catch (error) {
    return handleApiError(error);
  }
}
