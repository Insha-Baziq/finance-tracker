"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { ArrowUpRight, BriefcaseBusiness, CircleDollarSign, UsersRound } from "lucide-react";
import { DataTable, SortableColumnHeader } from "@/components/data-table";
import { SearchInput } from "@/components/search-input";
import { useCurrency } from "@/components/currency-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  formatDateDmy,
  getClientStats,
  type ClientStats,
  type TransactionLike,
} from "@/lib/transaction-utils";

function money(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 2 }).format(amount);
}

export default function ClientsPage() {
  const router = useRouter();
  const { currency, convert } = useCurrency();
  const [transactions, setTransactions] = useState<TransactionLike[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [query, setQuery] = useState("");

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        const response = await fetch("/api/transactions");
        const data: TransactionLike[] = await response.json();
        setTransactions(data);
      } catch (error) {
        console.error("Error fetching clients:", error);
      } finally {
        setIsLoading(false);
      }
    };
    void fetchTransactions();
  }, []);

  const clients = useMemo(() => getClientStats(transactions), [transactions]);
  const filteredClients = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return normalized ? clients.filter((client) => client.client.toLowerCase().includes(normalized)) : clients;
  }, [clients, query]);

  const totals = useMemo(() => clients.reduce((result, client) => ({
    orders: result.orders + client.orders,
    gross: result.gross + client.gross,
    earned: result.earned + client.earned,
  }), { orders: 0, gross: 0, earned: 0 }), [clients]);

  const openClient = (client: string) => router.push(`/clients/${encodeURIComponent(client)}`);

  const columns = useMemo<ColumnDef<ClientStats>[]>(() => [
    {
      accessorKey: "client",
      header: ({ column }) => <SortableColumnHeader label="Client" column={column} />,
      cell: ({ row }) => (
        <div className="flex min-w-[170px] items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-foreground">{row.original.client.slice(0, 2).toUpperCase()}</span>
          <span className="min-w-0"><span className="block truncate text-sm font-semibold">{row.original.client}</span><span className="block text-xs text-muted-foreground">Client account</span></span>
        </div>
      ),
    },
    { accessorKey: "orders", header: ({ column }) => <SortableColumnHeader label="Orders" column={column} />, cell: ({ getValue }) => <span className="text-sm tabular-nums">{Number(getValue()).toLocaleString()}</span> },
    { accessorKey: "gross", header: ({ column }) => <SortableColumnHeader label="Gross" column={column} />, cell: ({ getValue }) => <span className="whitespace-nowrap text-sm tabular-nums">{money(convert(Number(getValue())), currency)}</span> },
    { accessorKey: "fees", header: ({ column }) => <SortableColumnHeader label="Fees" column={column} />, cell: ({ getValue }) => <span className="whitespace-nowrap text-sm tabular-nums text-muted-foreground">{money(convert(Number(getValue())), currency)}</span> },
    { accessorKey: "earned", header: ({ column }) => <SortableColumnHeader label="Earned" column={column} />, cell: ({ getValue }) => <span className="whitespace-nowrap text-sm font-semibold tabular-nums">{money(convert(Number(getValue())), currency)}</span> },
    { accessorKey: "lastOrder", header: ({ column }) => <SortableColumnHeader label="Last order" column={column} />, cell: ({ getValue }) => <span className="whitespace-nowrap text-sm text-muted-foreground">{formatDateDmy((getValue() as string | undefined) || undefined)}</span> },
  ], [convert, currency]);

  const searchToolbar = (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="w-full sm:max-w-sm"><SearchInput value={query} onChange={setQuery} placeholder="Search clients..." id="client-search" /></div>
      <p className="shrink-0 text-sm text-muted-foreground">Showing <span className="font-medium text-foreground">{filteredClients.length}</span> of {clients.length} clients</p>
    </div>
  );

  if (isLoading) {
    return <div className="space-y-5 animate-pulse"><div className="h-8 w-44 rounded bg-muted" /><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 3 }, (_, i) => <div key={i} className="h-32 rounded-xl bg-muted" />)}</div><div className="h-80 rounded-xl bg-muted" /></div>;
  }

  return (
    <div className="space-y-6 pb-8">
      <section>
        <div><h1 className="text-2xl font-semibold tracking-tight">Clients</h1><p className="mt-1 text-sm text-muted-foreground">Review order history and cleared earnings by client.</p></div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <ClientMetric label="Total clients" value={clients.length.toLocaleString()} note="Clients with payment history" icon={UsersRound} />
        <ClientMetric label="Client orders" value={totals.orders.toLocaleString()} note="Includes clearing payments" icon={BriefcaseBusiness} />
        <ClientMetric label="Lifetime earned" value={money(convert(totals.earned), currency)} note="Completed payments after fees and refunds" icon={CircleDollarSign} />
      </section>

      {clients.length === 0 ? (
        <Card><CardContent className="py-12 text-center"><span className="mx-auto flex size-10 items-center justify-center rounded-md bg-muted text-muted-foreground"><UsersRound className="size-5" /></span><p className="mt-3 text-sm font-medium">No clients yet</p><p className="mt-1 text-sm text-muted-foreground">Add a payment with a client username to build your directory.</p><Button className="mt-4" size="sm" onClick={() => router.push("/add")}>Add payment</Button></CardContent></Card>
      ) : (
        <>
          <div className="hidden md:block">
            <DataTable columns={columns} data={filteredClients} initialSorting={[{ id: "earned", desc: true }]} pageSize={10} onRowClick={(client) => openClient(client.client)} emptyTitle={`No clients match “${query.trim()}”`} emptyDescription="Try a different name or clear the search." toolbar={searchToolbar} />
          </div>
          <div className="space-y-3 md:hidden">
            <div className="rounded-xl border bg-card p-4">{searchToolbar}</div>
            {filteredClients.length === 0 ? (
              <Card><CardContent className="py-10 text-center"><p className="text-sm font-medium">No clients match “{query.trim()}”</p><p className="mt-1 text-sm text-muted-foreground">Try a different name or clear the search.</p><Button variant="ghost" size="sm" className="mt-2" onClick={() => setQuery("")}>Clear search</Button></CardContent></Card>
            ) : filteredClients.map((client) => <ClientMobileCard key={client.client} client={client} currency={currency} convert={convert} onOpen={() => openClient(client.client)} />)}
          </div>
        </>
      )}
    </div>
  );
}

function ClientMetric({ label, value, note, icon: Icon }: { label: string; value: string; note: string; icon: typeof UsersRound }) {
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
        <p className="truncate text-sm text-muted-foreground">{note}</p>
      </CardContent>
    </Card>
  );
}

function ClientMobileCard({ client, currency, convert, onOpen }: { client: ClientStats; currency: string; convert: (amount: number) => number; onOpen: () => void }) {
  return (
    <button type="button" className="w-full rounded-xl border bg-card p-4 text-left transition-colors hover:bg-muted/20" onClick={onOpen}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3"><span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-foreground">{client.client.slice(0, 2).toUpperCase()}</span><div className="min-w-0"><p className="truncate text-sm font-semibold">{client.client}</p><p className="mt-0.5 text-xs text-muted-foreground">{client.orders} {client.orders === 1 ? "order" : "orders"}</p></div></div>
        <div className="text-right"><p className="text-sm font-semibold">{money(convert(client.earned), currency)}</p><p className="text-[10px] text-muted-foreground">earned</p></div>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 border-t pt-3 text-xs"><div><p className="text-muted-foreground">Gross</p><p className="mt-1 font-medium">{money(convert(client.gross), currency)}</p></div><div><p className="text-muted-foreground">Fees</p><p className="mt-1 font-medium">{money(convert(client.fees), currency)}</p></div><div><p className="text-muted-foreground">Last order</p><p className="mt-1 font-medium">{formatDateDmy(client.lastOrder)}</p></div></div>
      <div className="mt-3 flex items-center justify-end gap-1 text-xs font-medium text-primary">View client <ArrowUpRight className="size-3.5" /></div>
    </button>
  );
}
