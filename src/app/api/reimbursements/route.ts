import { NextRequest, NextResponse } from "next/server";
import { requireAuthenticatedRequest } from "@/lib/api-auth";
import { addPersonalExpense, getAllPersonalExpenses, withPersonalExpensesLock } from "@/lib/redis";
import { isReimbursementOwner } from "@/lib/reimbursements";

function isDateOnly(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export async function GET(request: NextRequest) {
  const authResponse = requireAuthenticatedRequest(request);
  if (authResponse) return authResponse;

  try {
    return NextResponse.json(await getAllPersonalExpenses());
  } catch (error) {
    console.error("Error getting personal expenses:", error);
    return NextResponse.json({ error: "Failed to get personal expenses" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const authResponse = requireAuthenticatedRequest(request);
  if (authResponse) return authResponse;

  try {
    const body = await request.json();
    const amount = Number(body.amount);
    const expenseName = typeof body.expenseName === "string" ? body.expenseName.trim() : "";
    const category = typeof body.category === "string" ? body.category.trim() : "";
    const description = typeof body.description === "string" ? body.description.trim() : "";

    if (!isReimbursementOwner(body.owner) || !expenseName || expenseName.length > 120) {
      return NextResponse.json({ error: "Choose a ledger owner and enter an expense name" }, { status: 400 });
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: "Enter an amount greater than zero" }, { status: 400 });
    }
    if (!isDateOnly(body.expenseDate)) {
      return NextResponse.json({ error: "Enter a valid expense date" }, { status: 400 });
    }

    const expense = await withPersonalExpensesLock(() => addPersonalExpense({
      owner: body.owner,
      amount,
      expenseName,
      category: category || undefined,
      expenseDate: body.expenseDate,
      description: description.slice(0, 500),
    }));

    return NextResponse.json(expense, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to add personal expense";
    const status = message.includes("being updated") ? 409 : 500;
    if (status === 500) console.error("Error adding personal expense:", error);
    return NextResponse.json({ error: message }, { status });
  }
}
