import assert from "node:assert/strict";
import test from "node:test";
import { calculateCompletedNetRevenue, calculateDashboardSummary } from "../src/lib/summary.ts";

test("completed net revenue deducts platform fees and payment refunds", () => {
  const netRevenue = calculateCompletedNetRevenue([
    { type: "payment", status: "Completed", amount: 100, fees: 20, netAmount: 80 },
    { type: "payment", status: "Completed", amount: 200, fees: 15, netAmount: 185 },
    { type: "payment", status: "Completed", amount: 50, fees: 5 },
    { type: "payment", status: "Clearing", amount: 500, fees: 100, netAmount: 400 },
    { type: "refund", refundFor: "payment", amount: 10 },
    { type: "refund", refundFor: "expense", amount: 25 },
  ]);

  assert.equal(netRevenue, 300);
});

test("dashboard keeps gross revenue before fees and reports take-home after fees", () => {
  const summary = calculateDashboardSummary([
    { type: "payment", status: "Completed", amount: 100, grossAmount: 100, netAmount: 80 },
    { type: "refund", refundFor: "payment", amount: 5 },
  ]);

  assert.deepEqual(summary, {
    totalGross: 95,
    totalFees: 20,
    totalNet: 75,
    totalExpenses: 0,
    netProfit: 75,
  });
});

test("refunds adjust dashboard totals by refunded transaction type", () => {
  const summary = calculateDashboardSummary([
    {
      id: "payment-1",
      type: "payment",
      status: "Completed",
      amount: 100,
      fees: 20,
      description: "Fiverr order",
      createdAt: "2026-06-01T00:00:00.000Z",
    },
    {
      id: "expense-1",
      type: "expense",
      amount: 90,
      description: "GitHub Copilot",
      createdAt: "2026-06-02T00:00:00.000Z",
    },
    {
      id: "refund-1",
      type: "refund",
      refundFor: "expense",
      refundedTransactionId: "expense-1",
      amount: 30,
      description: "Partial Copilot refund",
      createdAt: "2026-06-03T00:00:00.000Z",
    },
    {
      id: "refund-2",
      type: "refund",
      refundFor: "expense",
      refundedTransactionId: "expense-1",
      amount: 60,
      description: "Remaining Copilot refund",
      createdAt: "2026-06-04T00:00:00.000Z",
    },
    {
      id: "refund-3",
      type: "refund",
      refundFor: "payment",
      refundedTransactionId: "payment-1",
      amount: 10,
      description: "Client refund",
      createdAt: "2026-06-05T00:00:00.000Z",
    },
  ]);

  assert.deepEqual(summary, {
    totalGross: 90,
    totalFees: 20,
    totalNet: 70,
    totalExpenses: 0,
    netProfit: 70,
  });
});
