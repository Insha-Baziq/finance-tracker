"use client";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowDownRight, ArrowLeft, ArrowUpRight, CalendarDays, ExternalLink, ReceiptText, Trash2 } from "lucide-react";
import { useCurrency } from "@/components/currency-provider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  buildTransactionIndex,
  formatDateDmy,
  getTransactionClient,
  getTransactionLabel,
  type TransactionLike,
} from "@/lib/transaction-utils";
import { REIMBURSEMENT_OWNER_LABELS } from "@/lib/reimbursements";
function money(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 2 }).format(amount);
}
function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="grid gap-1 border-b py-3 last:border-0 sm:grid-cols-[180px_1fr] sm:items-center sm:gap-4"><span className="text-xs font-medium text-muted-foreground">{label}</span><span className="min-w-0 break-words text-sm font-medium">{children}</span></div>;
}
function TransactionTitle({ tx, client }: { tx: TransactionLike; client?: string }) {
  if (tx.type === "payment") return <>{tx.orderId || client || "Payment"}</>;
  if (tx.type === "expense") return <>{tx.expenseName || "Expense"}</>;
  return <>{tx.description || "Refund"}</>;
}
export default function TransactionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { currency, convert } = useCurrency();
  const [transactions, setTransactions] = useState<TransactionLike[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        const response = await fetch("/api/transactions");
        const data: TransactionLike[] = await response.json();
        setTransactions(data);
        setNotFound(!data.some((transaction) => transaction.id === id));
      } catch (error) {
        console.error("Error fetching transaction:", error);
        setNotFound(true);
      } finally {
        setIsLoading(false);
      }
    };
    void fetchTransactions();
  }, [id]);
  const index = useMemo(() => buildTransactionIndex(transactions), [transactions]);
  const tx = index.get(id);
  const linkedRefunds = useMemo(() => transactions
    .filter((transaction) => transaction.type === "refund" && transaction.refundedTransactionId === id)
    .sort((a, b) => (a.refundDate || "").localeCompare(b.refundDate || "")), [id, transactions]);
  const original = tx?.type === "refund" && tx.refundedTransactionId ? index.get(tx.refundedTransactionId) : undefined;
  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this transaction?")) return;
    try {
      const response = await fetch(`/api/transactions?id=${id}`, { method: "DELETE" });
      if (response.ok) {
        router.push("/transactions");
        router.refresh();
      }
    } catch (error) {
      console.error("Error deleting transaction:", error);
    }
  };
  if (isLoading) return <div className="space-y-5 animate-pulse"><div className="h-8 w-48 rounded bg-muted" /><div className="h-40 rounded-2xl bg-muted" /><div className="h-72 rounded-2xl bg-muted" /></div>;
  if (notFound || !tx) {
    return <div className="mx-auto max-w-3xl space-y-5"><Button variant="ghost" size="sm" asChild className="-ml-2"><Link href="/transactions"><ArrowLeft className="mr-2 size-4" />Back to transactions</Link></Button><Card><CardContent className="py-14 text-center"><p className="text-lg font-semibold">Transaction not found</p><p className="mt-1 text-sm text-muted-foreground">This transaction may have been deleted.</p><Button variant="outline" asChild className="mt-5"><Link href="/transactions">View transactions</Link></Button></CardContent></Card></div>;
  }
  const client = getTransactionClient(tx, index);
  const isPayment = tx.type === "payment";
  const isExpense = tx.type === "expense";
  const typeLabel = isPayment ? "Payment" : isExpense ? "Expense" : "Refund";
  const signIsPositive = isPayment || (tx.type === "refund" && tx.refundFor === "expense");
  const netAmount = tx.netAmount ?? tx.amount - (tx.fees || 0);
  const refundImpact = linkedRefunds.reduce((sum, refund) => sum + (refund.refundFor === "expense" ? refund.amount : -refund.amount), 0);
  return (
    <div className="w-full space-y-6 pb-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <Button variant="ghost" size="sm" asChild className="-ml-2 mb-3 h-8 text-muted-foreground"><Link href="/transactions"><ArrowLeft className="mr-2 size-4" />All transactions</Link></Button>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="capitalize">{typeLabel}</Badge>
            {isPayment && tx.status && <Badge className="h-auto rounded-sm bg-primary/10 px-1.5 capitalize text-primary">{tx.status}</Badge>}
            {tx.source && <Badge variant="secondary" className="capitalize">{tx.source === "bank" ? "Bank transfer" : tx.source}</Badge>}
          </div>
          <h1 className="mt-2 truncate text-2xl font-semibold tracking-tight"><TransactionTitle tx={tx} client={client} /></h1>
          <p className="mt-1 text-sm text-muted-foreground">Recorded {formatDateDmy(tx.createdAt.slice(0, 10))}</p>
        </div>
        {tx.personalExpenseId ? (
          <Badge variant="secondary">Reimbursed expense</Badge>
        ) : (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.push(`/edit/${tx.id}`)}>Edit transaction</Button>
            <Button variant="outline" className="text-muted-foreground hover:text-destructive" onClick={handleDelete}><Trash2 className="mr-2 size-4" /><span className="hidden sm:inline">Delete</span></Button>
          </div>
        )}
      </div>
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <SummaryCard label={isExpense ? "Amount spent" : tx.type === "refund" ? "Refund amount" : "Gross amount"} value={money(convert(tx.type === "payment" ? (tx.grossAmount ?? tx.amount) : tx.amount), currency)} note="Recorded for this transaction" icon={isExpense || (tx.type === "refund" && tx.refundFor === "payment") ? ArrowDownRight : ArrowUpRight} />
        {isPayment ? (
          <>
            <SummaryCard label="Platform fees" value={money(convert(tx.fees || 0), currency)} note="Charged by the platform" icon={ReceiptText} />
            <SummaryCard label="Net received" value={money(convert(netAmount), currency)} note="After platform fees" icon={ArrowUpRight} />
          </>
        ) : (
          <SummaryCard label={isExpense ? "Category" : "Refund type"} value={isExpense ? (tx.category || "Uncategorized") : `For ${tx.refundFor || "transaction"}`} note="Transaction classification" icon={ReceiptText} />
        )}
      </section>
      <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardHeader className="border-b pb-4"><CardTitle className="text-base">Transaction details</CardTitle></CardHeader>
          <CardContent className="pt-1">
            {isPayment && <>
              <DetailRow label="Client">{client ? <Link href={`/clients/${encodeURIComponent(client)}`} className="inline-flex items-center gap-1 text-primary hover:underline">{client}<ExternalLink className="size-3.5" /></Link> : <span className="text-muted-foreground">—</span>}</DetailRow>
              <DetailRow label="Source"><span className="capitalize">{tx.source === "bank" ? "Bank transfer" : tx.source || "—"}</span></DetailRow>
              <DetailRow label="Order date">{formatDateDmy(tx.orderDate)}</DetailRow>
              <DetailRow label="Clearing date">{formatDateDmy(tx.clearingDate)}</DetailRow>
              <DetailRow label="Status">{tx.status || "—"}</DetailRow>
              <DetailRow label="Order ID">{tx.orderId ? <span className="font-mono text-xs">{tx.orderId}</span> : "—"}</DetailRow>
              <DetailRow label="Gross amount">{money(convert(tx.grossAmount ?? tx.amount), currency)}</DetailRow>
              <DetailRow label="Fee">{tx.fees != null ? money(convert(tx.fees), currency) : "—"}</DetailRow>
              <DetailRow label="Net received">{money(convert(netAmount), currency)}</DetailRow>
            </>}
            {isExpense && <>
              <DetailRow label="Expense name">{tx.expenseName || "—"}</DetailRow>
              <DetailRow label="Expense date">{formatDateDmy(tx.expenseDate)}</DetailRow>
              <DetailRow label="Category">{tx.category || "—"}</DetailRow>
              {tx.personalExpenseId && <DetailRow label="Personal ledger">
                {tx.personalExpenseOwner ? <Link href={`/reimbursements/${tx.personalExpenseOwner}`} className="text-primary hover:underline">Reimbursed to {REIMBURSEMENT_OWNER_LABELS[tx.personalExpenseOwner]}</Link> : "Owner reimbursement"}
              </DetailRow>}
              <DetailRow label="Amount"><span className="text-muted-foreground">−{money(convert(tx.amount), currency)}</span></DetailRow>
            </>}
            {tx.type === "refund" && <>
              <DetailRow label={`Refund for ${tx.refundFor || "transaction"}`}>
                {original ? <Link href={`/transactions/${original.id}`} className="text-primary hover:underline">{getTransactionLabel(original, index)}</Link> : <span className="text-muted-foreground">Original transaction not found</span>}
              </DetailRow>
              <DetailRow label="Refund date">{formatDateDmy(tx.refundDate)}</DetailRow>
              <DetailRow label="Direction">{signIsPositive ? "Money returned" : "Money refunded"}</DetailRow>
              <DetailRow label="Amount"><span className={signIsPositive ? "text-foreground" : "text-muted-foreground"}>{signIsPositive ? "+" : "−"}{money(convert(tx.amount), currency)}</span></DetailRow>
            </>}
            <DetailRow label="Description">{tx.description || <span className="text-muted-foreground">—</span>}</DetailRow>
          </CardContent>
        </Card>
        <div className="space-y-4">
          {tx.type === "refund" && original && (
          <Card><CardHeader className="pb-3"><CardTitle className="text-base">Original transaction</CardTitle></CardHeader><CardContent className="pt-0"><Link href={`/transactions/${original.id}`} className="group flex items-center justify-between gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/35"><span className="min-w-0"><span className="block truncate text-sm font-medium">{original.orderId || original.expenseName || original.description || typeLabel}</span><span className="mt-1 block text-xs text-muted-foreground">{formatDateDmy(original.type === "payment" ? original.orderDate : original.expenseDate)}</span></span><ExternalLink className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" /></Link></CardContent></Card>
          )}
          <Card><CardHeader className="pb-3"><CardTitle className="text-base">Record information</CardTitle></CardHeader><CardContent className="pt-0"><div className="flex items-center gap-3 rounded-lg bg-muted p-3"><span className="flex size-9 items-center justify-center rounded-md bg-background text-muted-foreground"><CalendarDays className="size-4" /></span><span><span className="block text-xs text-muted-foreground">Created</span><span className="mt-0.5 block text-sm font-medium">{formatDateDmy(tx.createdAt.slice(0, 10))}</span></span></div><div className="mt-3 flex items-center justify-between text-sm"><span className="text-muted-foreground">Transaction type</span><span className="font-medium capitalize">{tx.type}</span></div>{tx.type === "payment" && <div className="mt-3 flex items-center justify-between text-sm"><span className="text-muted-foreground">Clearing</span><span className="font-medium">{tx.clearingDate ? formatDateDmy(tx.clearingDate) : "Not set"}</span></div>}</CardContent></Card>
        </div>
      </section>
      {linkedRefunds.length > 0 && (
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0"><div><CardTitle className="text-base">Refund activity</CardTitle><p className="mt-1 text-xs text-muted-foreground">All refunds linked to this transaction</p></div><Badge variant="secondary">{linkedRefunds.length} {linkedRefunds.length === 1 ? "refund" : "refunds"}</Badge></CardHeader>
          <CardContent className="pt-0">
            <div className="divide-y">
              {linkedRefunds.map((refund) => (
                <Link key={refund.id} href={`/transactions/${refund.id}`} className="flex items-center justify-between gap-3 py-3 transition-colors hover:bg-muted/30">
                  <span className="min-w-0"><span className="block truncate text-sm font-medium">{refund.description || "Refund"}</span><span className="mt-1 block text-xs text-muted-foreground">{formatDateDmy(refund.refundDate)} · {refund.refundFor === "expense" ? "Expense returned" : "Client refund"}</span></span>
                  <span className={`shrink-0 text-sm font-semibold ${refund.refundFor === "expense" ? "text-foreground" : "text-muted-foreground"}`}>{refund.refundFor === "expense" ? "+" : "−"}{money(convert(refund.amount), currency)}</span>
                </Link>
              ))}
            </div>
            <div className="mt-3 flex items-center justify-between border-t pt-3 text-sm"><span className="text-muted-foreground">Net refund impact</span><span className={`font-semibold ${refundImpact >= 0 ? "text-foreground" : "text-muted-foreground"}`}>{refundImpact > 0 ? "+" : refundImpact < 0 ? "−" : ""}{money(convert(Math.abs(refundImpact)), currency)}</span></div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
function SummaryCard({ label, value, note, icon: Icon }: { label: string; value: string; note: string; icon: typeof ReceiptText }) {
  return (
    <Card>
      <CardHeader className="flex items-center gap-2">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-sm bg-primary/10 text-primary"><Icon className="size-4" /></span>
        <span className="truncate text-2xl" title={value}>{value}</span>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <span className="text-base font-semibold">{label}</span>
        <p className="text-sm text-muted-foreground">{note}</p>
      </CardContent>
    </Card>
  );
}
