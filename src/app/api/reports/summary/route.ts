import { NextResponse } from "next/server";
import { requireUserId, handleApiError } from "@/lib/api-helpers";
import { getDashboardSummary } from "@/lib/reports";

export async function GET() {
  try {
    const userId = await requireUserId();
    const data = await getDashboardSummary(userId);
    return NextResponse.json({ data });
  } catch (error) {
    return handleApiError(error);
  }
}
