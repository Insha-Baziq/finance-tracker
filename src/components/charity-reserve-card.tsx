"use client";

import Link from "next/link";
import { ArrowUpRight, Heart } from "lucide-react";
import { useCurrency } from "@/components/currency-provider";
import { CharityPaymentDialog } from "@/components/charity-payment-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CHARITY_RATE, CHARITY_START_MONTH, formatCharityCurrency, formatCharityMonth, getCharityLedger, type CharityPayment } from "@/lib/charity";
import type { TransactionLike } from "@/lib/transaction-utils";

export function CharityReserveCard({
  transactions,
  payments,
  paymentsLoading,
  paymentsError,
  onRetry,
  onPaymentRecorded,
}: {
  transactions: TransactionLike[];
  payments: CharityPayment[];
  paymentsLoading: boolean;
  paymentsError: string | null;
  onRetry: () => void;
  onPaymentRecorded: (payment: CharityPayment) => void;
}) {
  const { currency, convert } = useCurrency();
  const ledger = getCharityLedger(transactions, payments);
  const due = convert(ledger.outstanding);

  return (
    <Card className="gap-0 overflow-hidden">
      <CardHeader className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="min-w-0 space-y-1">
          <CardTitle className="flex items-center gap-2 text-base">
            <Heart className="size-4 text-primary" /> Charity reserve
          </CardTitle>
          <p className="text-sm text-muted-foreground">{(CHARITY_RATE * 100).toFixed(0)}% of closed-month net amounts · from {formatCharityMonth(CHARITY_START_MONTH)}</p>
        </div>
        <Button asChild variant="outline" size="sm" className="shrink-0 gap-1 sm:self-center">
          <Link href="/charity/monthly-ledger">View monthly ledger <ArrowUpRight className="size-3.5" /></Link>
        </Button>
      </CardHeader>
      <CardContent className="grid gap-5 border-t px-5 py-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:px-6">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">Remaining to give</p>
          <p className="mt-1 text-3xl font-semibold tracking-tight tabular-nums sm:text-4xl">
            {paymentsLoading || paymentsError ? "—" : formatCharityCurrency(due, currency)}
          </p>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            {paymentsLoading ? "Loading payment history…" : paymentsError ? paymentsError : ledger.outstanding > 0 ? "Unpaid amounts carry forward until you record a payment." : ledger.totalAccrued > 0 ? "You’re up to date with recorded payments." : "Your first monthly allocation will appear after a month closes."}
          </p>
          {paymentsError && <Button type="button" variant="link" size="sm" className="mt-1 h-auto px-0" onClick={onRetry}>Retry</Button>}
        </div>
        <div className="grid gap-4 sm:min-w-[17rem] sm:justify-items-end">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border bg-muted/30 px-3 py-2.5 sm:min-w-32">
              <p className="text-xs text-muted-foreground">Accrued</p>
              <p className="mt-1 text-sm font-semibold tabular-nums">{paymentsLoading || paymentsError ? "—" : formatCharityCurrency(convert(ledger.totalAccrued), currency)}</p>
            </div>
            <div className="rounded-lg border bg-muted/30 px-3 py-2.5 sm:min-w-32">
              <p className="text-xs text-muted-foreground">Paid to date</p>
              <p className="mt-1 text-sm font-semibold tabular-nums">{paymentsLoading || paymentsError ? "—" : formatCharityCurrency(convert(ledger.totalPaid), currency)}</p>
            </div>
          </div>
          <CharityPaymentDialog amountDue={ledger.outstanding} disabled={paymentsLoading || Boolean(paymentsError) || ledger.outstanding <= 0} onRecorded={onPaymentRecorded} />
        </div>
      </CardContent>
    </Card>
  );
}
