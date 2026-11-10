"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, Plus, Search, Wallet } from "lucide-react";
import type { ColumnDef, SortingState } from "@tanstack/react-table";
import { useCurrency } from "@/components/currency-provider";
import { DataTable, SortableColumnHeader } from "@/components/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { formatTransactionDate } from "@/lib/transaction-utils";
import type { PersonalExpense, ReimbursementOwner } from "@/lib/reimbursements";
import { REIMBURSEMENT_OWNER_LABELS } from "@/lib/reimbursements";

interface Category {
  id: string;
  name: string;
}

function money(amount: number, currency: "USD" | "PKR") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 2 }).format(amount);
}

function todayInKarachi() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Karachi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const part = (type: string) => parts.find((item) => item.type === type)?.value || "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export function PersonalReimbursementLedger({ owner }: { owner: ReimbursementOwner }) {
  const [expenses, setExpenses] = useState<PersonalExpense[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [sorting, setSorting] = useState<SortingState>([{ id: "date", desc: true }]);
  const [addOpen, setAddOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmationIds, setConfirmationIds] = useState<string[]>([]);
  const [expenseName, setExpenseName] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("Other");
  const [expenseDate, setExpenseDate] = useState("");
  const [description, setDescription] = useState("");
  const { currency, convert } = useCurrency();
  const ownerLabel = REIMBURSEMENT_OWNER_LABELS[owner];

  useEffect(() => {
    let active = true;
    Promise.all([
      fetch("/api/reimbursements").then(async (response) => {
        if (!response.ok) throw new Error("Could not load this personal ledger.");
        return response.json() as Promise<PersonalExpense[]>;
      }),
      fetch("/api/categories").then(async (response) => response.ok ? response.json() as Promise<Category[]> : []),
    ])
      .then(([allExpenses, loadedCategories]) => {
        if (!active) return;
        setExpenses(allExpenses.filter((expense) => expense.owner === owner));
        setCategories(loadedCategories);
        if (loadedCategories.length > 0) setCategory(loadedCategories[0].name);
      })
      .catch((loadError: unknown) => {
        if (active) setError(loadError instanceof Error ? loadError.message : "Could not load this personal ledger.");
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [owner]);

  useEffect(() => {
    if (!expenseDate) setExpenseDate(todayInKarachi());
  }, [expenseDate]);

  const ownerExpenses = useMemo(() => expenses.filter((expense) => expense.owner === owner), [expenses, owner]);
  const pendingExpenses = ownerExpenses.filter((expense) => expense.status === "pending");
  const paidExpenses = ownerExpenses.filter((expense) => expense.status === "paid");
  const pendingTotal = pendingExpenses.reduce((total, expense) => total + expense.amount, 0);
  const paidTotal = paidExpenses.reduce((total, expense) => total + expense.amount, 0);

  const filteredExpenses = useMemo(() => {
    const query = search.trim().toLowerCase();
    return ownerExpenses.filter((expense) => {
      if (statusFilter !== "all" && expense.status !== statusFilter) return false;
      if (!query) return true;
      return [expense.expenseName, expense.category, expense.description, expense.expenseDate, expense.amount.toString()]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
  }, [ownerExpenses, search, statusFilter]);

  const visiblePending = filteredExpenses.filter((expense) => expense.status === "pending");
  const visiblePendingIds = visiblePending.map((expense) => expense.id);
  const allVisiblePendingSelected = visiblePendingIds.length > 0 && visiblePendingIds.every((id) => selectedIds.includes(id));
  const someVisiblePendingSelected = visiblePendingIds.some((id) => selectedIds.includes(id));
  const selectedExpenses = ownerExpenses.filter((expense) => selectedIds.includes(expense.id) && expense.status === "pending");
  const confirmationExpenses = ownerExpenses.filter((expense) => confirmationIds.includes(expense.id));
  const confirmationAmount = confirmationExpenses.reduce((total, expense) => total + expense.amount, 0);

  const openConfirmation = useCallback((ids: string[]) => {
    setError("");
    setConfirmationIds(ids);
    setConfirmOpen(true);
  }, []);

  const toggleExpense = useCallback((id: string, checked: boolean) => {
    setSelectedIds((current) => checked
      ? Array.from(new Set([...current, id]))
      : current.filter((selectedId) => selectedId !== id));
  }, []);

  const toggleAllVisible = useCallback((checked: boolean) => {
    setSelectedIds((current) => checked
      ? Array.from(new Set([...current, ...visiblePendingIds]))
      : current.filter((id) => !visiblePendingIds.includes(id)));
  }, [visiblePendingIds]);

  const handleAddExpense = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setIsSaving(true);

    try {
      const response = await fetch("/api/reimbursements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          owner,
          expenseName,
          amount: Number(amount),
          category,
          expenseDate,
          description,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not save this expense.");

      setExpenses((current) => [data as PersonalExpense, ...current]);
      setExpenseName("");
      setAmount("");
      setDescription("");
      setAddOpen(false);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not save this expense.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleMarkPaid = async () => {
    if (confirmationIds.length === 0) return;
    setError("");
    setIsSaving(true);

    try {
      const response = await fetch("/api/reimbursements/pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: confirmationIds }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not record the reimbursement.");

      const updated = data.paid as PersonalExpense[];
      setExpenses((current) => current.map((expense) => updated.find((item) => item.id === expense.id) || expense));
      setSelectedIds((current) => current.filter((id) => !confirmationIds.includes(id)));
      setConfirmOpen(false);
      setConfirmationIds([]);
    } catch (payError) {
      setError(payError instanceof Error ? payError.message : "Could not record the reimbursement.");
    } finally {
      setIsSaving(false);
    }
  };

  const columns = useMemo<ColumnDef<PersonalExpense>[]>(() => [
    {
      id: "select",
      enableSorting: false,
      header: () => (
        <Checkbox
          aria-label="Select all pending expenses matching the filters"
          checked={allVisiblePendingSelected ? true : someVisiblePendingSelected ? "indeterminate" : false}
          disabled={visiblePendingIds.length === 0}
          onCheckedChange={(checked) => toggleAllVisible(checked === true)}
        />
      ),
      cell: ({ row }) => row.original.status === "pending" ? (
        <Checkbox
          aria-label={`Select ${row.original.expenseName}`}
          checked={selectedIds.includes(row.original.id)}
          onCheckedChange={(checked) => toggleExpense(row.original.id, checked === true)}
        />
      ) : <span className="block w-4" />,
    },
    {
      id: "date",
      accessorKey: "expenseDate",
      header: ({ column }) => <SortableColumnHeader label="Date" column={column} />,
      cell: ({ row }) => <span className="text-sm text-muted-foreground">{formatTransactionDate(row.original.expenseDate)}</span>,
    },
    {
      accessorKey: "expenseName",
      header: ({ column }) => <SortableColumnHeader label="Expense" column={column} />,
      cell: ({ row }) => (
        <div className="max-w-[240px]">
          <p className="truncate text-sm font-medium" title={row.original.expenseName}>{row.original.expenseName}</p>
          {row.original.description && <p className="truncate text-xs text-muted-foreground" title={row.original.description}>{row.original.description}</p>}
        </div>
      ),
    },
    {
      accessorKey: "category",
      header: "Category",
      cell: ({ row }) => <span className="text-sm text-muted-foreground">{row.original.category || "—"}</span>,
    },
    {
      accessorKey: "amount",
      header: ({ column }) => <SortableColumnHeader label="Amount" column={column} />,
      cell: ({ row }) => <span className="font-medium tabular-nums">{money(convert(row.original.amount), currency)}</span>,
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => <ExpenseStatusBadge status={row.original.status} paidAt={row.original.paidAt} />,
    },
    {
      id: "actions",
      enableSorting: false,
      header: "Actions",
      cell: ({ row }) => row.original.status === "pending" ? (
        <Button type="button" variant="outline" size="sm" onClick={() => openConfirmation([row.original.id])}>
          <Check className="size-3.5" /> Mark paid
        </Button>
      ) : <span className="text-xs text-muted-foreground">Added to Transactions</span>,
    },
  ], [allVisiblePendingSelected, convert, currency, openConfirmation, selectedIds, someVisiblePendingSelected, toggleAllVisible, toggleExpense, visiblePendingIds]);

  const resetAddForm = () => {
    setExpenseName("");
    setAmount("");
    setCategory(categories[0]?.name || "Other");
    setExpenseDate(todayInKarachi());
    setDescription("");
  };

  return (
    <div className="space-y-6 pb-8">
      <section className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <Button asChild variant="ghost" size="sm" className="-ml-2 w-fit text-muted-foreground">
            <Link href="/reimbursements"><ArrowLeft className="size-3.5" /> All ledgers</Link>
          </Button>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{ownerLabel} ledger</h1>
            <p className="mt-1 text-sm text-muted-foreground">Personal expenses paid for Mikdex AI and their reimbursement status.</p>
          </div>
        </div>
        <Button type="button" className="w-full gap-2 sm:w-auto" onClick={() => { setError(""); setExpenseDate(todayInKarachi()); setAddOpen(true); }}>
          <Plus className="size-4" /> Add expense
        </Button>
      </section>

      {error && <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">{error}</p>}

      <section className="grid gap-4 sm:grid-cols-3">
        <MetricCard label="Pending reimbursement" value={money(convert(pendingTotal), currency)} note={`${pendingExpenses.length} expense${pendingExpenses.length === 1 ? "" : "s"} waiting for payment`} />
        <MetricCard label="Reimbursed" value={money(convert(paidTotal), currency)} note={`${paidExpenses.length} expense${paidExpenses.length === 1 ? "" : "s"} added to Transactions`} />
        <MetricCard label="Ledger entries" value={String(ownerExpenses.length)} note="Pending and paid personal expenses" />
      </section>

      <div className="rounded-xl border bg-card p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full lg:max-w-sm">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search expenses..." aria-label="Search personal expenses" className="h-9 pl-9" />
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9 w-full bg-background sm:w-40" aria-label="Filter by reimbursement status"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
              </SelectContent>
            </Select>
            <Button type="button" className="h-9" disabled={selectedExpenses.length === 0} onClick={() => openConfirmation(selectedExpenses.map((expense) => expense.id))}>
              <Check className="size-4" /> Mark paid{selectedExpenses.length > 0 ? ` (${selectedExpenses.length})` : ""}
            </Button>
          </div>
        </div>
        <p className="mt-3 text-xs text-muted-foreground" aria-live="polite">
          Showing {filteredExpenses.length} of {ownerExpenses.length} entries
        </p>
      </div>

      <div className="hidden md:block">
        {isLoading ? <LoadingTable /> : (
          <DataTable
            columns={columns}
            data={filteredExpenses}
            sorting={sorting}
            onSortingChange={setSorting}
            pageSize={10}
            emptyTitle="No expenses in this ledger"
            emptyDescription={search || statusFilter !== "all" ? "Try changing your search or status filter." : "Add an expense you paid for Mikdex AI to get started."}
          />
        )}
      </div>

      <div className="space-y-3 md:hidden">
        {isLoading ? <LoadingCards /> : filteredExpenses.length === 0 ? (
          <Card><CardContent className="py-10 text-center"><p className="font-medium">No expenses in this ledger</p><p className="mt-1 text-sm text-muted-foreground">{search || statusFilter !== "all" ? "Try changing your search or status filter." : "Add an expense you paid for Mikdex AI to get started."}</p></CardContent></Card>
        ) : filteredExpenses.map((expense) => (
          <ExpenseMobileCard
            key={expense.id}
            expense={expense}
            currency={currency}
            convert={convert}
            selected={selectedIds.includes(expense.id)}
            onToggle={(checked) => toggleExpense(expense.id, checked)}
            onMarkPaid={() => openConfirmation([expense.id])}
          />
        ))}
      </div>

      <Dialog open={addOpen} onOpenChange={(open) => { setAddOpen(open); if (!open && !isSaving) resetAddForm(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add to {ownerLabel} ledger</DialogTitle>
            <DialogDescription>This stays in the personal ledger until Mikdex AI reimburses you.</DialogDescription>
          </DialogHeader>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <form id="add-personal-expense" className="space-y-4" onSubmit={handleAddExpense}>
            <label className="grid gap-1.5 text-sm font-medium">
              Expense name
              <Input required maxLength={120} value={expenseName} onChange={(event) => setExpenseName(event.target.value)} placeholder="e.g. AI tool subscription" />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1.5 text-sm font-medium">
                Amount (USD)
                <Input required type="number" min="0.01" step="0.01" inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="0.00" />
              </label>
              <label className="grid gap-1.5 text-sm font-medium">
                Date paid
                <Input required type="date" value={expenseDate} onChange={(event) => setExpenseDate(event.target.value)} />
              </label>
            </div>
            <label className="grid gap-1.5 text-sm font-medium">
              Category
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Choose a category" /></SelectTrigger>
                <SelectContent>
                  {categories.length > 0 ? categories.map((item) => <SelectItem key={item.id} value={item.name}>{item.name}</SelectItem>) : <SelectItem value="Other">Other</SelectItem>}
                </SelectContent>
              </Select>
            </label>
            <label className="grid gap-1.5 text-sm font-medium">
              Notes <span className="font-normal text-muted-foreground">(optional)</span>
              <Textarea maxLength={500} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="What was this expense for?" rows={3} />
            </label>
          </form>
          <DialogFooter>
            <Button type="button" variant="outline" disabled={isSaving} onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button type="submit" form="add-personal-expense" disabled={isSaving}>{isSaving ? "Saving…" : "Save pending expense"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmOpen} onOpenChange={(open) => { setConfirmOpen(open); if (!open && !isSaving) setConfirmationIds([]); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm reimbursement</DialogTitle>
            <DialogDescription>
              Confirm that Mikdex AI paid {ownerLabel} back {money(convert(confirmationAmount), currency)} for {confirmationExpenses.length} expense{confirmationExpenses.length === 1 ? "" : "s"}.
              The expense{confirmationExpenses.length === 1 ? "" : "s"} will be added to the Transactions page.
            </DialogDescription>
          </DialogHeader>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          {confirmationExpenses.length > 0 && (
            <div className="max-h-48 space-y-2 overflow-y-auto rounded-lg border p-3">
              {confirmationExpenses.map((expense) => (
                <div key={expense.id} className="flex items-start justify-between gap-4 text-sm">
                  <span className="min-w-0 truncate">{expense.expenseName}</span>
                  <span className="shrink-0 font-medium tabular-nums">{money(convert(expense.amount), currency)}</span>
                </div>
              ))}
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" disabled={isSaving} onClick={() => setConfirmOpen(false)}>Cancel</Button>
            <Button type="button" disabled={isSaving || confirmationExpenses.length === 0} onClick={() => void handleMarkPaid()}>
              {isSaving ? "Saving…" : "Confirm paid"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ExpenseStatusBadge({ status, paidAt }: { status: PersonalExpense["status"]; paidAt?: string }) {
  return (
    <div className="space-y-1">
      {status === "pending"
        ? <Badge className="border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">Pending</Badge>
        : <Badge variant="secondary">Paid</Badge>}
      {status === "paid" && paidAt && <p className="text-[11px] text-muted-foreground">{formatTransactionDate(paidAt.slice(0, 10))}</p>}
    </div>
  );
}

function MetricCard({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <Card>
      <CardHeader className="flex-row items-center gap-2 space-y-0 pb-2">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-sm bg-primary/10 text-primary"><Wallet className="size-4" /></span>
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold tabular-nums">{value}</p>
        <p className="mt-1 text-xs text-muted-foreground">{note}</p>
      </CardContent>
    </Card>
  );
}

function ExpenseMobileCard({
  expense,
  currency,
  convert,
  selected,
  onToggle,
  onMarkPaid,
}: {
  expense: PersonalExpense;
  currency: "USD" | "PKR";
  convert: (amount: number) => number;
  selected: boolean;
  onToggle: (checked: boolean) => void;
  onMarkPaid: () => void;
}) {
  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            {expense.status === "pending" && <Checkbox aria-label={`Select ${expense.expenseName}`} checked={selected} onCheckedChange={(checked) => onToggle(checked === true)} className="mt-0.5" />}
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{expense.expenseName}</p>
              <p className="mt-1 text-xs text-muted-foreground">{expense.category || "Uncategorized"} · {formatTransactionDate(expense.expenseDate)}</p>
            </div>
          </div>
          <p className="shrink-0 text-sm font-semibold tabular-nums">{money(convert(expense.amount), currency)}</p>
        </div>
        {expense.description && <p className="line-clamp-2 text-sm text-muted-foreground">{expense.description}</p>}
        <div className="flex items-center justify-between border-t pt-3">
          <ExpenseStatusBadge status={expense.status} paidAt={expense.paidAt} />
          {expense.status === "pending" ? (
            <Button type="button" variant="outline" size="sm" onClick={onMarkPaid}><Check className="size-3.5" /> Mark paid</Button>
          ) : <span className="text-xs text-muted-foreground">Added to Transactions</span>}
        </div>
      </CardContent>
    </Card>
  );
}

function LoadingTable() {
  return <div className="h-[360px] animate-pulse rounded-xl border bg-card" />;
}

function LoadingCards() {
  return <div className="space-y-3">{[0, 1, 2].map((item) => <div key={item} className="h-32 animate-pulse rounded-xl border bg-card" />)}</div>;
}
