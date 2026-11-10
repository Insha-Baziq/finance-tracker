export type SummaryTransactionType = "payment" | "expense" | "refund";

export interface SummaryTransaction {
  type: SummaryTransactionType;
  status?: string;
  amount: number;
  grossAmount?: number;
  fees?: number;
  netAmount?: number;
  refundFor?: "payment" | "expense";
}

export function calculateCompletedNetRevenue(transactions: SummaryTransaction[]) {
  const completedPayments = transactions.filter((t) => t.type === "payment" && t.status === "Completed");
  const paymentRefunds = transactions.filter((t) => t.type === "refund" && t.refundFor === "payment");

  return completedPayments.reduce(
    (sum, payment) => sum + (payment.netAmount ?? (payment.grossAmount ?? payment.amount) - (payment.fees || 0)),
    0,
  ) - paymentRefunds.reduce((sum, refund) => sum + refund.amount, 0);
}

export function calculateDashboardSummary(transactions: SummaryTransaction[]) {
  const payments = transactions.filter((t) => t.type === "payment" && t.status === "Completed");
  const expenses = transactions.filter((t) => t.type === "expense");
  const paymentRefunds = transactions.filter((t) => t.type === "refund" && t.refundFor === "payment");
  const expenseRefunds = transactions.filter((t) => t.type === "refund" && t.refundFor === "expense");

  const totalGross = payments.reduce((sum, t) => sum + (t.grossAmount ?? t.amount), 0) - paymentRefunds.reduce((sum, t) => sum + t.amount, 0);
  const totalFees = payments.reduce(
    (sum, t) => sum + (t.fees ?? Math.max((t.grossAmount ?? t.amount) - (t.netAmount ?? t.amount), 0)),
    0,
  );
  const totalNet = calculateCompletedNetRevenue(transactions);
  const totalExpenses = expenses.reduce((sum, t) => sum + t.amount, 0) - expenseRefunds.reduce((sum, t) => sum + t.amount, 0);
  const netProfit = totalNet - totalExpenses;

  return {
    totalGross,
    totalFees,
    totalNet,
    totalExpenses,
    netProfit,
  };
}
