import { NextRequest, NextResponse } from "next/server";
import { addCharityPayment, getCharityPayments, updateCharityPayment } from "@/lib/redis";

function isDateOnly(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export async function GET() {
  try {
    return NextResponse.json(await getCharityPayments());
  } catch (error) {
    console.error("Error getting charity payments:", error);
    return NextResponse.json({ error: "Failed to get charity payments" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const amount = Number(body.amount);
    const recipient = typeof body.recipient === "string" ? body.recipient.trim() : "";

    if (!Number.isFinite(amount) || amount <= 0 || !recipient || !isDateOnly(body.paidAt)) {
      return NextResponse.json(
        { error: "Enter a positive amount, recipient, and valid payment date." },
        { status: 400 },
      );
    }

    const payment = await addCharityPayment({
      amount,
      recipient,
      paidAt: body.paidAt,
      notes: typeof body.notes === "string" ? body.notes.trim() || undefined : undefined,
    });

    return NextResponse.json(payment, { status: 201 });
  } catch (error) {
    console.error("Error recording charity payment:", error);
    return NextResponse.json({ error: "Failed to record charity payment" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const id = typeof body.id === "string" ? body.id.trim() : "";
    const amount = Number(body.amount);
    const recipient = typeof body.recipient === "string" ? body.recipient.trim() : "";

    if (!id || !Number.isFinite(amount) || amount <= 0 || !recipient || !isDateOnly(body.paidAt)) {
      return NextResponse.json(
        { error: "Enter a positive amount, recipient, and valid payment date." },
        { status: 400 },
      );
    }

    const payment = await updateCharityPayment(id, {
      amount,
      recipient,
      paidAt: body.paidAt,
      notes: typeof body.notes === "string" ? body.notes.trim() || undefined : undefined,
    });

    if (!payment) return NextResponse.json({ error: "Charity payment not found." }, { status: 404 });
    return NextResponse.json(payment);
  } catch (error) {
    console.error("Error updating charity payment:", error);
    return NextResponse.json({ error: "Failed to update charity payment" }, { status: 500 });
  }
}
