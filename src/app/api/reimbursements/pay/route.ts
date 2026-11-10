import { NextRequest, NextResponse } from "next/server";
import { requireAuthenticatedRequest } from "@/lib/api-auth";
import {
  getAllPersonalExpenses,
  getAllTransactions,
  saveAllPersonalExpenses,
  saveAllTransactions,
  withPersonalExpensesLock,
} from "@/lib/redis";
import type { Transaction } from "@/lib/redis";

export async function POST(request: NextRequest) {
  const authResponse = requireAuthenticatedRequest(request);
  if (authResponse) return authResponse;

  try {
    const body = await request.json();
    const ids = Array.isArray(body.ids)
      ? Array.from(new Set(body.ids.filter((id: unknown): id is string => typeof id === "string" && id.length > 0)))
      : [];

    if (ids.length === 0 || ids.length > 100) {
      return NextResponse.json({ error: "Select between 1 and 100 expenses" }, { status: 400 });
    }

    const result = await withPersonalExpensesLock(async () => {
      const expenses = await getAllPersonalExpenses();
      const selected = expenses.filter((expense) => ids.includes(expense.id));
      if (selected.length !== ids.length) {
        return { error: "One or more selected expenses could not be found", status: 404 as const };
      }

      const transactions = await getAllTransactions();
      const nextTransactions = [...transactions];
      const updatedById = new Map<string, (typeof expenses)[number]>();
      let transactionsChanged = false;

      for (const expense of selected) {
        if (expense.status === "paid") continue;

        let transaction = nextTransactions.find((item) => item.personalExpenseId === expense.id);
        if (!transaction) {
          const newTransaction: Transaction = {
            id: crypto.randomUUID(),
            type: "expense",
            amount: expense.amount,
            category: expense.category,
            expenseName: expense.expenseName,
            expenseDate: expense.expenseDate,
            description: expense.description || expense.expenseName,
            personalExpenseId: expense.id,
            personalExpenseOwner: expense.owner,
            createdAt: new Date().toISOString(),
          };
          nextTransactions.unshift(newTransaction);
          transaction = newTransaction;
          transactionsChanged = true;
        }

        updatedById.set(expense.id, {
          ...expense,
          status: "paid",
          paidAt: expense.paidAt || new Date().toISOString(),
          reimbursementTransactionId: transaction.id,
        });
      }

      if (transactionsChanged) await saveAllTransactions(nextTransactions);

      const updatedExpenses = expenses.map((expense) => updatedById.get(expense.id) || expense);
      if (updatedById.size > 0) await saveAllPersonalExpenses(updatedExpenses);

      return {
        paid: selected.map((expense) => updatedById.get(expense.id) || expense),
        status: 200 as const,
      };
    });

    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    return NextResponse.json({ paid: result.paid });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to record reimbursement";
    const status = message.includes("being updated") ? 409 : 500;
    if (status === 500) console.error("Error recording reimbursement:", error);
    return NextResponse.json({ error: message }, { status });
  }
}
