"use client";

import { useEffect, useMemo, useState } from "react";
import { Heart, LoaderCircle } from "lucide-react";
import { CharityReserveCard } from "@/components/charity-reserve-card";
import { CharityPaymentEditDialog } from "@/components/charity-payment-edit-dialog";
import { useCharityPayments } from "@/components/use-charity-payments";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCurrency } from "@/components/currency-provider";
import { CHARITY_RATE, formatCharityCurrency } from "@/lib/charity";
import type { TransactionLike } from "@/lib/transaction-utils";
import type { CharityPayment } from "@/lib/charity";

function formatPaymentDate(date: string) {
  const parsed = new Date(`${date}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? date : parsed.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export function CharityPageClient() {
  const { currency, convert } = useCurrency();
  const [transactions, setTransactions] = useState<TransactionLike[]>([]);
  const [transactionsLoading, setTransactionsLoading] = useState(true);
  const [transactionsError, setTransactionsError] = useState<string | null>(null);
  const { payments, isLoading: paymentsLoading, error: paymentsError, refresh, addPayment, updatePayment } = useCharityPayments();

  useEffect(() => {
    let active = true;
    fetch("/api/transactions", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Could not load transactions.");
        return response.json();
      })
      .then((data: TransactionLike[]) => {
        if (active) setTransactions(data);
      })
      .catch((error: unknown) => {
        console.error("Error loading charity ledger transactions:", error);
        if (active) setTransactionsError("Could not load transactions for the monthly calculation.");
      })
      .finally(() => {
        if (active) setTransactionsLoading(false);
      });
    return () => { active = false; };
  }, []);

  const sortedPayments = useMemo(() => [...payments].sort((a, b) => b.paidAt.localeCompare(a.paidAt)), [payments]);

  if (transactionsLoading) {
    return <div className="flex min-h-64 items-center justify-center gap-2 text-sm text-muted-foreground"><LoaderCircle className="size-4 animate-spin" /> Loading charity ledger…</div>;
  }

  if (transactionsError) {
    return <Card><CardContent className="py-12 text-center"><p className="font-medium">Couldn’t load the charity ledger</p><p className="mt-1 text-sm text-muted-foreground">{transactionsError}</p></CardContent></Card>;
  }

  const recordPayment = (payment: CharityPayment) => addPayment(payment);

  return (
    <div className="space-y-6 pb-8">
      <section className="flex flex-col gap-4 border-b pb-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1">
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight"><Heart className="size-5 text-primary" /> Charity</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">Set aside {CHARITY_RATE * 100}% of each closed month’s positive net amount. Completed payments count in the month they clear, after platform fees where applicable. Payments still clearing are excluded until completed.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          <Badge variant="secondary" className="font-normal">Monthly · from June 2026</Badge>
          <span className="text-xs text-muted-foreground">All values are stored in USD.</span>
        </div>
      </section>

      <CharityReserveCard
        transactions={transactions}
        payments={payments}
        paymentsLoading={paymentsLoading}
        paymentsError={paymentsError}
        onRetry={() => void refresh()}
        onPaymentRecorded={recordPayment}
      />

      <section>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Payment history</CardTitle>
            <p className="text-sm text-muted-foreground">Recorded donations and their payment details.</p>
          </CardHeader>
          <CardContent className="pt-0">
            {paymentsLoading ? <p className="py-4 text-sm text-muted-foreground">Loading payment history…</p> : paymentsError ? (
              <div className="space-y-2 py-3"><p role="alert" className="text-sm text-destructive">{paymentsError}</p><button type="button" className="text-sm text-primary hover:underline" onClick={() => void refresh()}>Retry</button></div>
            ) : sortedPayments.length === 0 ? (
              <div className="py-6 text-center"><p className="text-sm font-medium">No payments recorded</p><p className="mt-1 text-xs text-muted-foreground">Recorded donations will appear here.</p></div>
            ) : (
              <div className="space-y-3">
                {sortedPayments.map((payment) => <PaymentHistoryItem key={payment.id} payment={payment} currency={currency} amount={convert(payment.amount)} onUpdated={updatePayment} />)}
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function PaymentHistoryItem({ payment, currency, amount, onUpdated }: { payment: CharityPayment; currency: string; amount: number; onUpdated: (payment: CharityPayment) => void }) {
  return (
    <article className="rounded-lg border px-3 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0"><p className="truncate text-sm font-medium">{payment.recipient}</p><p className="mt-1 text-xs text-muted-foreground">{formatPaymentDate(payment.paidAt)}</p></div>
        <div className="flex shrink-0 items-center gap-1">
          <p className="text-sm font-semibold tabular-nums">{formatCharityCurrency(amount, currency)}</p>
          <CharityPaymentEditDialog payment={payment} onSaved={onUpdated} />
        </div>
      </div>
      {payment.notes && <p className="mt-2 border-t pt-2 text-xs text-muted-foreground">{payment.notes}</p>}
    </article>
  );
}
