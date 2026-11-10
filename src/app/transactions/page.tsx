"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { ColumnDef, SortingState } from "@tanstack/react-table";
import { ArrowUpDown, CalendarDays, Filter, RotateCcw, CircleDollarSign, Pencil, Plus, Receipt, Trash2, Wallet, type LucideIcon } from "lucide-react";
import { DataTable, SortableColumnHeader } from "@/components/data-table";
import { SearchInput } from "@/components/search-input";
import { useCurrency } from "@/components/currency-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  buildTransactionIndex,
  formatDateDmy,
  getTransactionClient,
  getTransactionDate,
  getTransactionLabel,
  getTransactionSearchText,
  type TransactionLike,
} from "@/lib/transaction-utils";

interface Transaction extends TransactionLike {
  grossAmount?: number;
  netAmount?: number;
  clearingDate?: string;
}

interface TransactionRow {
  tx: Transaction;
  label: string;
  date?: string;
  client?: string;
  name: string;
}

function money(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 2 }).format(amount);
}

function methodLabel(tx: Transaction) {
  if (tx.type === "payment") {
    if (tx.source === "bank") return "Bank transfer";
    return tx.source ? `${tx.source[0].toUpperCase()}${tx.source.slice(1)}` : "Payment";
  }
  if (tx.type === "expense") return tx.category || "Expense";
  return `Refund · ${tx.refundFor || "transaction"}`;
}

function transactionName(tx: Transaction, label: string) {
  if (tx.type === "payment") return tx.orderId || tx.description || "Payment";
  if (tx.type === "expense") return tx.expenseName || tx.description || "Expense";
  return tx.description || label;
}

export default function TransactionsPage() {
  const router = useRouter();
  const { currency, convert } = useCurrency();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [typeFilter, setTypeFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [sorting, setSorting] = useState<SortingState>([{ id: "date", desc: true }]);
  const [searchQuery, setSearchQuery] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    void fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    try {
      const response = await fetch("/api/transactions");
      const data: Transaction[] = await response.json();
      setTransactions(data);
    } catch (error) {
      console.error("Error fetching transactions:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this transaction?")) return;
    try {
      const response = await fetch(`/api/transactions?id=${id}`, { method: "DELETE" });
      if (response.ok) void fetchTransactions();
    } catch (error) {
      console.error("Error deleting transaction:", error);
    }
  };

  const transactionIndex = useMemo(() => buildTransactionIndex(transactions), [transactions]);

  const filteredTransactions = useMemo(() => {
    const terms = searchQuery.toLowerCase().trim().split(/\s+/).filter(Boolean);
    return transactions
      .filter((tx) => {
        if (typeFilter !== "all" && tx.type !== typeFilter) return false;
        if (sourceFilter !== "all") {
          if (tx.type === "payment" && tx.source !== sourceFilter) return false;
          if (tx.type === "expense" && sourceFilter !== "expense") return false;
          if (tx.type === "refund" && sourceFilter !== "refund") return false;
        }
        if (terms.length > 0) {
          const searchText = getTransactionSearchText(tx, transactionIndex);
          if (!terms.every((term) => searchText.includes(term))) return false;
        }
        if (fromDate || toDate) {
          const txDate = getTransactionDate(tx);
          if (!txDate || (fromDate && txDate < fromDate) || (toDate && txDate > toDate)) return false;
        }
        return true;
      })
      .map((tx) => {
        const label = getTransactionLabel(tx, transactionIndex);
        return {
          tx,
          label,
          date: getTransactionDate(tx),
          client: getTransactionClient(tx, transactionIndex),
          name: transactionName(tx, label),
        } satisfies TransactionRow;
      });
  }, [fromDate, searchQuery, sourceFilter, toDate, transactionIndex, transactions, typeFilter]);

  const sortedTransactions = useMemo(() => {
    const direction = sortBy === "newest" ? -1 : 1;
    return [...filteredTransactions].sort((left, right) => {
      const leftDate = left.date || left.tx.createdAt.slice(0, 10);
      const rightDate = right.date || right.tx.createdAt.slice(0, 10);
      const dateOrder = leftDate.localeCompare(rightDate);
      if (dateOrder !== 0) return dateOrder * direction;
      return left.tx.createdAt.localeCompare(right.tx.createdAt) * direction;
    });
  }, [filteredTransactions, sortBy]);

  const metrics = useMemo(() => {
    const payments = filteredTransactions.filter((row) => row.tx.type === "payment" && row.tx.status === "Completed").map((row) => row.tx);
    const refunds = filteredTransactions.filter((row) => row.tx.type === "refund").map((row) => row.tx);
    const expenses = filteredTransactions.filter((row) => row.tx.type === "expense").map((row) => row.tx);
    const grossRevenue = payments.reduce((sum, tx) => sum + (tx.grossAmount ?? tx.amount), 0)
      - refunds.filter((tx) => tx.refundFor === "payment").reduce((sum, tx) => sum + tx.amount, 0);
    const fees = payments.reduce((sum, tx) => sum + (tx.fees || 0), 0);
    const netIncome = payments.reduce((sum, tx) => sum + (tx.netAmount ?? tx.amount - (tx.fees || 0)), 0)
      - refunds.filter((tx) => tx.refundFor === "payment").reduce((sum, tx) => sum + tx.amount, 0);
    const totalExpenses = expenses.reduce((sum, tx) => sum + tx.amount, 0)
      - refunds.filter((tx) => tx.refundFor === "expense").reduce((sum, tx) => sum + tx.amount, 0);
    return { grossRevenue, fees, netIncome, totalExpenses };
  }, [filteredTransactions]);

  const activeFilterCount = [
    searchQuery.trim().length > 0,
    typeFilter !== "all",
    sourceFilter !== "all",
    Boolean(fromDate || toDate),
  ].filter(Boolean).length;

  const clearFilters = () => {
    setSearchQuery("");
    setTypeFilter("all");
    setSourceFilter("all");
    setFromDate("");
    setToDate("");
  };

  const columns = useMemo<ColumnDef<TransactionRow>[]>(() => [
    {
      id: "date",
      accessorFn: (row) => row.date || row.tx.createdAt.slice(0, 10),
      header: ({ column }) => <SortableColumnHeader label="Date" column={column} />,
      cell: ({ row }) => <span className="whitespace-nowrap text-sm text-muted-foreground">{formatDateDmy(row.original.date)}</span>,
    },
    {
      accessorKey: "name",
      header: ({ column }) => <SortableColumnHeader label="Name" column={column} />,
      cell: ({ row }) => <span className="block max-w-[210px] truncate text-sm font-medium" title={row.original.name}>{row.original.name}</span>,
    },
    {
      accessorKey: "client",
      header: "Client",
      cell: ({ row }) => row.original.client ? (
        <button type="button" className="max-w-[140px] truncate text-left text-sm text-primary hover:underline" onClick={(event) => { event.stopPropagation(); router.push(`/clients/${encodeURIComponent(row.original.client!)}`); }}>
          {row.original.client}
        </button>
      ) : <span className="text-sm text-muted-foreground">—</span>,
    },
    {
      id: "clearing",
      accessorFn: (row) => row.tx.clearingDate || "",
      header: "Clearing",
      cell: ({ row }) => <span className="whitespace-nowrap text-sm text-muted-foreground">{formatDateDmy(row.original.tx.clearingDate)}</span>,
    },
    {
      id: "status",
      accessorFn: (row) => row.tx.status || "",
      header: "Status",
      cell: ({ row }) => row.original.tx.type === "payment" ? (
        <Badge className="h-auto rounded-sm bg-primary/10 px-1.5 capitalize text-primary">
          {row.original.tx.status || "Pending"}
        </Badge>
      ) : <span className="text-sm text-muted-foreground">—</span>,
    },
    {
      id: "method",
      accessorFn: (row) => methodLabel(row.tx),
      header: "Method",
      cell: ({ row }) => <Badge variant="secondary" className="whitespace-nowrap font-medium">{methodLabel(row.original.tx)}</Badge>,
    },
    {
      id: "amount",
      accessorFn: (row) => row.tx.type === "payment" ? (row.tx.grossAmount ?? row.tx.amount) : row.tx.amount,
      header: ({ column }) => <SortableColumnHeader label="Amount" column={column} />,
      cell: ({ getValue }) => <span className="whitespace-nowrap text-right text-sm tabular-nums">{money(convert(Number(getValue())), currency)}</span>,
    },
    {
      id: "fees",
      accessorFn: (row) => row.tx.type === "payment" ? (row.tx.fees || 0) : 0,
      header: ({ column }) => <SortableColumnHeader label="Fee" column={column} />,
      cell: ({ row }) => <span className="whitespace-nowrap text-sm tabular-nums text-muted-foreground">{row.original.tx.type === "payment" && (row.original.tx.fees || 0) > 0 ? money(convert(row.original.tx.fees || 0), currency) : "—"}</span>,
    },
    {
      id: "net",
      accessorFn: (row) => row.tx.type === "payment" ? (row.tx.netAmount ?? row.tx.amount - (row.tx.fees || 0)) : row.tx.amount,
      header: ({ column }) => <SortableColumnHeader label="Net" column={column} />,
      cell: ({ row, getValue }) => {
        const tx = row.original.tx;
        const positive = tx.type === "payment" || (tx.type === "refund" && tx.refundFor === "expense");
        return <span className={`whitespace-nowrap text-right text-sm font-semibold tabular-nums ${positive ? "text-foreground" : "text-muted-foreground"}`}>{positive ? "+" : "−"}{money(convert(Number(getValue())), currency)}</span>;
      },
    },
    {
      id: "actions",
      header: "",
      enableSorting: false,
      cell: ({ row }) => (
        <div className="flex items-center justify-end gap-1">
          {row.original.tx.personalExpenseId ? (
            <span className="px-2 text-xs text-muted-foreground">Reimbursed expense</span>
          ) : <>
            <Button type="button" variant="ghost" size="sm" className="size-8 p-0 text-muted-foreground" aria-label="Edit transaction" title="Edit" onClick={(event) => { event.stopPropagation(); router.push(`/edit/${row.original.tx.id}`); }}><Pencil className="size-3.5" /></Button>
            <Button type="button" variant="ghost" size="sm" className="size-8 p-0 text-muted-foreground hover:text-destructive" aria-label="Delete transaction" title="Delete" onClick={(event) => { event.stopPropagation(); void handleDelete(row.original.tx.id); }}><Trash2 className="size-3.5" /></Button>
          </>}
        </div>
      ),
    },
  ], [convert, currency, router]);

  const filters = (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
            <Filter className="size-4" />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold">Filter transactions</p>
              {activeFilterCount > 0 && (
                <Badge variant="secondary" className="h-5 rounded-sm px-1.5 text-[10px] font-medium">
                  {activeFilterCount} active {activeFilterCount === 1 ? "filter" : "filters"}
                </Badge>
              )}
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">Search by client, order, or description.</p>
          </div>
        </div>
        <p className="shrink-0 text-sm text-muted-foreground" aria-live="polite">
          Showing <span className="font-medium text-foreground">{filteredTransactions.length}</span> of {transactions.length} transactions
        </p>
      </div>

      <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-[minmax(250px,1fr)_minmax(140px,0.55fr)_minmax(140px,0.55fr)_minmax(160px,0.6fr)]">
        <div className="sm:col-span-2 xl:col-span-1">
          <SearchInput value={searchQuery} onChange={setSearchQuery} placeholder="Search client, order ID, or description..." id="transaction-search" />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger aria-label="Filter by transaction type" className="h-9 w-full bg-background"><SelectValue placeholder="All types" /></SelectTrigger>
          <SelectContent><SelectItem value="all">All types</SelectItem><SelectItem value="payment">Payment</SelectItem><SelectItem value="expense">Expense</SelectItem><SelectItem value="refund">Refund</SelectItem></SelectContent>
        </Select>
        <Select value={sourceFilter} onValueChange={setSourceFilter}>
          <SelectTrigger aria-label="Filter by source" className="h-9 w-full bg-background"><SelectValue placeholder="All sources" /></SelectTrigger>
          <SelectContent><SelectItem value="all">All sources</SelectItem><SelectItem value="fiverr">Fiverr</SelectItem><SelectItem value="upwork">Upwork</SelectItem><SelectItem value="bank">Bank</SelectItem><SelectItem value="expense">Expense</SelectItem><SelectItem value="refund">Refund</SelectItem></SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={(value) => { setSortBy(value); setSorting([{ id: "date", desc: value === "newest" }]); }}>
          <SelectTrigger aria-label="Sort transactions by date" className="h-9 w-full bg-background"><ArrowUpDown className="size-3.5 text-muted-foreground" /><SelectValue placeholder="Sort by date" /></SelectTrigger>
          <SelectContent><SelectItem value="newest">Newest first</SelectItem><SelectItem value="oldest">Oldest first</SelectItem></SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-end sm:gap-3">
          <div className="flex h-9 items-center gap-2 text-sm font-medium text-muted-foreground">
            <CalendarDays className="size-4" />
            <span>Date range</span>
          </div>
          <div className="grid min-w-0 gap-2 sm:max-w-xl sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
            <label className="grid min-w-0 gap-1 text-xs font-medium text-muted-foreground">
              <span>From</span>
              <Input type="date" aria-label="From date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} className="h-9 bg-background text-sm" />
            </label>
            <span className="hidden self-end pb-2 text-xs text-muted-foreground sm:block">to</span>
            <label className="grid min-w-0 gap-1 text-xs font-medium text-muted-foreground">
              <span>To</span>
              <Input type="date" aria-label="To date" value={toDate} onChange={(event) => setToDate(event.target.value)} className="h-9 bg-background text-sm" />
            </label>
          </div>
        </div>
        {activeFilterCount > 0 && (
          <Button type="button" variant="ghost" size="sm" className="self-start sm:self-end" onClick={clearFilters}>
            <RotateCcw className="size-3.5" />
            Clear filters
          </Button>
        )}
      </div>
    </div>
  );

  if (isLoading) {
    return <div className="space-y-5 animate-pulse"><div className="h-8 w-56 rounded bg-muted" /><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 3 }, (_, i) => <div key={i} className="h-32 rounded-xl bg-muted" />)}</div><div className="h-[500px] rounded-xl bg-muted" /></div>;
  }

  return (
    <div className="space-y-6 pb-8">
      <section className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div><h1 className="text-2xl font-semibold tracking-tight">Transactions</h1><p className="mt-1 text-sm text-muted-foreground">Search and manage payments, expenses, and refunds.</p></div>
        <Button type="button" className="w-full gap-2 sm:w-auto" onClick={() => router.push("/add")}>
          <Plus className="size-4" /> Add transaction
        </Button>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <MetricCard label="Gross revenue" value={money(convert(metrics.grossRevenue), currency)} icon={CircleDollarSign} note="Before platform fees · after refunds" />
        <MetricCard label="Net income" value={money(convert(metrics.netIncome), currency)} icon={Wallet} note={`After fees and refunds · ${money(convert(metrics.fees), currency)} in platform fees`} />
        <MetricCard label="Total expenses" value={money(convert(metrics.totalExpenses), currency)} icon={Receipt} note="Expenses after expense refunds" />
      </section>

      <div className="hidden md:block">
        <DataTable
          columns={columns}
          data={filteredTransactions}
          sorting={sorting}
          onSortingChange={setSorting}
          pageSize={10}
          toolbar={filters}
          onRowClick={(row) => router.push(`/transactions/${row.tx.id}`)}
          emptyTitle="No transactions found"
          emptyDescription="Try adjusting the filters or add a new transaction."
        />
      </div>

      <div className="rounded-xl border bg-card p-4 md:hidden">{filters}</div>

      <div className="space-y-3 md:hidden">
        {filteredTransactions.length === 0 ? (
          <Card><CardContent className="py-10 text-center"><p className="font-medium">No transactions found</p><p className="mt-1 text-sm text-muted-foreground">Try adjusting the filters or add a new transaction.</p></CardContent></Card>
        ) : sortedTransactions.map(({ tx, date, client, name }) => {
          const positive = tx.type === "payment" || (tx.type === "refund" && tx.refundFor === "expense");
          const net = tx.type === "payment" ? (tx.netAmount ?? tx.amount - (tx.fees || 0)) : tx.amount;
          return (
            <Card key={tx.id} className="cursor-pointer transition-colors hover:bg-muted/20" onClick={() => router.push(`/transactions/${tx.id}`)}>
              <CardContent className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0"><p className="truncate text-sm font-semibold">{name}</p><p className="mt-1 text-xs text-muted-foreground">{client || methodLabel(tx)} · {formatDateDmy(date)}</p></div>
                  <p className={`shrink-0 text-sm font-semibold tabular-nums ${positive ? "text-foreground" : "text-muted-foreground"}`}>{positive ? "+" : "−"}{money(convert(net), currency)}</p>
                </div>
                <div className="flex items-center justify-between border-t pt-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="capitalize">{tx.type}</Badge>
                    {tx.type === "payment" && <Badge className="h-auto rounded-sm bg-primary/10 px-1.5 capitalize text-primary">{tx.status || "Pending"}</Badge>}
                  </div>
                  {tx.personalExpenseId ? <span className="text-xs text-muted-foreground">Reimbursed expense</span> : (
                    <div className="flex gap-1">
                      <Button type="button" variant="ghost" size="sm" className="h-8 px-2" onClick={(event) => { event.stopPropagation(); router.push(`/edit/${tx.id}`); }}><Pencil className="mr-1 size-3.5" />Edit</Button>
                      <Button type="button" variant="ghost" size="sm" className="h-8 px-2 text-muted-foreground hover:text-destructive" onClick={(event) => { event.stopPropagation(); void handleDelete(tx.id); }}><Trash2 className="mr-1 size-3.5" />Delete</Button>
                    </div>
                  )}
                </div>
                {tx.type === "payment" && <div className="flex justify-between text-xs text-muted-foreground"><span>Gross {money(convert(tx.grossAmount ?? tx.amount), currency)}</span><span>Fee {tx.fees ? money(convert(tx.fees), currency) : "—"}</span></div>}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function MetricCard({ label, value, icon: Icon, note }: { label: string; value: string; icon: LucideIcon; note: string }) {
  return (
    <Card>
      <CardHeader className="flex items-center gap-2">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-sm bg-primary/10 text-primary">
          <Icon className="size-4" />
        </span>
        <span className="truncate text-2xl" title={value}>{value}</span>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <span className="text-base font-semibold">{label}</span>
        <p className="text-sm text-muted-foreground">{note}</p>
      </CardContent>
    </Card>
  );
}
