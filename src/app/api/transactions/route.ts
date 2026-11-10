import { NextRequest, NextResponse } from "next/server";
import { getAllTransactions, addTransaction, deleteTransaction, updateTransaction, addNotification, getNotifications, markNotificationRead, markAllNotificationsRead, getAllTransactions as getTransactions } from "@/lib/redis";

export async function GET() {
  try {
    const transactions = await getAllTransactions();
    return NextResponse.json(transactions);
  } catch (error) {
    console.error("Error getting transactions:", error);
    return NextResponse.json({ error: "Failed to get transactions" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    if (!body.type || !body.amount) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const transaction = await addTransaction({
      type: body.type,
      source: body.source,
      orderDate: body.orderDate,
      clearingDate: body.clearingDate,
      status: body.status,
      username: body.username,
      orderId: body.orderId,
      grossAmount: body.grossAmount,
      fees: body.fees,
      netAmount: body.netAmount,
      amount: body.amount,
      category: body.category,
      expenseName: body.expenseName,
      expenseDate: body.expenseDate,
      refundFor: body.refundFor,
      refundedTransactionId: body.refundedTransactionId,
      refundDate: body.refundDate,
      description: body.description || "",
    });

    return NextResponse.json(transaction);
  } catch (error) {
    console.error("Error creating transaction:", error);
    return NextResponse.json({ error: "Failed to create transaction" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: "Missing transaction ID" }, { status: 400 });
    }

    const existing = (await getAllTransactions()).find((transaction) => transaction.id === id);
    if (existing?.personalExpenseId) {
      return NextResponse.json({ error: "This expense is linked to a personal reimbursement ledger" }, { status: 409 });
    }

    const transaction = await updateTransaction(id, updates);
    if (!transaction) {
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
    }

    return NextResponse.json(transaction);
  } catch (error) {
    console.error("Error updating transaction:", error);
    return NextResponse.json({ error: "Failed to update transaction" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Missing transaction ID" }, { status: 400 });
    }

    const existing = (await getAllTransactions()).find((transaction) => transaction.id === id);
    if (existing?.personalExpenseId) {
      return NextResponse.json({ error: "This expense is linked to a personal reimbursement ledger" }, { status: 409 });
    }

    await deleteTransaction(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting transaction:", error);
    return NextResponse.json({ error: "Failed to delete transaction" }, { status: 500 });
  }
}
