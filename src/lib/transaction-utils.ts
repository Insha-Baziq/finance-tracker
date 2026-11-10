export type TransactionKind = "payment" | "expense" | "refund";
export interface TransactionLike {
  id: string;
  type: TransactionKind;
  source?: string;
  orderDate?: string;
  clearingDate?: string;
  status?: string;
  username?: string;
  orderId?: string;
  grossAmount?: number;
  fees?: number;
  netAmount?: number;
  amount: number;
  category?: string;
  expenseName?: string;
  expenseDate?: string;
  refundFor?: "payment" | "expense";
  refundedTransactionId?: string;
  refundDate?: string;
  personalExpenseId?: string;
  personalExpenseOwner?: "baziq" | "insha";
  description: string;
  createdAt: string;
}
export function buildTransactionIndex(transactions: TransactionLike[]) {
  return new Map(transactions.map((transaction) => [transaction.id, transaction]));
}
export function getTransactionDate(transaction: TransactionLike): string | undefined {
  if (transaction.type === "payment") return transaction.orderDate;
  if (transaction.type === "refund") return transaction.refundDate;
  return transaction.expenseDate;
}
export function formatDateDmy(date?: string | Date): string {
  if (!date) return "-";
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return "-";
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  return `${day}/${month}/${d.getFullYear()}`;
}
export function formatTransactionDate(date?: string): string {
  if (!date) return "No date";
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
export function formatUsd(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}
export function getBaseTransactionLabel(transaction: TransactionLike): string {
  if (transaction.type === "payment") {
    const name = transaction.orderId || transaction.username || transaction.description || transaction.source || "Payment";
    return `${name} - ${formatTransactionDate(transaction.orderDate)} - ${formatUsd(transaction.amount)}`;
  }
  if (transaction.type === "expense") {
    const name = transaction.expenseName || transaction.description || transaction.category || "Expense";
    return `${name} - ${formatTransactionDate(transaction.expenseDate)} - ${formatUsd(transaction.amount)}`;
  }
  return transaction.description || "Refund";
}
export function getTransactionLabel(transaction: TransactionLike, index = new Map<string, TransactionLike>()): string {
  if (transaction.type !== "refund") return getBaseTransactionLabel(transaction);
  const original = transaction.refundedTransactionId ? index.get(transaction.refundedTransactionId) : undefined;
  if (!original) return transaction.description || `Refund for ${transaction.refundFor || "transaction"}`;
  return `Refund for ${getBaseTransactionLabel(original)}`;
}
export function getTransactionClient(
  transaction: TransactionLike,
  index = new Map<string, TransactionLike>()
): string | undefined {
  if (transaction.type === "payment") return transaction.username;
  if (transaction.type === "refund" && transaction.refundedTransactionId) {
    const original = index.get(transaction.refundedTransactionId);
    return original?.username;
  }
  return undefined;
}
export interface ClientStats {
  client: string;
  orders: number;
  gross: number;
  fees: number;
  net: number;
  refunds: number;
  earned: number;
  lastOrder?: string;
}
export function getClientStats(transactions: TransactionLike[]): ClientStats[] {
  const refundsByPayment = new Map<string, number>();
  for (const tx of transactions) {
    if (tx.type === "refund" && tx.refundFor === "payment" && tx.refundedTransactionId) {
      refundsByPayment.set(
        tx.refundedTransactionId,
        (refundsByPayment.get(tx.refundedTransactionId) || 0) + tx.amount
      );
    }
  }
  const stats = new Map<string, ClientStats>();
  for (const tx of transactions) {
    if (tx.type !== "payment" || !tx.username) continue;
    const entry =
      stats.get(tx.username) ||
      ({ client: tx.username, orders: 0, gross: 0, fees: 0, net: 0, refunds: 0, earned: 0 } as ClientStats);
    const gross = tx.grossAmount ?? tx.amount;
    const fees = tx.fees ?? Math.max(gross - (tx.netAmount ?? tx.amount), 0);
    const net = tx.netAmount ?? Math.max(tx.amount - fees, 0);
    entry.orders += 1;
    entry.gross += gross;
    entry.fees += fees;
    entry.net += net;
    const paymentRefunds = refundsByPayment.get(tx.id) || 0;
    entry.refunds += paymentRefunds;
    if (tx.status === "Completed") {
      entry.earned += net - paymentRefunds;
    }
    if (tx.orderDate && (!entry.lastOrder || tx.orderDate > entry.lastOrder)) {
      entry.lastOrder = tx.orderDate;
    }
    stats.set(tx.username, entry);
  }
  const result = Array.from(stats.values());
  result.sort((a, b) => b.earned - a.earned || a.client.localeCompare(b.client));
  return result;
}
export function getTransactionSearchText(transaction: TransactionLike, index = new Map<string, TransactionLike>()): string {
  const original = transaction.type === "refund" && transaction.refundedTransactionId
    ? index.get(transaction.refundedTransactionId)
    : undefined;
  const target = original || transaction;
  return [
    getTransactionLabel(transaction, index),
    target.source,
    target.orderId,
    target.username,
    target.category,
    target.expenseName,
    target.description,
    getTransactionDate(target),
    target.amount.toString(),
    formatUsd(target.amount),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}
export function filterTransactionsForPicker(
  transactions: TransactionLike[],
  type: "payment" | "expense",
  query: string,
  excludedId?: string
) {
  const index = buildTransactionIndex(transactions);
  const terms = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  return transactions.filter((transaction) => {
    if (transaction.type !== type) return false;
    if (excludedId && transaction.id === excludedId) return false;
    if (terms.length === 0) return true;
    const searchText = getTransactionSearchText(transaction, index);
    return terms.every((term) => searchText.includes(term));
  });
}
