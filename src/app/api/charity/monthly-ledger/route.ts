import { NextResponse } from "next/server";
import { getCharityLedger } from "@/lib/charity";
import { getCharityPayments, getAllTransactions } from "@/lib/redis";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [transactions, payments] = await Promise.all([
      getAllTransactions(),
      getCharityPayments(),
    ]);

    return NextResponse.json(getCharityLedger(transactions, payments));
  } catch (error) {
    console.error("Error getting monthly charity ledger:", error);
    return NextResponse.json({ error: "Failed to get monthly charity ledger" }, { status: 500 });
  }
}
