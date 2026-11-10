import { Redis } from "@upstash/redis";
import { calculateDashboardSummary } from "./summary";
import type { CharityPayment } from "./charity";
import type { PersonalExpense } from "./reimbursements";
export type TransactionType = "payment" | "expense" | "refund";
export type PaymentSource = "fiverr" | "upwork" | "bank";
export interface Transaction {
  id: string;
  type: TransactionType;
  source?: PaymentSource;
  // Fiverr-specific fields
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
export interface Category {
  id: string;
  name: string;
  createdAt: string;
}
export interface Settings {
  exchangeRate: number;
  currency: "USD" | "PKR";
}
// Create Redis client - will use env vars when available
export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || "https://placeholder.upstash.io",
  token: process.env.UPSTASH_REDIS_REST_TOKEN || "placeholder-token",
});
// Helper functions for transactions
export const KEYS = {
  TRANSACTIONS: "transactions",
  CATEGORIES: "categories",
  SETTINGS: "settings",
  NOTIFICATIONS: "notifications",
  CHARITY_PAYMENTS: "charity_payments",
  PUSH_SUBSCRIPTIONS: "push_subscriptions",
  PERSONAL_EXPENSES: "personal_expenses",
  PERSONAL_EXPENSES_LOCK: "personal_expenses:write_lock",
} as const;
export async function getAllTransactions(): Promise<Transaction[]> {
  const data = await redis.get<Transaction[]>(KEYS.TRANSACTIONS);
  return data || [];
}
export async function addTransaction(
  transaction: Omit<Transaction, "id" | "createdAt">
): Promise<Transaction> {
  const transactions = await getAllTransactions();
  const newTransaction: Transaction = {
    ...transaction,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };
  transactions.push(newTransaction);
  await redis.set(KEYS.TRANSACTIONS, transactions);
  return newTransaction;
}
export async function saveAllTransactions(transactions: Transaction[]): Promise<void> {
  await redis.set(KEYS.TRANSACTIONS, transactions);
}
export async function getAllPersonalExpenses(): Promise<PersonalExpense[]> {
  const data = await redis.get<PersonalExpense[]>(KEYS.PERSONAL_EXPENSES);
  return data || [];
}
export async function addPersonalExpense(
  expense: Omit<PersonalExpense, "id" | "createdAt" | "status" | "paidAt" | "reimbursementTransactionId">
): Promise<PersonalExpense> {
  const expenses = await getAllPersonalExpenses();
  const newExpense: PersonalExpense = {
    ...expense,
    id: crypto.randomUUID(),
    status: "pending",
    createdAt: new Date().toISOString(),
  };
  expenses.unshift(newExpense);
  await redis.set(KEYS.PERSONAL_EXPENSES, expenses);
  return newExpense;
}
export async function saveAllPersonalExpenses(expenses: PersonalExpense[]): Promise<void> {
  await redis.set(KEYS.PERSONAL_EXPENSES, expenses);
}
export async function withPersonalExpensesLock<T>(operation: () => Promise<T>): Promise<T> {
  const token = crypto.randomUUID();
  const lock = await redis.set(KEYS.PERSONAL_EXPENSES_LOCK, token, { nx: true, ex: 60 });
  if (lock !== "OK") {
    throw new Error("Personal ledger is being updated. Try again in a moment.");
  }
  try {
    return await operation();
  } finally {
    try {
      await redis.eval(
        "if redis.call('GET', KEYS[1]) == ARGV[1] then return redis.call('DEL', KEYS[1]) else return 0 end",
        [KEYS.PERSONAL_EXPENSES_LOCK],
        [token],
      );
    } catch (error) {
      console.error("Could not release personal expense write lock:", error);
    }
  }
}
export async function deleteTransaction(id: string): Promise<void> {
  const transactions = await getAllTransactions();
  const filtered = transactions.filter((t) => t.id !== id);
  await redis.set(KEYS.TRANSACTIONS, filtered);
}
export async function updateTransaction(id: string, updates: Partial<Transaction>): Promise<Transaction | null> {
  const transactions = await getAllTransactions();
  const index = transactions.findIndex((t) => t.id === id);
  if (index === -1) return null;
  
  transactions[index] = { ...transactions[index], ...updates };
  await redis.set(KEYS.TRANSACTIONS, transactions);
  return transactions[index];
}
export interface Notification {
  id: string;
  transactionId?: string;
  type: "cleared" | "charity-month-added";
  message: string;
  createdAt: string;
  read: boolean;
  month?: string;
}
export async function getNotifications(): Promise<Notification[]> {
  const data = await redis.get<Notification[]>(KEYS.NOTIFICATIONS);
  return data || [];
}
export async function addNotification(notification: Omit<Notification, "id" | "createdAt" | "read">): Promise<Notification> {
  const notifications = await getNotifications();
  const newNotification: Notification = {
    ...notification,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    read: false,
  };
  notifications.unshift(newNotification);
  await redis.set(KEYS.NOTIFICATIONS, notifications);
  return newNotification;
}
export async function addCharityMonthNotificationOnce(month: string, message: string): Promise<Notification | null> {
  const markerKey = `charity_month_notification:${month}`;
  const claimed = await redis.set(markerKey, "1", { nx: true });
  if (claimed !== "OK") return null;
  try {
    return await addNotification({ type: "charity-month-added", month, message });
  } catch (error) {
    await redis.del(markerKey);
    throw error;
  }
}
export interface StoredPushSubscription {
  endpoint: string;
  expirationTime?: number | null;
  keys: {
    p256dh: string;
    auth: string;
  };
}
export async function getPushSubscriptions(): Promise<StoredPushSubscription[]> {
  const data = await redis.get<StoredPushSubscription[]>(KEYS.PUSH_SUBSCRIPTIONS);
  return data || [];
}
export async function savePushSubscription(subscription: StoredPushSubscription): Promise<void> {
  const subscriptions = await getPushSubscriptions();
  const existingIndex = subscriptions.findIndex((item) => item.endpoint === subscription.endpoint);
  if (existingIndex === -1) subscriptions.push(subscription);
  else subscriptions[existingIndex] = subscription;
  await redis.set(KEYS.PUSH_SUBSCRIPTIONS, subscriptions);
}
export async function removePushSubscription(endpoint: string): Promise<void> {
  const subscriptions = await getPushSubscriptions();
  await redis.set(KEYS.PUSH_SUBSCRIPTIONS, subscriptions.filter((item) => item.endpoint !== endpoint));
}
export async function markNotificationRead(id: string): Promise<void> {
  const notifications = await getNotifications();
  const index = notifications.findIndex((n) => n.id === id);
  if (index !== -1) {
    notifications[index].read = true;
    await redis.set(KEYS.NOTIFICATIONS, notifications);
  }
}
export async function markAllNotificationsRead(): Promise<void> {
  const notifications = await getNotifications();
  notifications.forEach((n) => (n.read = true));
  await redis.set(KEYS.NOTIFICATIONS, notifications);
}
export async function getAllCategories(): Promise<Category[]> {
  const data = await redis.get<Category[]>(KEYS.CATEGORIES);
  if (!data || data.length === 0) {
    // Return default categories
    const defaults: Category[] = [
      { id: "1", name: "Subscription", createdAt: new Date().toISOString() },
      { id: "2", name: "Tools", createdAt: new Date().toISOString() },
      { id: "3", name: "Services", createdAt: new Date().toISOString() },
      { id: "4", name: "Other", createdAt: new Date().toISOString() },
    ];
    await redis.set(KEYS.CATEGORIES, defaults);
    return defaults;
  }
  return data;
}
export async function addCategory(name: string): Promise<Category> {
  const categories = await getAllCategories();
  const newCategory: Category = {
    id: crypto.randomUUID(),
    name,
    createdAt: new Date().toISOString(),
  };
  categories.push(newCategory);
  await redis.set(KEYS.CATEGORIES, categories);
  return newCategory;
}
export async function deleteCategory(id: string): Promise<void> {
  const categories = await getAllCategories();
  const filtered = categories.filter((c) => c.id !== id);
  await redis.set(KEYS.CATEGORIES, filtered);
}
export async function getSettings(): Promise<Settings> {
  const data = await redis.get<Settings>(KEYS.SETTINGS);
  return data || { exchangeRate: 280, currency: "USD" };
}
export async function updateSettings(settings: Partial<Settings>): Promise<Settings> {
  const current = await getSettings();
  const updated = { ...current, ...settings };
  await redis.set(KEYS.SETTINGS, updated);
  return updated;
}
export async function getCharityPayments(): Promise<CharityPayment[]> {
  const data = await redis.get<CharityPayment[]>(KEYS.CHARITY_PAYMENTS);
  return data || [];
}
export async function addCharityPayment(
  payment: Omit<CharityPayment, "id" | "createdAt">,
): Promise<CharityPayment> {
  const payments = await getCharityPayments();
  const newPayment: CharityPayment = {
    ...payment,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };
  payments.unshift(newPayment);
  await redis.set(KEYS.CHARITY_PAYMENTS, payments);
  return newPayment;
}
export async function updateCharityPayment(
  id: string,
  updates: Partial<Omit<CharityPayment, "id" | "createdAt">>,
): Promise<CharityPayment | null> {
  const payments = await getCharityPayments();
  const index = payments.findIndex((payment) => payment.id === id);
  if (index < 0) return null;
  const updatedPayment = { ...payments[index], ...updates };
  payments[index] = updatedPayment;
  await redis.set(KEYS.CHARITY_PAYMENTS, payments);
  return updatedPayment;
}
// Calculate summary stats
export function calculateSummary(transactions: Transaction[]) {
  return calculateDashboardSummary(transactions);
}
