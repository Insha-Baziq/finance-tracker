"use client";

import { useState, type FormEvent } from "react";
import { LoaderCircle } from "lucide-react";
import { useCurrency } from "@/components/currency-provider";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { CharityPayment } from "@/lib/charity";

function getLocalDate() {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
}

export function CharityPaymentDialog({
  amountDue,
  disabled = false,
  onRecorded,
}: {
  amountDue: number;
  disabled?: boolean;
  onRecorded: (payment: CharityPayment) => void;
}) {
  const { currency, convert, exchangeRate } = useCurrency();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [recipient, setRecipient] = useState("");
  const [paidAt, setPaidAt] = useState("");
  const [notes, setNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (nextOpen) {
      setAmount(convert(amountDue).toFixed(2));
      setRecipient("");
      setPaidAt(getLocalDate());
      setNotes("");
      setError(null);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const displayAmount = Number(amount);
    if (!Number.isFinite(displayAmount) || displayAmount <= 0 || !recipient.trim() || !paidAt) {
      setError("Enter a valid amount, recipient, and payment date.");
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      const amountInUsd = currency === "PKR" ? displayAmount / exchangeRate : displayAmount;
      const response = await fetch("/api/charity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: amountInUsd,
          recipient: recipient.trim(),
          paidAt,
          notes: notes.trim(),
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not save the charity payment.");
      onRecorded(result as CharityPayment);
      setOpen(false);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not save the charity payment.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <Button type="button" onClick={() => handleOpenChange(true)} disabled={disabled}>
        Record payment
      </Button>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record charity payment</DialogTitle>
            <DialogDescription>
              Save where and when you sent the amount. You can record a partial payment and carry the remainder forward.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-2">
              <label htmlFor="charity-amount" className="text-sm font-medium">Amount ({currency})</label>
              <Input
                id="charity-amount"
                name="amount"
                type="number"
                inputMode="decimal"
                min="0.01"
                step="0.01"
                required
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
              />
              <p className="text-xs text-muted-foreground">Current balance: {currency} {convert(amountDue).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
            <div className="grid gap-2">
              <label htmlFor="charity-recipient" className="text-sm font-medium">Sent to</label>
              <Input
                id="charity-recipient"
                name="recipient"
                autoComplete="organization"
                placeholder="Charity or organization"
                required
                value={recipient}
                onChange={(event) => setRecipient(event.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <label htmlFor="charity-paid-at" className="text-sm font-medium">Date sent</label>
              <Input id="charity-paid-at" name="paidAt" type="date" required value={paidAt} onChange={(event) => setPaidAt(event.target.value)} />
            </div>
            <div className="grid gap-2">
              <label htmlFor="charity-notes" className="text-sm font-medium">Notes <span className="font-normal text-muted-foreground">(optional)</span></label>
              <Textarea id="charity-notes" name="notes" placeholder="Add any details you want to remember" value={notes} onChange={(event) => setNotes(event.target.value)} />
            </div>
            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isSaving}>Cancel</Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving && <LoaderCircle className="animate-spin" />}
                Save payment
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
