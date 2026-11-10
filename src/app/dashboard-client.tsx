"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Banknote,
  BadgePercent,
  Bell,
  CalendarDays,
  ChevronRight,
  CircleDollarSign,
  ReceiptText,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import {
  Bar,
  BarChart,
  Label,
  Pie,
  PieChart,
} from "recharts";
import { useCurrency } from "@/components/currency-provider";
import { AdminCnMark } from "@/components/admincn-mark";
import { DataTable, SortableColumnHeader } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CharityReserveCard } from "@/components/charity-reserve-card";
import { useCharityPayments } from "@/components/use-charity-payments";
import { calculateDashboardSummary } from "@/lib/summary";
import { formatDateDmy, getTransactionDate } from "@/lib/transaction-utils";

interface Transaction {
  id: string;
  type: "payment" | "expense" | "refund";
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
  description: string;
  createdAt: string;
}

interface Notification {
  id: string;
  transactionId?: string;
  type: string;
  message: string;
  createdAt: string;
  read: boolean;
  month?: string;
}

type FilterType = "all" | "thisMonth" | "last30" | "thisYear" | "custom";

const chartConfig = {
  expenses: { label: "Expenses", color: "color-mix(in oklab, var(--primary) 10%, transparent)" },
  fiverr: { label: "Fiverr", color: "var(--primary)" },
  upwork: { label: "Upwork", color: "color-mix(in oklab, var(--primary) 60%, transparent)" },
  bank: { label: "Bank transfer", color: "color-mix(in oklab, var(--primary) 20%, transparent)" },
  noIncome: { label: "No income", color: "var(--muted)" },
  orders: { label: "Completed payments", color: "var(--primary)" },
};

type Comparison = {
  value: string;
  note: string;
  direction: "up" | "down" | null;
};

function getComparison(current: number, previous: number | null): Comparison {
  if (previous === null) return { value: "", note: "All recorded activity", direction: null };
  if (previous === 0) {
    return current === 0
      ? { value: "0%", note: "than previous period", direction: "up" }
      : { value: "New", note: "vs previous period", direction: "up" };
  }

  const percentage = Math.round(((current - previous) / Math.abs(previous)) * 100);
  return {
    value: `${percentage > 0 ? "+" : ""}${percentage}%`,
    note: "than previous period",
    direction: percentage < 0 ? "down" : "up",
  };
}

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(amount);
}

function percentageOf(amount: number, base: number) {
  if (base <= 0) return "—";
  const percentage = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }).format((amount / base) * 100);
  return `${percentage}%`;
}

function getDisplayDate(tx: Transaction) {
  return getTransactionDate(tx) || tx.createdAt.slice(0, 10);
}

function getTransactionTitle(tx: Transaction) {
  if (tx.type === "payment") return tx.orderId || tx.description || tx.username || "Payment";
  if (tx.type === "expense") return tx.expenseName || tx.description || "Expense";
  return tx.description || `${tx.refundFor === "payment" ? "Payment" : "Expense"} refund`;
}

function getMonthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function formatCompactCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(amount);
}

export default function DashboardClient() {
  const router = useRouter();
  const { currency, convert } = useCurrency();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [filterType, setFilterType] = useState<FilterType>("all");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const charityPayments = useCharityPayments();

  const fetchData = useCallback(async () => {
    try {
      fetch("/api/cron", { method: "POST" }).catch(console.error);
      const [txRes, notifRes] = await Promise.all([
        fetch("/api/transactions"),
        fetch("/api/notifications"),
      ]);
      const [txData, notifData] = await Promise.all([txRes.json(), notifRes.json()]);
      setTransactions(txData);
      setNotifications(notifData);
    } catch (error) {
      console.error("Error loading dashboard data:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const markAsRead = async (id: string) => {
    await fetch("/api/notifications", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    void fetchData();
  };

  const openNotification = async (notification: Notification) => {
    await markAsRead(notification.id);
    if (notification.type === "charity-month-added") {
      setShowNotifications(false);
      router.push("/charity/monthly-ledger");
    }
  };

  const markAllAsRead = async () => {
    await fetch("/api/notifications", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markAllRead: true }),
    });
    void fetchData();
  };

  const dateRange = useMemo((): { start: number; end: number } | null => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    switch (filterType) {
      case "thisMonth":
        return {
          start: new Date(now.getFullYear(), now.getMonth(), 1).getTime(),
          end: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).getTime(),
        };
      case "last30":
        return { start: today.getTime() - 30 * 24 * 60 * 60 * 1000, end: now.getTime() };
      case "thisYear":
        return {
          start: new Date(now.getFullYear(), 0, 1).getTime(),
          end: new Date(now.getFullYear(), 11, 31, 23, 59, 59).getTime(),
        };
      case "custom":
        if (customStartDate && customEndDate) {
          return {
            start: new Date(`${customStartDate}T00:00:00`).getTime(),
            end: new Date(`${customEndDate}T23:59:59`).getTime(),
          };
        }
        return null;
      default:
        return null;
    }
  }, [customEndDate, customStartDate, filterType]);

  const filteredTransactions = useMemo(() => transactions.filter((tx) => {
    if (!dateRange) return true;
    const txDate = new Date(`${getDisplayDate(tx)}T00:00:00`).getTime();
    return txDate >= dateRange.start && txDate <= dateRange.end;
  }), [dateRange, transactions]);

  const totals = useMemo(() => calculateDashboardSummary(filteredTransactions), [filteredTransactions]);
  const expenseCount = filteredTransactions.filter((tx) => tx.type === "expense").length;
  const unreadCount = notifications.filter((notification) => !notification.read).length;

  const comparisonRange = useMemo(() => {
    if (!dateRange) return null;
    const duration = Math.max(dateRange.end - dateRange.start, 1);
    return { start: dateRange.start - duration, end: dateRange.start - 1 };
  }, [dateRange]);

  const comparisonTransactions = useMemo(() => {
    if (!comparisonRange) return null;
    return transactions.filter((tx) => {
      const txDate = new Date(`${getDisplayDate(tx)}T00:00:00`).getTime();
      return txDate >= comparisonRange.start && txDate <= comparisonRange.end;
    });
  }, [comparisonRange, transactions]);

  const comparisonTotals = useMemo(
    () => comparisonTransactions ? calculateDashboardSummary(comparisonTransactions) : null,
    [comparisonTransactions],
  );
  const recentTransactions = useMemo(() => [...filteredTransactions]
    .filter((tx) => tx.type !== "payment" || tx.status === "Completed")
    .sort((a, b) => getDisplayDate(b).localeCompare(getDisplayDate(a)))
    .slice(0, 6), [filteredTransactions]);

  const recentColumns = useMemo<ColumnDef<Transaction>[]>(() => [
    {
      id: "date",
      accessorFn: (tx) => getDisplayDate(tx),
      header: ({ column }) => <SortableColumnHeader label="Date" column={column} />,
      cell: ({ row }) => <span className="whitespace-nowrap text-sm text-muted-foreground">{formatDateDmy(getDisplayDate(row.original))}</span>,
    },
    {
      id: "description",
      accessorFn: (tx) => getTransactionTitle(tx),
      header: "Description",
      cell: ({ row }) => <span className="block max-w-[220px] truncate text-sm font-medium">{getTransactionTitle(row.original)}</span>,
    },
    {
      id: "client",
      accessorFn: (tx) => tx.type === "payment" ? (tx.username || tx.source || "Payment") : tx.type === "expense" ? (tx.category || "Expense") : `Refund for ${tx.refundFor || "transaction"}`,
      header: "Client / category",
      cell: ({ getValue }) => <span className="block max-w-[180px] truncate text-sm text-muted-foreground">{String(getValue())}</span>,
    },
    {
      id: "type",
      accessorKey: "type",
      header: "Type",
      cell: ({ row }) => <Badge variant="secondary" className="capitalize">{row.original.type}</Badge>,
    },
    {
      id: "netAmount",
      accessorFn: (tx) => tx.type === "payment" ? (tx.netAmount ?? tx.amount - (tx.fees || 0)) : tx.amount,
      header: ({ column }) => <SortableColumnHeader label="Net amount" column={column} />,
      cell: ({ row, getValue }) => {
        const tx = row.original;
        const positive = tx.type === "payment" || (tx.type === "refund" && tx.refundFor === "expense");
        return <span className={`whitespace-nowrap text-sm font-semibold tabular-nums ${positive ? "text-foreground" : "text-muted-foreground"}`}>{positive ? "+" : "−"}{formatCurrency(convert(Number(getValue())), currency)}</span>;
      },
    },
  ], [convert, currency]);

  const monthlyInsightData = useMemo(() => {
    const now = new Date();
    const months = Array.from({ length: 5 }, (_, index) => new Date(now.getFullYear(), now.getMonth() - 4 + index, 1));
    const monthMap = new Map(months.map((date) => [getMonthKey(date), {
      month: date.toLocaleDateString("en-US", { month: "short" }),
      orders: 0,
      expenses: 0,
    }]));

    transactions.forEach((tx) => {
      const date = new Date(`${getDisplayDate(tx)}T00:00:00`);
      const row = monthMap.get(getMonthKey(date));
      if (!row) return;
      if (tx.type === "payment" && tx.status === "Completed") row.orders += 1;
      else if (tx.type === "expense") row.expenses += tx.amount;
      else if (tx.type === "refund" && tx.refundFor === "expense") row.expenses -= tx.amount;
    });

    return months.map((date) => monthMap.get(getMonthKey(date))!);
  }, [transactions]);

  const sourceBreakdown = useMemo(() => {
    const totalsBySource = new Map<string, number>([
      ["fiverr", 0],
      ["upwork", 0],
      ["bank", 0],
    ]);
    const paymentsById = new Map(
      transactions
        .filter((tx) => tx.type === "payment")
        .map((tx) => [tx.id, tx]),
    );

    filteredTransactions.forEach((tx) => {
      if (tx.type === "payment" && tx.status === "Completed") {
        const source = tx.source === "upwork" || tx.source === "bank" ? tx.source : "fiverr";
        totalsBySource.set(source, (totalsBySource.get(source) || 0) + (tx.netAmount ?? tx.amount - (tx.fees || 0)));
      } else if (tx.type === "refund" && tx.refundFor === "payment" && tx.refundedTransactionId) {
        const originalPayment = paymentsById.get(tx.refundedTransactionId);
        if (!originalPayment || originalPayment.status !== "Completed") return;
        const source = originalPayment.source === "upwork" || originalPayment.source === "bank" ? originalPayment.source : "fiverr";
        totalsBySource.set(source, (totalsBySource.get(source) || 0) - tx.amount);
      }
    });

    return [
      { source: "fiverr", label: "Fiverr", amount: Math.max(0, totalsBySource.get("fiverr") || 0), color: "var(--color-fiverr)", fill: "var(--color-fiverr)" },
      { source: "upwork", label: "Upwork", amount: Math.max(0, totalsBySource.get("upwork") || 0), color: "var(--color-upwork)", fill: "var(--color-upwork)" },
      { source: "bank", label: "Bank transfer", amount: Math.max(0, totalsBySource.get("bank") || 0), color: "var(--color-bank)", fill: "var(--color-bank)" },
    ].filter((entry) => entry.amount > 0);
  }, [filteredTransactions, transactions]);
  const grossChange = getComparison(totals.totalGross, comparisonTotals?.totalGross ?? null);
  const incomeChange = getComparison(totals.totalNet, comparisonTotals?.totalNet ?? null);
  const incomeTotal = sourceBreakdown.reduce((total, entry) => total + entry.amount, 0);
  const monthlyPaymentCount = monthlyInsightData.reduce((total, month) => total + month.orders, 0);
  const monthlyExpenseTotal = monthlyInsightData.reduce((total, month) => total + Math.max(month.expenses, 0), 0);

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="flex justify-end"><div className="h-9 w-40 rounded-md bg-muted" /></div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">{Array.from({ length: 5 }, (_, i) => <div key={i} className="h-36 rounded-xl bg-muted" />)}</div>
        <div className="grid gap-6 xl:grid-cols-2"><div className="h-72 rounded-xl bg-muted" /><div className="h-96 rounded-xl bg-muted" /></div>
        <div className="h-[520px] rounded-xl bg-muted" />
      </div>
    );
  }

  const metricCards: MetricCardProps[] = [
    { label: "Gross revenue", value: formatCurrency(convert(totals.totalGross), currency), note: "Before platform fees · after refunds", change: grossChange, icon: CircleDollarSign },
    {
      label: "Platform fees",
      value: formatCurrency(convert(totals.totalFees), currency),
      note: `${percentageOf(totals.totalFees, totals.totalGross)} of gross revenue`,
      icon: BadgePercent,
    },
    { label: "Net income", value: formatCurrency(convert(totals.totalNet), currency), note: "After platform fees and refunds", change: incomeChange, icon: Wallet },
    {
      label: "Expenses",
      value: formatCurrency(convert(totals.totalExpenses), currency),
      note: `${expenseCount.toLocaleString()} ${expenseCount === 1 ? "expense" : "expenses"} · ${percentageOf(totals.totalExpenses, totals.totalNet)} of net income`,
      icon: ReceiptText,
      tone: "destructive",
    },
    {
      label: "Profit",
      value: formatCurrency(convert(totals.netProfit), currency),
      note: `${percentageOf(totals.netProfit, totals.totalNet)} of net income`,
      icon: Banknote,
      tone: totals.netProfit < 0 ? "destructive" : "default",
    },
  ];

  return (
    <div className="space-y-6 pb-8">
      <section className="flex items-center justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" className="gap-2" onClick={() => setShowNotifications((show) => !show)}>
          <Bell className="size-4" /> Notifications
          {unreadCount > 0 && <Badge variant="secondary" className="h-5 min-w-5 justify-center px-1 text-[10px]">{unreadCount}</Badge>}
        </Button>
        <Select value={filterType} onValueChange={(value) => setFilterType(value as FilterType)}>
          <SelectTrigger className="h-9 w-[150px]"><CalendarDays className="mr-1 size-4 text-muted-foreground" /><SelectValue placeholder="Period" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All time</SelectItem>
            <SelectItem value="thisMonth">This month</SelectItem>
            <SelectItem value="last30">Last 30 days</SelectItem>
            <SelectItem value="thisYear">This year</SelectItem>
            <SelectItem value="custom">Custom range</SelectItem>
          </SelectContent>
        </Select>
      </section>

      {showNotifications && (
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0 py-4">
            <div><CardTitle className="text-base">Notifications</CardTitle><p className="mt-1 text-xs text-muted-foreground">Recent account activity</p></div>
            {unreadCount > 0 && <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={markAllAsRead}>Mark all read</Button>}
          </CardHeader>
          <CardContent className="pt-0">
            {notifications.length === 0 ? <p className="py-5 text-center text-sm text-muted-foreground">You’re all caught up.</p> : (
              <div className="divide-y">
                {notifications.slice(0, 6).map((notification) => (
                  <button key={notification.id} type="button" className="flex w-full items-start gap-3 py-3 text-left transition-colors hover:bg-muted/40" onClick={() => void openNotification(notification)}>
                    <span className={`mt-1 size-2 shrink-0 rounded-full ${notification.read ? "bg-muted-foreground/30" : "bg-primary"}`} />
                    <span className="min-w-0 flex-1"><span className="block text-sm">{notification.message}</span><span className="mt-1 block text-xs text-muted-foreground">{formatDateDmy(notification.createdAt)}</span></span>
                    {!notification.read && <Badge variant="secondary" className="text-[10px]">New</Badge>}
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {filterType === "custom" && (
        <div className="flex flex-col gap-2 rounded-xl border bg-card p-4 sm:flex-row sm:items-center sm:gap-3">
          <span className="text-sm font-medium">Choose a date range</span>
          <Input aria-label="Start date" type="date" value={customStartDate} onChange={(event) => setCustomStartDate(event.target.value)} className="h-9 w-full bg-background sm:w-40" />
          <span className="text-xs text-muted-foreground">to</span>
          <Input aria-label="End date" type="date" value={customEndDate} onChange={(event) => setCustomEndDate(event.target.value)} className="h-9 w-full bg-background sm:w-40" />
        </div>
      )}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {metricCards.map((metric) => <MetricCard key={metric.label} {...metric} />)}
      </section>

      <CharityReserveCard
        transactions={transactions}
        payments={charityPayments.payments}
        paymentsLoading={charityPayments.isLoading}
        paymentsError={charityPayments.error}
        onRetry={() => void charityPayments.refresh()}
        onPaymentRecorded={charityPayments.addPayment}
      />

      <section className="grid gap-6 xl:grid-cols-2">
        <ProductInsightsCard
          monthlyData={monthlyInsightData}
          orderCount={monthlyPaymentCount}
          expenseTotal={monthlyExpenseTotal}
          currency={currency}
          convert={convert}
        />
        <IncomeBySourceCard
          sourceBreakdown={sourceBreakdown}
          incomeTotal={incomeTotal}
          currency={currency}
          convert={convert}
        />
      </section>

      <section>
        <div className="hidden md:block">
          <DataTable
            columns={recentColumns}
            data={recentTransactions}
            initialSorting={[{ id: "date", desc: true }]}
            pageSize={6}
            onRowClick={(tx) => router.push(`/transactions/${tx.id}`)}
            emptyTitle="No recent transactions"
            emptyDescription="Add a transaction to see your financial activity here."
            toolbar={(
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold">Recent transactions</h2>
                  <p className="mt-1 text-sm text-muted-foreground">Latest records in the selected period.</p>
                </div>
                <Button variant="ghost" size="sm" asChild className="gap-1">
                  <Link href="/transactions">All transactions <ChevronRight className="size-4" /></Link>
                </Button>
              </div>
            )}
          />
        </div>

        <div className="space-y-3 md:hidden">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <h2 className="text-base font-semibold">Recent transactions</h2>
              <p className="mt-1 text-sm text-muted-foreground">Latest records in the selected period.</p>
            </div>
            <Button variant="ghost" size="sm" asChild className="shrink-0 gap-1 px-2">
              <Link href="/transactions">All <ChevronRight className="size-4" /></Link>
            </Button>
          </div>
          {recentTransactions.length === 0 ? (
            <Card><CardContent className="py-10 text-center"><p className="font-medium">No recent transactions</p><p className="mt-1 text-sm text-muted-foreground">Add a transaction to see your financial activity here.</p></CardContent></Card>
          ) : recentTransactions.map((tx) => {
            const positive = tx.type === "payment" || (tx.type === "refund" && tx.refundFor === "expense");
            const amount = tx.type === "payment" ? (tx.netAmount ?? tx.amount - (tx.fees || 0)) : tx.amount;
            const context = tx.type === "payment"
              ? tx.username || tx.source || "Payment"
              : tx.type === "expense"
                ? tx.category || "Expense"
                : `Refund for ${tx.refundFor || "transaction"}`;

            return (
              <button key={tx.id} type="button" className="w-full rounded-xl border bg-card p-4 text-left transition-colors hover:bg-muted/20" onClick={() => router.push(`/transactions/${tx.id}`)}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{getTransactionTitle(tx)}</p>
                    <p className="mt-1 truncate text-xs text-muted-foreground">{context}</p>
                  </div>
                  <p className={`max-w-[45%] shrink-0 truncate text-right text-sm font-semibold tabular-nums ${positive ? "text-foreground" : "text-muted-foreground"}`}>
                    {positive ? "+" : "−"}{formatCurrency(convert(amount), currency)}
                  </p>
                </div>
                <div className="mt-3 flex items-center justify-between gap-2 border-t pt-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <Badge variant="secondary" className="capitalize">{tx.type}</Badge>
                    {tx.type === "payment" && <Badge className="h-auto rounded-sm bg-primary/10 px-1.5 capitalize text-primary">{tx.status || "Completed"}</Badge>}
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">{formatDateDmy(getDisplayDate(tx))}</span>
                </div>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}

type MetricCardProps = {
  label: string;
  value: string;
  icon: LucideIcon;
  change?: Comparison;
  note?: string;
  tone?: "default" | "destructive";
};

function MetricCard({ label, value, change, icon: Icon, note, tone = "default" }: MetricCardProps) {
  const destructive = tone === "destructive";

  return (
    <Card>
      <CardHeader className="flex items-center gap-2">
        <span className={`flex size-8 shrink-0 items-center justify-center rounded-sm ${destructive ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"}`}>
          <Icon className="size-4" />
        </span>
        <span className={`truncate text-2xl ${destructive ? "text-destructive" : ""}`} title={value}>{value}</span>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <span className="text-base font-semibold">{label}</span>
        <p className="space-x-2 text-sm">
          {change?.value && <span>{change.value}</span>}
          <span className="text-muted-foreground">{change ? change.note : note}</span>
        </p>
      </CardContent>
    </Card>
  );
}

function ProductInsightsCard({
  monthlyData,
  orderCount,
  expenseTotal,
  currency,
  convert,
}: {
  monthlyData: { month: string; orders: number; expenses: number }[];
  orderCount: number;
  expenseTotal: number;
  currency: string;
  convert: (amount: number) => number;
}) {
  return (
    <Card className="justify-between gap-3 *:data-[slot=card-content]:space-y-5">
      <CardHeader className="flex justify-between">
        <div className="flex flex-col gap-1">
          <span className="text-lg font-semibold">Business activity</span>
          <span className="text-sm text-muted-foreground">Last five months</span>
        </div>
        <div className="flex h-16 w-20.5 items-center justify-center rounded-md bg-muted">
          <AdminCnMark className="size-8" />
        </div>
      </CardHeader>
      <CardContent><Separator /></CardContent>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between gap-1">
          <div className="flex flex-col gap-1">
            <span className="text-xs">Completed payments</span>
            <span className="text-2xl font-semibold">{orderCount.toLocaleString()}</span>
          </div>
          <ChartContainer config={chartConfig} className="min-h-13 max-w-18">
            <BarChart accessibilityLayer data={monthlyData} barSize={8}>
              <Bar dataKey="orders" fill="var(--color-orders)" radius={2} />
            </BarChart>
          </ChartContainer>
        </div>
        <div className="flex items-center justify-between gap-1">
          <div className="flex flex-col gap-1">
            <span className="text-xs">Operating expenses</span>
            <span className="text-2xl font-semibold">{formatCompactCurrency(convert(expenseTotal), currency)}</span>
          </div>
          <ChartContainer config={chartConfig} className="min-h-13 max-w-18">
            <BarChart accessibilityLayer data={monthlyData} barSize={8}>
              <Bar dataKey="expenses" fill="var(--color-expenses)" radius={2} />
            </BarChart>
          </ChartContainer>
        </div>
      </CardContent>
    </Card>
  );
}

function IncomeBySourceCard({
  sourceBreakdown,
  incomeTotal,
  currency,
  convert,
}: {
  sourceBreakdown: { source: string; label: string; amount: number; color: string; fill: string }[];
  incomeTotal: number;
  currency: string;
  convert: (amount: number) => number;
}) {
  const leadingSource = [...sourceBreakdown].sort((left, right) => right.amount - left.amount)[0];

  return (
    <Card className="ring-foreground/10 justify-between gap-4 shadow-none ring-1">
      <CardHeader className="gap-1">
        <CardTitle className="text-lg font-semibold">Income by source</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <ChartContainer config={chartConfig} className="h-38.5 w-full">
          <PieChart margin={{ top: 0, bottom: 0, left: 0, right: 0 }}>
            <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel formatter={(value) => formatCurrency(convert(Number(value)), currency)} />} />
            <Pie
              data={sourceBreakdown.length ? sourceBreakdown : [{ source: "noIncome", label: "No income", amount: 1, color: "var(--color-noIncome)" }]}
              dataKey="amount"
              nameKey="label"
              startAngle={300}
              endAngle={660}
              innerRadius={58}
              outerRadius={75}
              paddingAngle={2}
            >
              <Label
                content={({ viewBox }) => {
                  if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                    return (
                      <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                        <tspan x={viewBox.cx} y={(viewBox.cy || 0) - 12} className="fill-card-foreground text-lg font-medium">
                          {formatCompactCurrency(convert(incomeTotal), currency)}
                        </tspan>
                        <tspan x={viewBox.cx} y={(viewBox.cy || 0) + 19} className="fill-muted-foreground text-sm">
                          Net income
                        </tspan>
                      </text>
                    );
                  }
                }}
              />
            </Pie>
          </PieChart>
        </ChartContainer>
        <div className="space-y-3">
          {sourceBreakdown.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground">No completed payments in this period.</p>
          ) : sourceBreakdown.map((entry) => (
            <div key={entry.source} className="flex items-center justify-between gap-3 text-sm">
              <span className="flex min-w-0 items-center gap-2">
                <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: entry.color }} />
                <span className="truncate text-muted-foreground">{entry.label}</span>
              </span>
              <span className="shrink-0 font-medium tabular-nums">{formatCurrency(convert(entry.amount), currency)}</span>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xl">Leading source</span>
          <span className="text-2xl font-medium">{leadingSource && incomeTotal > 0 ? `${Math.round((leadingSource.amount / incomeTotal) * 100)}%` : "—"}</span>
        </div>
      </CardContent>
    </Card>
  );
}
