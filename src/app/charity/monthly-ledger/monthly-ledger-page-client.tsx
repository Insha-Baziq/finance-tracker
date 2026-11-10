"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Heart, Info, LoaderCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useCurrency } from "@/components/currency-provider";
import { CHARITY_START_MONTH, formatCharityCurrency, formatCharityMonth, type CharityBreakdownTransaction, type CharityMonthBreakdown, type CharityLedger } from "@/lib/charity";
import { formatTransactionDate } from "@/lib/transaction-utils";

const columnFormulas = {
  month: "Each closed calendar month from June 2026 onward. Completed payments use their clearing date, falling back to order date when no clearing date is recorded. Payment refunds use their refund date; tax expenses use their expense date. Expense refunds are excluded because they are not income. Months close using the Asia/Karachi timezone.",
  gross: "Gross amounts from completed payments by clearing date (or order date when no clearing date is recorded). Expense refunds are excluded. Payment refunds reduce net earned in the month the refund is issued, not the original order month.",
  fees: "Platform fees on completed payments whose clearing date (or fallback order date) is in this month. Uses the recorded fee; if missing, derives it as payment gross amount minus recorded netAmount. Fees are subtracted from gross earned.",
  net: "Gross earned − fees − payment refunds issued this month − recorded tax expenses dated this month. Expense refunds and ordinary business expenses are excluded. A later refund never changes an earlier closed month.",
  allocation: "Round(max(Net earned, 0) × 2%) to the nearest cent. A zero or negative net amount allocates $0.00; earlier months are not recalculated or clawed back.",
};

export function MonthlyCharityLedgerPage() {
  const { currency, convert } = useCurrency();
  const [ledger, setLedger] = useState<CharityLedger | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [monthBreakdown, setMonthBreakdown] = useState<CharityMonthBreakdown | null>(null);
  const [isBreakdownLoading, setIsBreakdownLoading] = useState(false);
  const [breakdownError, setBreakdownError] = useState<string | null>(null);
  const [breakdownRetry, setBreakdownRetry] = useState(0);

  const loadLedger = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/charity/monthly-ledger", { cache: "no-store" });
      if (!response.ok) throw new Error("Could not load the monthly charity ledger.");
      setLedger(await response.json());
    } catch (loadError) {
      console.error("Error loading monthly charity ledger:", loadError);
      setError("Could not load the monthly charity ledger. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadLedger();
  }, [loadLedger]);

  useEffect(() => {
    if (!selectedMonth) return;
    const controller = new AbortController();
    setIsBreakdownLoading(true);
    setBreakdownError(null);
    setMonthBreakdown(null);

    void (async () => {
      try {
        const response = await fetch(`/api/charity/monthly-ledger/${selectedMonth}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("Could not load this month’s transactions.");
        setMonthBreakdown(await response.json());
      } catch (loadError) {
        if (controller.signal.aborted) return;
        console.error("Error loading monthly charity breakdown:", loadError);
        setBreakdownError("Could not load this month’s transactions. Please try again.");
      } finally {
        if (!controller.signal.aborted) setIsBreakdownLoading(false);
      }
    })();

    return () => controller.abort();
  }, [selectedMonth, breakdownRetry]);

  const totals = ledger ?? { totalAccrued: 0, totalPaid: 0, outstanding: 0, allocations: [], monthlyLedger: [] };

  return (
    <div className="space-y-6 pb-8">
      <header className="flex flex-col gap-4 border-b pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 space-y-2">
          <Button asChild variant="ghost" size="sm" className="-ml-3 w-fit gap-2">
            <Link href="/charity"><ArrowLeft className="size-4" /> Charity</Link>
          </Button>
          <div className="space-y-1">
            <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight"><Heart className="size-5 text-primary" /> Monthly charity ledger</h1>
            <p className="max-w-3xl text-sm text-muted-foreground">Completed income counts in the month it clears, after platform fees where applicable. Payments still clearing are excluded. Net earned also subtracts payment refunds issued and recorded tax expenses for that month.</p>
          </div>
        </div>
        <div className="flex flex-col gap-3 sm:items-end">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="w-fit font-normal">From {formatCharityMonth(CHARITY_START_MONTH)}</Badge>
            <span className="text-xs text-muted-foreground">Stored in USD · displayed in {currency}</span>
          </div>
        </div>
      </header>

      {error ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <p role="alert" className="text-sm text-destructive">{error}</p>
            <Button type="button" variant="outline" size="sm" onClick={() => void loadLedger()}>Try again</Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <section aria-label="Charity totals" className="grid gap-4 sm:grid-cols-3">
            <LedgerSummaryCard title="Total allocated" value={isLoading ? "—" : formatCharityCurrency(convert(totals.totalAccrued), currency)} detail="2% of positive net amount earned in closed months" />
            <LedgerSummaryCard title="Paid to date" value={isLoading ? "—" : formatCharityCurrency(convert(totals.totalPaid), currency)} detail="Recorded charity payments" />
            <LedgerSummaryCard title="Still to give" value={isLoading ? "—" : formatCharityCurrency(convert(totals.outstanding), currency)} detail="Unpaid amounts carry forward" />
          </section>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Monthly allocations</CardTitle>
              <p className="max-w-3xl text-sm text-muted-foreground">Select a month to inspect the transactions counted in its calculation. Open a column’s info button for its formula.</p>
            </CardHeader>
            <CardContent className="p-0">
              <div className="hidden overflow-x-auto xl:block">
                <Table className="min-w-[760px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead><FormulaHeader label="Month" formula={columnFormulas.month} /></TableHead>
                      <TableHead className="text-center"><FormulaHeader label="Gross earned" align="center" formula={columnFormulas.gross} /></TableHead>
                      <TableHead className="text-center"><FormulaHeader label="Fees" align="center" formula={columnFormulas.fees} /></TableHead>
                      <TableHead className="text-center"><FormulaHeader label="Net earned" align="center" formula={columnFormulas.net} /></TableHead>
                      <TableHead className="text-center"><FormulaHeader label="2% allocated" align="center" formula={columnFormulas.allocation} /></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow><TableCell colSpan={5} className="h-24 text-center text-muted-foreground"><span className="inline-flex items-center gap-2"><LoaderCircle className="size-4 animate-spin" /> Loading monthly allocations…</span></TableCell></TableRow>
                    ) : totals.monthlyLedger.length === 0 ? (
                      <TableRow><TableCell colSpan={5} className="h-24 text-center text-muted-foreground">Monthly allocations will appear after the first month closes.</TableCell></TableRow>
                    ) : totals.monthlyLedger.map((entry) => (
                      <TableRow
                        key={entry.month}
                        role="button"
                        tabIndex={0}
                        aria-label={`View transactions included in ${formatCharityMonth(entry.month)}`}
                        className="cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset hover:bg-muted/50"
                        onClick={() => setSelectedMonth(entry.month)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            setSelectedMonth(entry.month);
                          }
                        }}
                      >
                        <TableCell className="whitespace-nowrap font-medium">{formatCharityMonth(entry.month)}</TableCell>
                        <TableCell className="text-center tabular-nums">{formatCharityCurrency(convert(entry.grossAmount), currency)}</TableCell>
                        <TableCell className="text-center tabular-nums">{formatCharityCurrency(convert(entry.platformFees), currency)}</TableCell>
                        <TableCell className="text-center font-semibold tabular-nums">{formatCharityCurrency(convert(entry.netAmount), currency)}</TableCell>
                        <TableCell className="text-center font-medium tabular-nums">{formatCharityCurrency(convert(entry.allocation), currency)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="space-y-3 p-4 xl:hidden">
                {isLoading ? (
                  <div className="flex h-24 items-center justify-center gap-2 text-sm text-muted-foreground"><LoaderCircle className="size-4 animate-spin" /> Loading monthly allocations…</div>
                ) : totals.monthlyLedger.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">Monthly allocations will appear after the first month closes.</p>
                ) : totals.monthlyLedger.map((entry) => (
                  <article
                    key={entry.month}
                    className="cursor-pointer rounded-lg border p-4 transition-colors hover:bg-muted/30"
                    onClick={() => setSelectedMonth(entry.month)}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-sm font-semibold">
                        <button type="button" className="rounded-sm text-left underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" onClick={() => setSelectedMonth(entry.month)}>
                          {formatCharityMonth(entry.month)}
                          <span className="sr-only">: view included transactions</span>
                        </button>
                      </h3>
                      <FormulaInfo label="Month" formula={columnFormulas.month} align="end" />
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-3">
                      <LedgerMetric label="Gross earned" value={formatCharityCurrency(convert(entry.grossAmount), currency)} formula={columnFormulas.gross} />
                      <LedgerMetric label="Fees" value={formatCharityCurrency(convert(entry.platformFees), currency)} formula={columnFormulas.fees} />
                      <LedgerMetric label="Net earned" value={formatCharityCurrency(convert(entry.netAmount), currency)} formula={columnFormulas.net} emphasized />
                      <LedgerMetric label="2% allocated" value={formatCharityCurrency(convert(entry.allocation), currency)} formula={columnFormulas.allocation} emphasized />
                    </div>
                  </article>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}

      <Dialog open={selectedMonth !== null} onOpenChange={(open) => { if (!open) setSelectedMonth(null); }}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedMonth ? `${formatCharityMonth(selectedMonth)} transactions` : "Monthly transactions"}</DialogTitle>
            <DialogDescription>These items contributed to the month’s net earned amount and 2% allocation.</DialogDescription>
          </DialogHeader>

          {isBreakdownLoading ? (
            <div className="flex min-h-36 items-center justify-center gap-2 text-sm text-muted-foreground"><LoaderCircle className="size-4 animate-spin" /> Loading included transactions…</div>
          ) : breakdownError ? (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <p role="alert" className="text-sm text-destructive">{breakdownError}</p>
              <Button type="button" variant="outline" size="sm" onClick={() => setBreakdownRetry((attempt) => attempt + 1)}>Try again</Button>
            </div>
          ) : monthBreakdown ? (
            <>
              {monthBreakdown.transactions.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">No transactions contributed to this month.</p>
              ) : (
                <div className="max-h-[50vh] space-y-2 overflow-y-auto pr-1">
                  {monthBreakdown.transactions.map((transaction) => (
                    <BreakdownRow key={`${transaction.kind}-${transaction.id}`} transaction={transaction} currency={currency} convert={convert} />
                  ))}
                </div>
              )}
              <div className="grid grid-cols-2 gap-3 border-t pt-4">
                <div>
                  <p className="text-xs text-muted-foreground">Net earned</p>
                  <p className="mt-1 font-semibold tabular-nums">{formatCharityCurrency(convert(monthBreakdown.netAmount), currency)}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">2% allocated</p>
                  <p className="mt-1 font-semibold tabular-nums">{formatCharityCurrency(convert(monthBreakdown.allocation), currency)}</p>
                </div>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function BreakdownRow({
  transaction,
  currency,
  convert,
}: {
  transaction: CharityBreakdownTransaction;
  currency: string;
  convert: (amount: number) => number;
}) {
  const labels = {
    payment: "Completed payment",
    "payment-refund": "Payment refund",
    "tax-expense": "Tax expense",
  } as const;

  return (
    <div className="rounded-md border p-3">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{transaction.title}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {labels[transaction.kind]} · {formatTransactionDate(transaction.date)}{transaction.source ? ` · ${transaction.source}` : ""}
          </p>
          {(transaction.kind === "payment" || transaction.clientName) && (
            <p className="mt-1 text-xs text-muted-foreground">Client: {transaction.clientName || "Client not recorded"}</p>
          )}
        </div>
        {transaction.kind !== "payment" && (
          <p className={`shrink-0 text-sm font-semibold tabular-nums ${transaction.countedAmount < 0 ? "text-destructive" : ""}`}>
            {formatCharityCurrency(convert(transaction.countedAmount), currency)}
          </p>
        )}
      </div>
      {transaction.kind === "payment" && transaction.grossAmount !== undefined && transaction.platformFees !== undefined && (
        <div className="mt-3 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-md bg-muted/40 p-2">
              <p className="text-[11px] text-muted-foreground">Before fees</p>
              <p className="mt-0.5 text-sm font-medium tabular-nums">{formatCharityCurrency(convert(transaction.grossAmount), currency)}</p>
            </div>
            <div className="rounded-md bg-muted/40 p-2">
              <p className="text-[11px] text-muted-foreground">After fees</p>
              <p className="mt-0.5 text-sm font-semibold tabular-nums">{formatCharityCurrency(convert(transaction.countedAmount), currency)}</p>
            </div>
          </div>
          <p className="flex justify-between gap-3 text-xs text-muted-foreground">
            <span>Platform fees</span>
            <span className="shrink-0 tabular-nums">−{formatCharityCurrency(convert(transaction.platformFees), currency)}</span>
          </p>
        </div>
      )}
    </div>
  );
}

function FormulaHeader({ label, formula, align = "left" }: { label: string; formula: string; align?: "left" | "center" }) {
  return (
    <div className={`flex items-center gap-1.5 whitespace-nowrap ${align === "center" ? "justify-center" : ""}`}>
      <span>{label}</span>
      <FormulaInfo label={label} formula={formula} align={align === "left" ? "start" : "center"} />
    </div>
  );
}

function FormulaInfo({ label, formula, align = "center" }: { label: string; formula: string; align?: "start" | "center" | "end" }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button type="button" variant="ghost" size="icon-xs" className="text-muted-foreground" aria-label={`How ${label} is calculated`} onClick={(event) => event.stopPropagation()}>
          <Info className="size-3.5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align={align} side="top" className="w-72 text-left">
        <p className="text-sm font-medium">{label}</p>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{formula}</p>
      </PopoverContent>
    </Popover>
  );
}

function LedgerMetric({ label, value, formula, emphasized = false }: { label: string; value: string; formula: string; emphasized?: boolean }) {
  return (
    <div className="rounded-md border bg-muted/20 p-2 text-center text-xs sm:p-3">
      <FormulaHeader label={label} formula={formula} align="center" />
      <p className={`mt-1 text-sm tabular-nums ${emphasized ? "font-semibold" : "font-medium"}`}>{value}</p>
    </div>
  );
}

function LedgerSummaryCard({ title, value, detail }: { title: string; value: string; detail: string }) {
  return (
    <Card className="gap-3 py-5">
      <CardHeader className="pb-0">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold tracking-tight tabular-nums">{value}</p>
        <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
      </CardContent>
    </Card>
  );
}
