"use client";

import { useState, type FormEvent } from "react";
import { LoaderCircle, Pencil } from "lucide-react";
import { useCurrency } from "@/components/currency-provider";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { CharityPayment } from "@/lib/charity";

export function CharityPaymentEditDialog({
  payment,
  onSaved,
}: {
  payment: CharityPayment;
  onSaved: (payment: CharityPayment) => void;
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
      setAmount(convert(payment.amount).toFixed(2));
      setRecipient(payment.recipient);
      setPaidAt(payment.paidAt);
      setNotes(payment.notes || "");
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
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: payment.id,
          amount: amountInUsd,
          recipient: recipient.trim(),
          paidAt,
          notes: notes.trim(),
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not update the charity payment.");
      onSaved(result as CharityPayment);
      setOpen(false);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not update the charity payment.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <Button type="button" variant="ghost" size="icon-sm" aria-label={`Edit charity payment to ${payment.recipient}`} onClick={() => handleOpenChange(true)}>
        <Pencil className="size-4" />
      </Button>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit charity payment</DialogTitle>
            <DialogDescription>Correct the amount, recipient, date, or notes for this recorded payment.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-2">
              <label htmlFor={`charity-edit-amount-${payment.id}`} className="text-sm font-medium">Amount ({currency})</label>
              <Input
                id={`charity-edit-amount-${payment.id}`}
                name="amount"
                type="number"
                inputMode="decimal"
                min="0.01"
                step="0.01"
                required
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <label htmlFor={`charity-edit-recipient-${payment.id}`} className="text-sm font-medium">Sent to</label>
              <Input
                id={`charity-edit-recipient-${payment.id}`}
                name="recipient"
                autoComplete="organization"
                required
                value={recipient}
                onChange={(event) => setRecipient(event.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <label htmlFor={`charity-edit-date-${payment.id}`} className="text-sm font-medium">Date sent</label>
              <Input
                id={`charity-edit-date-${payment.id}`}
                name="paidAt"
                type="date"
                required
                value={paidAt}
                onChange={(event) => setPaidAt(event.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <label htmlFor={`charity-edit-notes-${payment.id}`} className="text-sm font-medium">Notes <span className="font-normal text-muted-foreground">(optional)</span></label>
              <Textarea
                id={`charity-edit-notes-${payment.id}`}
                name="notes"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
              />
            </div>
            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isSaving}>Cancel</Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving && <LoaderCircle className="animate-spin" />}
                Save changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
