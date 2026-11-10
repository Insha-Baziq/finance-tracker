"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { ArrowLeft, BriefcaseBusiness, CircleDollarSign, CreditCard, ReceiptText, Wallet, type LucideIcon } from "lucide-react";
import { DataTable, SortableColumnHeader } from "@/components/data-table";
import { useCurrency } from "@/components/currency-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  buildTransactionIndex,
  formatDateDmy,
  getClientStats,
  type ClientStats,
  type TransactionLike,
} from "@/lib/transaction-utils";

function money(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 2 }).format(amount);
}

export default function ClientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const client = decodeURIComponent((params.client as string) || "");
  const { currency, convert } = useCurrency();
  const [transactions, setTransactions] = useState<TransactionLike[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        const response = await fetch("/api/transactions");
        const data: TransactionLike[] = await response.json();
        setTransactions(data);
      } catch (error) {
        console.error("Error fetching client details:", error);
      } finally {
        setIsLoading(false);
      }
    };
    void fetchTransactions();
  }, []);

  const index = useMemo(() => buildTransactionIndex(transactions), [transactions]);
  const stats: ClientStats | undefined = useMemo(() => getClientStats(transactions).find((entry) => entry.client === client), [client, transactions]);
  const payments = useMemo(() => transactions
    .filter((tx) => tx.type === "payment" && tx.username === client)
    .sort((a, b) => (b.orderDate || "").localeCompare(a.orderDate || "")), [client, transactions]);
  const paymentIds = useMemo(() => new Set(payments.map((payment) => payment.id)), [payments]);
  const refunds = useMemo(() => transactions
    .filter((tx) => tx.type === "refund" && tx.refundFor === "payment" && Boolean(tx.refundedTransactionId && paymentIds.has(tx.refundedTransactionId)))
    .sort((a, b) => (b.refundDate || "").localeCompare(a.refundDate || "")), [paymentIds, transactions]);

  const columns = useMemo<ColumnDef<TransactionLike>[]>(() => [
    { id: "date", accessorFn: (row) => row.orderDate || "", header: ({ column }) => <SortableColumnHeader label="Date" column={column} />, cell: ({ row }) => <span className="whitespace-nowrap text-sm text-muted-foreground">{formatDateDmy(row.original.orderDate)}</span> },
    { accessorKey: "orderId", header: "Order ID", cell: ({ row }) => <span className="font-mono text-xs">{row.original.orderId || <span className="font-sans text-muted-foreground">No order ID</span>}</span> },
    { accessorKey: "status", header: "Status", cell: ({ row }) => <Badge className="h-auto rounded-sm bg-primary/10 px-1.5 capitalize text-primary">{row.original.status || "Pending"}</Badge> },
    { accessorKey: "source", header: "Source", cell: ({ row }) => <Badge variant="secondary" className="capitalize">{row.original.source === "bank" ? "Bank transfer" : row.original.source || "Payment"}</Badge> },
    { id: "gross", accessorFn: (row) => row.grossAmount ?? row.amount, header: ({ column }) => <SortableColumnHeader label="Gross" column={column} />, cell: ({ getValue }) => <span className="whitespace-nowrap text-sm tabular-nums">{money(convert(Number(getValue())), currency)}</span> },
    { accessorKey: "fees", header: ({ column }) => <SortableColumnHeader label="Fees" column={column} />, cell: ({ row }) => <span className="whitespace-nowrap text-sm tabular-nums text-muted-foreground">{money(convert(row.original.fees || 0), currency)}</span> },
    { id: "net", accessorFn: (row) => row.netAmount ?? row.amount - (row.fees || 0), header: ({ column }) => <SortableColumnHeader label="Net" column={column} />, cell: ({ getValue }) => <span className="whitespace-nowrap text-sm font-semibold tabular-nums">{money(convert(Number(getValue())), currency)}</span> },
  ], [convert, currency]);

  if (isLoading) return <div className="space-y-5 animate-pulse"><div className="h-8 w-64 rounded bg-muted" /><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"><div className="h-32 rounded-xl bg-muted" /><div className="h-32 rounded-xl bg-muted" /><div className="h-32 rounded-xl bg-muted" /></div><div className="h-80 rounded-xl bg-muted" /></div>;

  if (!stats || payments.length === 0) {
    return <div className="mx-auto max-w-3xl space-y-5"><Button variant="ghost" size="sm" asChild className="-ml-2"><Link href="/clients"><ArrowLeft className="mr-2 size-4" />All clients</Link></Button><Card><CardContent className="py-14 text-center"><p className="text-lg font-semibold">Client not found</p><p className="mt-1 text-sm text-muted-foreground">No client named “{client}” has any payments.</p><Button variant="outline" asChild className="mt-5"><Link href="/clients">Back to clients</Link></Button></CardContent></Card></div>;
  }

  const metrics = [
    { label: "Total earned", value: money(convert(stats.earned), currency), note: "Completed payments after fees and refunds", icon: Wallet },
    { label: "Orders", value: stats.orders.toLocaleString(), note: "All payments, including Clearing", icon: BriefcaseBusiness },
    { label: "Gross", value: money(convert(stats.gross), currency), note: "All orders before fees", icon: CircleDollarSign },
  ];

  return (
    <div className="w-full space-y-6 pb-8">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0"><Button variant="ghost" size="sm" asChild className="-ml-2 mb-2 h-8 text-muted-foreground"><Link href="/clients"><ArrowLeft className="mr-2 size-4" />All clients</Link></Button><div className="flex items-center gap-3"><span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-muted text-sm font-semibold">{client.slice(0, 2).toUpperCase()}</span><div className="min-w-0"><h1 className="truncate text-2xl font-semibold tracking-tight">{client}</h1><p className="mt-1 text-sm text-muted-foreground">{stats.orders} {stats.orders === 1 ? "order" : "orders"}{stats.lastOrder && <> · Last order {formatDateDmy(stats.lastOrder)}</>}</p></div></div></div>
        <Button variant="outline" onClick={() => router.push(`/add`)}><CreditCard className="mr-2 size-4" />Add payment</Button>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {metrics.map((metric) => <ClientDetailMetric key={metric.label} icon={metric.icon} value={metric.value} title={metric.label} note={metric.note} />)}
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3"><div><h2 className="text-base font-semibold">Order history</h2><p className="mt-1 text-sm text-muted-foreground">Gross, fees, status, and take-home for every payment.</p></div><Badge variant="secondary">{payments.length} orders</Badge></div>
        <div className="hidden md:block"><DataTable columns={columns} data={payments} initialSorting={[{ id: "date", desc: true }]} pageSize={10} onRowClick={(tx) => router.push(`/transactions/${tx.id}`)} emptyTitle="No orders yet" />
        </div>
          <div className="space-y-3 md:hidden">
            {payments.map((tx) => <button key={tx.id} type="button" className="w-full rounded-xl border bg-card p-4 text-left transition-colors hover:bg-muted/20" onClick={() => router.push(`/transactions/${tx.id}`)}><div className="flex items-start justify-between gap-3"><span className="min-w-0"><span className="block truncate font-mono text-xs font-medium">{tx.orderId || "Payment"}</span><span className="mt-1 block text-xs text-muted-foreground">{formatDateDmy(tx.orderDate)} · {tx.source || "Payment"}</span></span><span className="text-right"><Badge className="h-auto rounded-sm bg-primary/10 px-1.5 capitalize text-primary">{tx.status || "Pending"}</Badge></span></div><div className="mt-3 grid grid-cols-3 gap-2 border-t pt-3 text-xs"><div><span className="text-muted-foreground">Gross</span><span className="mt-1 block font-medium">{money(convert(tx.grossAmount ?? tx.amount), currency)}</span></div><div><span className="text-muted-foreground">Fees</span><span className="mt-1 block font-medium">{money(convert(tx.fees || 0), currency)}</span></div><div><span className="text-muted-foreground">Net</span><span className="mt-1 block font-semibold">{money(convert(tx.netAmount ?? tx.amount - (tx.fees || 0)), currency)}</span></div></div></button>)}
          </div>
      </section>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0"><div><CardTitle className="text-base">Refund history</CardTitle><p className="mt-1 text-xs text-muted-foreground">Payment refunds linked to this client’s orders.</p></div><Badge variant="secondary">{refunds.length} refunds</Badge></CardHeader>
        <CardContent className="pt-0">
          {refunds.length === 0 ? <div className="rounded-xl border border-dashed py-8 text-center"><span className="mx-auto flex size-9 items-center justify-center rounded-lg bg-muted text-muted-foreground"><ReceiptText className="size-4" /></span><p className="mt-2 text-sm text-muted-foreground">No refunds recorded for this client.</p></div> : (
            <div className="divide-y">
              {refunds.map((refund) => {
                const original = refund.refundedTransactionId ? index.get(refund.refundedTransactionId) : undefined;
                return <Link key={refund.id} href={`/transactions/${refund.id}`} className="flex items-center justify-between gap-3 py-3 transition-colors hover:bg-muted/30"><span className="min-w-0"><span className="block truncate text-sm font-medium">{refund.description || "Refund"}</span><span className="mt-1 block text-xs text-muted-foreground">{formatDateDmy(refund.refundDate)}{original?.orderId && <> · order {original.orderId}</>}</span></span><span className="shrink-0 text-sm font-semibold text-muted-foreground">−{money(convert(refund.amount), currency)}</span></Link>;
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ClientDetailMetric({ icon: Icon, value, title, note }: { icon: LucideIcon; value: string; title: string; note: string }) {
  return (
    <Card>
      <CardHeader className="flex items-center gap-2">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-sm bg-primary/10 text-primary"><Icon className="size-4" /></span>
        <span className="truncate text-2xl" title={value}>{value}</span>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <span className="text-base font-semibold">{title}</span>
        <p className="text-sm text-muted-foreground">{note}</p>
      </CardContent>
    </Card>
  );
}
