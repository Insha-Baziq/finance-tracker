import { NextRequest, NextResponse } from "next/server";
import { getAllTransactions, getCharityPayments, updateTransaction, addNotification, addCharityMonthNotificationOnce } from "@/lib/redis";
import { CHARITY_START_MONTH, formatCharityCurrency, formatCharityMonth, getCharityLedger } from "@/lib/charity";
import { sendPushToSubscribers } from "@/lib/web-push";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getKarachiDateParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: "Asia/Karachi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  return {
    year: parts.find((part) => part.type === "year")?.value ?? "",
    month: parts.find((part) => part.type === "month")?.value ?? "",
    day: parts.find((part) => part.type === "day")?.value ?? "",
  };
}

function getPreviousMonth(monthKey: string) {
  const [year, month] = monthKey.split("-").map(Number);
  return month === 1
    ? `${year - 1}-12`
    : `${year}-${String(month - 1).padStart(2, "0")}`;
}

async function notifyClosedCharityMonth(now: Date) {
  const { year, month, day } = getKarachiDateParts(now);
  if (day !== "01") return false;

  const currentMonth = `${year}-${month}`;
  const closedMonth = getPreviousMonth(currentMonth);
  if (closedMonth < CHARITY_START_MONTH) return false;

  const [transactions, charityPayments] = await Promise.all([
    getAllTransactions(),
    getCharityPayments(),
  ]);
  const entry = getCharityLedger(transactions, charityPayments, now).monthlyLedger
    .find((allocation) => allocation.month === closedMonth);
  if (!entry) return false;

  const monthName = formatCharityMonth(closedMonth);
  const message = `${monthName} charity ledger is ready. 2% allocation: ${formatCharityCurrency(entry.allocation, "USD")}.`;
  const notification = await addCharityMonthNotificationOnce(closedMonth, message);
  if (!notification) return false;

  await sendPushToSubscribers({
    title: "Monthly charity ledger updated",
    body: message,
    url: "/charity/monthly-ledger",
    tag: `charity-ledger-${closedMonth}`,
  });
  return true;
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const transactions = await getAllTransactions();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let clearedCount = 0;

    for (const tx of transactions) {
      if (tx.type === "payment" && tx.status === "Clearing" && tx.clearingDate) {
        const clearingDate = new Date(tx.clearingDate);
        clearingDate.setHours(0, 0, 0, 0);
        
        if (clearingDate <= today) {
          await updateTransaction(tx.id, { status: "Completed" });
          
          await addNotification({
            transactionId: tx.id,
            type: "cleared",
            message: `Payment of $${tx.netAmount ?? tx.amount} from ${tx.username || tx.source} has been cleared!`,
          });

          const orderLabel = tx.orderId ? `Order ${tx.orderId}` : `Payment from ${tx.username || tx.source || "a client"}`;
          await sendPushToSubscribers({
            title: "Payment cleared",
            body: `${orderLabel} was cleared: $${(tx.netAmount ?? tx.amount).toFixed(2)}.`,
            url: `/transactions/${encodeURIComponent(tx.id)}`,
            tag: `payment-cleared-${tx.id}`,
          });
          
          clearedCount++;
        }
      }
    }

    const charityMonthAdded = await notifyClosedCharityMonth(new Date());

    return NextResponse.json({ success: true, clearedCount, charityMonthAdded });
  } catch (error) {
    console.error("Error running cron:", error);
    return NextResponse.json({ error: "Failed to run cron" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return POST(request);
}
