"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Wallet } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useCurrency } from "@/components/currency-provider";
import type { PersonalExpense, ReimbursementOwner } from "@/lib/reimbursements";
import { REIMBURSEMENT_OWNERS, REIMBURSEMENT_OWNER_LABELS } from "@/lib/reimbursements";

function money(amount: number, currency: "USD" | "PKR") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 2 }).format(amount);
}

export function ReimbursementOverview() {
  const [expenses, setExpenses] = useState<PersonalExpense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const { currency, convert } = useCurrency();

  useEffect(() => {
    let active = true;
    fetch("/api/reimbursements")
      .then(async (response) => {
        if (!response.ok) throw new Error("Could not load the personal ledgers.");
        return response.json() as Promise<PersonalExpense[]>;
      })
      .then((data) => {
        if (active) setExpenses(data);
      })
      .catch((loadError: unknown) => {
        if (active) setError(loadError instanceof Error ? loadError.message : "Could not load the personal ledgers.");
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="space-y-6 pb-8">
      <section className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Reimbursements</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Track Mikdex AI expenses paid from personal funds. Once the company pays you back, mark the entry paid to add it to Transactions.
        </p>
      </section>

      {error && <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">{error}</p>}

      <section className="grid gap-4 lg:grid-cols-2" aria-label="Choose a personal ledger">
        {REIMBURSEMENT_OWNERS.map((owner) => (
          <OwnerLedgerCard
            key={owner}
            owner={owner}
            expenses={expenses.filter((expense) => expense.owner === owner)}
            currency={currency}
            convert={convert}
            isLoading={isLoading}
          />
        ))}
      </section>
    </div>
  );
}

function OwnerLedgerCard({
  owner,
  expenses,
  currency,
  convert,
  isLoading,
}: {
  owner: ReimbursementOwner;
  expenses: PersonalExpense[];
  currency: "USD" | "PKR";
  convert: (amount: number) => number;
  isLoading: boolean;
}) {
  const pending = expenses.filter((expense) => expense.status === "pending");
  const paid = expenses.filter((expense) => expense.status === "paid");
  const pendingTotal = pending.reduce((total, expense) => total + expense.amount, 0);

  return (
    <Link href={`/reimbursements/${owner}`} className="group block rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
      <Card className="h-full transition-colors group-hover:border-primary/30 group-hover:bg-muted/20">
        <CardHeader className="flex-row items-start justify-between gap-4 space-y-0">
          <div className="flex items-center gap-3">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Wallet className="size-5" />
            </span>
            <div className="space-y-1">
              <CardTitle className="text-lg">{REIMBURSEMENT_OWNER_LABELS[owner]} ledger</CardTitle>
              <CardDescription>Personal expenses covered for Mikdex AI</CardDescription>
            </div>
          </div>
          <ArrowRight className="mt-1 size-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
        </CardHeader>
        <CardContent className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Pending reimbursement</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">
              {isLoading ? <span className="inline-block h-7 w-28 animate-pulse rounded bg-muted" /> : money(convert(pendingTotal), currency)}
            </p>
          </div>
          <div className="flex gap-2">
            <Badge className="border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
              {isLoading ? "…" : `${pending.length} pending`}
            </Badge>
            <Badge variant="secondary">{isLoading ? "…" : `${paid.length} paid`}</Badge>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
