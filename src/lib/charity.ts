import type { TransactionLike } from "@/lib/transaction-utils";

export const CHARITY_RATE = 0.02;
export const CHARITY_START_MONTH = "2026-06";
export const CHARITY_TIME_ZONE = "Asia/Karachi";

export interface CharityPayment {
  id: string;
  amount: number;
  recipient: string;
  paidAt: string;
  notes?: string;
  createdAt: string;
}

export interface MonthlyCharityAllocation {
  month: string;
  grossAmount: number;
  platformFees: number;
  afterFees: number;
  paymentRefunds: number;
  taxExpenses: number;
  netAmount: number;
  allocation: number;
}

export type CharityAllocationStatus = "paid" | "partial" | "unpaid" | "no-allocation";

export interface MonthlyCharityLedgerEntry extends MonthlyCharityAllocation {
  paidAmount: number;
  outstanding: number;
  status: CharityAllocationStatus;
}

export type CharityBreakdownTransactionKind = "payment" | "payment-refund" | "tax-expense";

export interface CharityBreakdownTransaction {
  id: string;
  kind: CharityBreakdownTransactionKind;
  title: string;
  clientName?: string;
  date: string;
  source?: string;
  grossAmount?: number;
  platformFees?: number;
  countedAmount: number;
}

export interface CharityMonthBreakdown extends MonthlyCharityAllocation {
  transactions: CharityBreakdownTransaction[];
}

export interface CharityLedger {
  allocations: MonthlyCharityAllocation[];
  monthlyLedger: MonthlyCharityLedgerEntry[];
  totalAccrued: number;
  totalPaid: number;
  outstanding: number;
}

function monthKey(date: Date) {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: CHARITY_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
  }).formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  return `${year}-${month}`;
}

function nextMonthKey(key: string) {
  const [year, month] = key.split("-").map(Number);
  return month === 12
    ? `${year + 1}-01`
    : `${year}-${String(month + 1).padStart(2, "0")}`;
}

function transactionMonth(transaction: TransactionLike) {
  const date = transaction.type === "payment"
    ? transaction.clearingDate || transaction.orderDate
    : transaction.type === "refund"
      ? transaction.refundDate
      : transaction.expenseDate;
  return date?.slice(0, 7);
}

function isIncludedInCharityLedger(transaction: TransactionLike) {
  if (transaction.type === "payment") return transaction.status === "Completed";
  if (transaction.type === "refund") return transaction.refundFor === "payment";
  return isTaxExpense(transaction);
}

function roundCurrency(amount: number) {
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}

function isTaxExpense(transaction: TransactionLike) {
  return transaction.type === "expense" && /(^|[^a-z])tax(?:es)?([^a-z]|$)/i.test(transaction.category || "");
}

function getPaymentGross(payment: TransactionLike) {
  return payment.grossAmount ?? payment.amount;
}

function getPaymentFees(payment: TransactionLike) {
  return payment.fees ?? Math.max(getPaymentGross(payment) - (payment.netAmount ?? payment.amount), 0);
}

function calculateMonthlyAllocation(month: string, monthTransactions: TransactionLike[]): MonthlyCharityAllocation {
  const payments = monthTransactions.filter((transaction) => transaction.type === "payment");
  const paymentRefundTransactions = monthTransactions.filter((transaction) => transaction.type === "refund" && transaction.refundFor === "payment");
  const taxTransactions = monthTransactions.filter(isTaxExpense);

  const grossPayments = payments.reduce((total, payment) => total + getPaymentGross(payment), 0);
  const grossAmount = roundCurrency(grossPayments);
  const platformFees = roundCurrency(payments.reduce((total, payment) => total + getPaymentFees(payment), 0));
  const afterFees = roundCurrency(grossAmount - platformFees);
  const paymentRefunds = roundCurrency(paymentRefundTransactions.reduce((total, refund) => total + refund.amount, 0));
  const taxExpenses = roundCurrency(taxTransactions.reduce((total, expense) => total + expense.amount, 0));
  const netAmount = roundCurrency(afterFees - paymentRefunds - taxExpenses);
  const allocation = roundCurrency(Math.max(netAmount, 0) * CHARITY_RATE);

  return {
    month,
    grossAmount,
    platformFees,
    afterFees,
    paymentRefunds,
    taxExpenses,
    netAmount,
    allocation,
  };
}

function transactionTitle(transaction: TransactionLike, transactionsById: Map<string, TransactionLike>) {
  if (transaction.type === "payment") {
    return transaction.orderId || transaction.description || transaction.source || "Payment";
  }
  if (transaction.type === "expense") {
    return transaction.expenseName || transaction.description || transaction.category || "Tax expense";
  }

  const original = transaction.refundedTransactionId
    ? transactionsById.get(transaction.refundedTransactionId)
    : undefined;
  if (original?.type === "payment") {
    return `Refund for ${original.orderId || original.username || original.description || "payment"}`;
  }
  if (original?.type === "expense") {
    return `Refund for ${original.expenseName || original.description || original.category || "expense"}`;
  }
  return transaction.description || `Refund for ${transaction.refundFor || "transaction"}`;
}

function getBreakdownTransaction(
  transaction: TransactionLike,
  transactionsById: Map<string, TransactionLike>,
): CharityBreakdownTransaction {
  const date = transaction.type === "payment"
    ? transaction.clearingDate || transaction.orderDate || ""
    : transaction.type === "refund"
      ? transaction.refundDate || ""
      : transaction.expenseDate || "";
  const title = transactionTitle(transaction, transactionsById);
  const original = transaction.type === "refund" && transaction.refundedTransactionId
    ? transactionsById.get(transaction.refundedTransactionId)
    : undefined;

  if (transaction.type === "payment") {
    const grossAmount = getPaymentGross(transaction);
    const platformFees = getPaymentFees(transaction);
    return {
      id: transaction.id,
      kind: "payment",
      title,
      clientName: transaction.username,
      date,
      source: transaction.source,
      grossAmount,
      platformFees,
      countedAmount: grossAmount - platformFees,
    };
  }

  if (transaction.type === "refund") {
    return {
      id: transaction.id,
      kind: "payment-refund",
      title,
      clientName: original?.type === "payment" ? original.username : undefined,
      date,
      source: original?.type === "payment" ? original.source : undefined,
      countedAmount: transaction.refundFor === "payment" ? -transaction.amount : transaction.amount,
    };
  }

  return {
    id: transaction.id,
    kind: "tax-expense",
    title,
    date,
    countedAmount: -transaction.amount,
  };
}

export function getCharityLedger(
  transactions: TransactionLike[],
  charityPayments: CharityPayment[],
  now = new Date(),
): CharityLedger {
  const currentMonth = monthKey(now);
  const transactionsByMonth = new Map<string, TransactionLike[]>();

  for (const transaction of transactions) {
    if (!isIncludedInCharityLedger(transaction)) continue;

    const month = transactionMonth(transaction);
    if (!month || month < CHARITY_START_MONTH || month >= currentMonth) continue;
    const monthTransactions = transactionsByMonth.get(month) || [];
    monthTransactions.push(transaction);
    transactionsByMonth.set(month, monthTransactions);
  }

  const allocations: MonthlyCharityAllocation[] = [];
  for (let month = CHARITY_START_MONTH; month < currentMonth; month = nextMonthKey(month)) {
    const monthTransactions = transactionsByMonth.get(month) || [];
    allocations.push(calculateMonthlyAllocation(month, monthTransactions));
  }

  const totalAccrued = allocations.reduce((total, entry) => total + entry.allocation, 0);
  const totalPaid = charityPayments.reduce((total, payment) => total + payment.amount, 0);
  let unappliedPayments = totalPaid;
  const monthlyLedger = allocations.map((entry): MonthlyCharityLedgerEntry => {
    const paidAmount = Math.min(entry.allocation, Math.max(unappliedPayments, 0));
    unappliedPayments = Math.max(0, unappliedPayments - entry.allocation);
    const outstanding = Math.max(0, entry.allocation - paidAmount);

    return {
      ...entry,
      paidAmount,
      outstanding,
      status: entry.allocation <= 0
        ? "no-allocation"
        : outstanding <= 0.005
          ? "paid"
          : paidAmount > 0
            ? "partial"
            : "unpaid",
    };
  });

  return {
    allocations,
    monthlyLedger,
    totalAccrued,
    totalPaid,
    outstanding: Math.max(0, totalAccrued - totalPaid),
  };
}

export function getCharityMonthBreakdown(transactions: TransactionLike[], month: string): CharityMonthBreakdown {
  const monthTransactions = transactions.filter(
    (transaction) => isIncludedInCharityLedger(transaction) && transactionMonth(transaction) === month,
  );
  const transactionsById = new Map(transactions.map((transaction) => [transaction.id, transaction]));
  const allocation = calculateMonthlyAllocation(month, monthTransactions);
  const breakdown = monthTransactions
    .map((transaction) => getBreakdownTransaction(transaction, transactionsById))
    .sort((a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title));

  return { ...allocation, transactions: breakdown };
}

export function formatCharityMonth(month: string) {
  const [year, number] = month.split("-").map(Number);
  return new Date(year, number - 1, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

export function formatCharityCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}
