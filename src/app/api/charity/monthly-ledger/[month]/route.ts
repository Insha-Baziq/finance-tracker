import { NextRequest, NextResponse } from "next/server";
import { requireAuthenticatedRequest } from "@/lib/api-auth";
import { getCharityMonthBreakdown } from "@/lib/charity";
import { getAllTransactions } from "@/lib/redis";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ month: string }> },
) {
  const authResponse = requireAuthenticatedRequest(request);
  if (authResponse) return authResponse;

  const { month } = await params;
  if (!/^\d{4}-(?:0[1-9]|1[0-2])$/.test(month)) {
    return NextResponse.json({ error: "Invalid month" }, { status: 400 });
  }

  try {
    const transactions = await getAllTransactions();
    return NextResponse.json(getCharityMonthBreakdown(transactions, month));
  } catch (error) {
    console.error("Error getting monthly charity breakdown:", error);
    return NextResponse.json({ error: "Failed to get monthly charity breakdown" }, { status: 500 });
  }
}
