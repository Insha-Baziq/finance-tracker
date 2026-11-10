"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Combobox } from "@/components/ui/combobox";
import { RefundTransactionPicker } from "@/components/refund-transaction-picker";

interface Category {
  id: string;
  name: string;
}

interface Transaction {
  id: string;
  type: "payment" | "expense" | "refund";
  source?: string;
  orderDate?: string;
  orderId?: string;
  username?: string;
  amount: number;
  category?: string;
  expenseName?: string;
  expenseDate?: string;
  description: string;
  createdAt: string;
}

interface TransactionPayload {
  type: "payment" | "expense" | "refund";
  amount: number;
  description: string;
  source?: string;
  orderDate?: string;
  clearingDate?: string;
  status?: string;
  username?: string;
  orderId?: string | null;
  grossAmount?: number;
  fees?: number;
  netAmount?: number;
  category?: string;
  expenseName?: string;
  expenseDate?: string;
  refundFor?: "payment" | "expense";
  refundedTransactionId?: string;
  refundDate?: string;
}

export default function AddTransaction() {
  const router = useRouter();
  const [type, setType] = useState<"payment" | "expense" | "refund">("payment");
  
  // Common fields
  const [amount, setAmount] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [category, setCategory] = useState<string>("");
  const [expenseName, setExpenseName] = useState<string>("");
  const [expenseDate, setExpenseDate] = useState<string>("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Payment-specific fields
  const [source, setSource] = useState<string>("fiverr");
  const [upworkFee, setUpworkFee] = useState<string>("");
  const [orderDate, setOrderDate] = useState<string>("");
  const [clearingDate, setClearingDate] = useState<string>("");
  const [status, setStatus] = useState<string>("Completed");
  const [username, setUsername] = useState<string>("");
  const [orderId, setOrderId] = useState<string>("");
  const [refundFor, setRefundFor] = useState<"payment" | "expense">("expense");
  const [refundedTransactionId, setRefundedTransactionId] = useState<string>("");
  const [refundDate, setRefundDate] = useState<string>("");
  
  // Calculated values
  const parsedAmount = Number.parseFloat(amount) || 0;
  const calculatedFee = source === "fiverr"
    ? parsedAmount * 0.2
    : source === "upwork"
      ? Number.parseFloat(upworkFee) || 0
      : 0;
  const calculatedNet = parsedAmount - calculatedFee;

  useEffect(() => {
    fetchCategories();
    fetchTransactions();
  }, []);

  const clientSuggestions = useMemo(
    () =>
      Array.from(
        new Set(
          transactions
            .filter((tx) => tx.type === "payment" && tx.username)
            .map((tx) => tx.username as string)
        )
      ).sort((a, b) => a.localeCompare(b)),
    [transactions]
  );

  const refundCandidates = useMemo(
    () => transactions.filter((tx) => tx.type === refundFor),
    [refundFor, transactions]
  );

  const fetchCategories = async () => {
    try {
      const res = await fetch("/api/categories");
      const data = await res.json();
      setCategories(data);
      if (data.length > 0) {
        setCategory(data[0].name);
      }
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

  const fetchTransactions = async () => {
    try {
      const res = await fetch("/api/transactions");
      const data = await res.json();
      setTransactions(data);
    } catch (error) {
      console.error("Error fetching transactions:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (type === "refund" && !refundedTransactionId) {
      alert(`Select the ${refundFor} transaction this refund applies to`);
      return;
    }
    if (type === "payment" && !username.trim()) {
      alert("Enter a client username");
      return;
    }
    if (type === "payment" && source === "upwork") {
      const fee = Number.parseFloat(upworkFee);
      if (upworkFee.trim() === "" || !Number.isFinite(fee) || fee < 0 || fee > parsedAmount) {
        alert("Enter the actual Upwork fee for this payment (enter 0 if there was no fee). The fee cannot exceed the gross amount.");
        return;
      }
    }

    setIsLoading(true);

    try {
      const payload: TransactionPayload = {
        type,
        amount: parseFloat(amount),
        description,
      };

      if (type === "payment") {
        payload.source = source;
        payload.orderDate = orderDate;
        payload.clearingDate = clearingDate;
        payload.status = status;
        payload.username = username;
        payload.orderId = orderId || null;
        
        payload.grossAmount = parsedAmount;
        payload.fees = calculatedFee;
        payload.netAmount = calculatedNet;
      } else if (type === "expense") {
        payload.category = category;
        payload.expenseName = expenseName;
        payload.expenseDate = expenseDate;
        payload.orderDate = expenseDate;
      } else {
        payload.refundFor = refundFor;
        payload.refundedTransactionId = refundedTransactionId;
        payload.refundDate = refundDate;
        payload.orderDate = refundDate;
      }

      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        router.push("/");
        router.refresh();
      } else {
        alert("Failed to create transaction");
      }
    } catch (error) {
      console.error("Error creating transaction:", error);
      alert("Failed to create transaction");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 pb-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Add transaction</h1>
        <p className="mt-1 text-sm text-muted-foreground">Record income, expenses, and refunds.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Transaction type</CardTitle>
          </CardHeader>
          <CardContent>
            <ToggleGroup
              type="single"
              value={type}
              onValueChange={(value) => value && setType(value as "payment" | "expense" | "refund")}
              className="w-full grid grid-cols-3 gap-2"
            >
              <ToggleGroupItem value="payment" className="h-10 px-2 text-xs sm:text-sm border data-[state=on]:border-primary">
                Payment
              </ToggleGroupItem>
              <ToggleGroupItem value="expense" className="h-10 px-2 text-xs sm:text-sm border data-[state=on]:border-primary">
                Expense
              </ToggleGroupItem>
              <ToggleGroupItem value="refund" className="h-10 px-2 text-xs sm:text-sm border data-[state=on]:border-primary">
                Refund
              </ToggleGroupItem>
            </ToggleGroup>
          </CardContent>
        </Card>

        {type === "payment" ? (
          <Card>
            <CardHeader>
              <CardTitle>Payment details</CardTitle>
            </CardHeader>
            <CardContent>
              <FieldGroup className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <Field className="gap-2 sm:col-span-2"><FieldLabel>Source</FieldLabel>
                <Select value={source} onValueChange={(value) => { setSource(value); setUpworkFee(""); }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select source" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fiverr">Fiverr</SelectItem>
                    <SelectItem value="upwork">Upwork</SelectItem>
                    <SelectItem value="bank">Bank Transfer</SelectItem>
                  </SelectContent>
                </Select>
              </Field>

              <div className="grid grid-cols-1 gap-4 sm:col-span-2 sm:grid-cols-2">
                <Field className="gap-2"><FieldLabel>Order Date</FieldLabel>
                  <Input
                    type="date"
                    value={orderDate}
                    onChange={(e) => setOrderDate(e.target.value)}
                    required
                  />
                </Field>
                <Field className="gap-2"><FieldLabel>Clearing Date</FieldLabel>
                  <Input
                    type="date"
                    value={clearingDate}
                    onChange={(e) => setClearingDate(e.target.value)}
                  />
                </Field>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:col-span-2 sm:grid-cols-2">
                <Field className="gap-2"><FieldLabel>Status</FieldLabel>
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Completed">Completed</SelectItem>
                      <SelectItem value="Clearing">Clearing</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field className="gap-2"><FieldLabel htmlFor="client-username">Client username</FieldLabel>
                  <Combobox
                    id="client-username"
                    value={username}
                    onChange={setUsername}
                    suggestions={clientSuggestions}
                    placeholder="Search or add client..."
                  />
                </Field>
              </div>

              <Field className="gap-2"><FieldLabel>Order ID</FieldLabel>
                <Input
                  placeholder="e.g., FO61B5C2BF782 (optional for non-Fiverr)"
                  value={orderId}
                  onChange={(e) => setOrderId(e.target.value)}
                />
              </Field>

              <Field className="gap-2"><FieldLabel>Gross amount (USD)</FieldLabel>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                />
              </Field>

              {source === "upwork" && (
                <Field className="gap-2">
                  <FieldLabel htmlFor="upwork-fee">Upwork fee (USD)</FieldLabel>
                  <Input
                    id="upwork-fee"
                    type="number"
                    step="0.01"
                    min="0"
                    max={parsedAmount || undefined}
                    placeholder="Enter fee from Upwork statement"
                    value={upworkFee}
                    onChange={(e) => setUpworkFee(e.target.value)}
                    required
                  />
                  <p className="text-xs text-muted-foreground">Enter the fee shown for this payment. Enter 0 if no fee was charged.</p>
                </Field>
              )}

              {amount && (
                <div className="space-y-2 rounded-lg bg-muted p-4 sm:col-span-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Gross amount:</span>
                    <span className="font-medium">${parseFloat(amount || "0").toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>{source === "fiverr" ? "Fiverr fee (20%):" : source === "upwork" ? "Upwork fee:" : "Platform fee:"}</span>
                    <span className="font-medium">-${calculatedFee.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold border-t pt-2">
                    <span>Net Amount:</span>
                    <span>${calculatedNet.toFixed(2)}</span>
                  </div>
                </div>
              )}

              <Field className="gap-2 sm:col-span-2"><FieldLabel>Description (optional)</FieldLabel>
                <Textarea
                  placeholder="Client name or description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </Field>
            </FieldGroup>
            </CardContent>
          </Card>
        ) : type === "expense" ? (
          <Card>
            <CardHeader>
              <CardTitle>Expense details</CardTitle>
            </CardHeader>
            <CardContent>
              <FieldGroup className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <Field className="gap-2"><FieldLabel>Expense Name</FieldLabel>
                <Input
                  placeholder="e.g., CloudCode Subscription"
                  value={expenseName}
                  onChange={(e) => setExpenseName(e.target.value)}
                  required
                />
              </Field>

              <Field className="gap-2"><FieldLabel>Expense Date</FieldLabel>
                <Input
                  type="date"
                  value={expenseDate}
                  onChange={(e) => setExpenseDate(e.target.value)}
                  required
                />
              </Field>

              <Field className="gap-2"><FieldLabel>Category</FieldLabel>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.name}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field className="gap-2"><FieldLabel>Amount (USD)</FieldLabel>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                />
              </Field>

              <Field className="gap-2 sm:col-span-2"><FieldLabel>Description (optional)</FieldLabel>
                <Textarea
                  placeholder="What was this expense for?"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </Field>
            </FieldGroup>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Refund details</CardTitle>
            </CardHeader>
            <CardContent>
              <FieldGroup className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <Field className="gap-2"><FieldLabel>Refund Applies To</FieldLabel>
                <Select
                  value={refundFor}
                  onValueChange={(value) => {
                    setRefundFor(value as "payment" | "expense");
                    setRefundedTransactionId("");
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select refund type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="expense">Expense</SelectItem>
                    <SelectItem value="payment">Payment</SelectItem>
                  </SelectContent>
                </Select>
              </Field>

              <Field className="gap-2 sm:col-span-2"><FieldLabel>Original Transaction</FieldLabel>
                <RefundTransactionPicker
                  transactions={transactions}
                  refundFor={refundFor}
                  value={refundedTransactionId}
                  onChange={setRefundedTransactionId}
                />
                {refundCandidates.length === 0 && (
                  <p className="text-sm text-muted-foreground mt-2">No {refundFor} transactions available to refund.</p>
                )}
              </Field>

              <Field className="gap-2"><FieldLabel>Refund Date</FieldLabel>
                <Input
                  type="date"
                  value={refundDate}
                  onChange={(e) => setRefundDate(e.target.value)}
                  required
                />
              </Field>

              <Field className="gap-2"><FieldLabel>Refund Amount (USD)</FieldLabel>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                />
              </Field>

              <Field className="gap-2 sm:col-span-2"><FieldLabel>Description (optional)</FieldLabel>
                <Textarea
                  placeholder="What refund was received or issued?"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </Field>
            </FieldGroup>
            </CardContent>
          </Card>
        )}

        <div className="flex gap-3 sm:gap-4">
          <Button type="submit" disabled={isLoading || (type === "refund" && !refundedTransactionId)} className="flex-1 sm:flex-none h-10">
            {isLoading ? "Saving..." : "Save"}
          </Button>
          <Button type="button" variant="outline" className="flex-1 sm:flex-none h-10" onClick={() => router.back()}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
