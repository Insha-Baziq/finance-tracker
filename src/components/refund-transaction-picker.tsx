"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  filterTransactionsForPicker,
  formatTransactionDate,
  formatUsd,
  getTransactionDate,
  getTransactionLabel,
  type TransactionLike,
} from "@/lib/transaction-utils";

interface RefundTransactionPickerProps {
  transactions: TransactionLike[];
  refundFor: "payment" | "expense";
  value: string;
  onChange: (id: string) => void;
  excludedId?: string;
}

export function RefundTransactionPicker({
  transactions,
  refundFor,
  value,
  onChange,
  excludedId,
}: RefundTransactionPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const selectedTransaction = transactions.find((transaction) => transaction.id === value);
  const matches = useMemo(
    () => filterTransactionsForPicker(transactions, refundFor, query, excludedId),
    [excludedId, query, refundFor, transactions]
  );

  return (
    <>
      <Button
        type="button"
        variant="outline"
        className="h-auto min-h-11 w-full justify-start whitespace-normal px-3 py-2 text-left font-normal"
        onClick={() => setIsOpen(true)}
      >
        {selectedTransaction ? getTransactionLabel(selectedTransaction) : `Select ${refundFor} transaction`}
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Select {refundFor} transaction</DialogTitle>
            <DialogDescription>
              Search by name, date, amount, category, source, username, order ID, or description.
            </DialogDescription>
          </DialogHeader>

          <Input
            autoFocus
            placeholder={`Search ${refundFor}s...`}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />

          <div className="max-h-[420px] overflow-y-auto rounded-md border">
            {matches.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                No matching {refundFor} transactions found.
              </div>
            ) : (
              <div className="divide-y">
                {matches.map((transaction) => {
                  const date = getTransactionDate(transaction);
                  const title = transaction.type === "payment"
                    ? transaction.orderId || transaction.username || transaction.description || "Payment"
                    : transaction.expenseName || transaction.description || "Expense";
                  const meta = transaction.type === "payment"
                    ? [transaction.source, transaction.username, formatTransactionDate(date)].filter(Boolean).join(" - ")
                    : [transaction.category, formatTransactionDate(date)].filter(Boolean).join(" - ");

                  return (
                    <button
                      key={transaction.id}
                      type="button"
                      className="w-full px-4 py-3 text-left transition-colors hover:bg-muted/70 focus:bg-muted/70 focus:outline-none"
                      onClick={() => {
                        onChange(transaction.id);
                        setIsOpen(false);
                        setQuery("");
                      }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 space-y-1">
                          <p className="truncate text-sm font-medium">{title}</p>
                          <p className="text-xs text-muted-foreground">{meta}</p>
                          {transaction.description && transaction.description !== title && (
                            <p className="line-clamp-2 text-xs text-muted-foreground">{transaction.description}</p>
                          )}
                        </div>
                        <span className="shrink-0 text-sm font-semibold">{formatUsd(transaction.amount)}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
