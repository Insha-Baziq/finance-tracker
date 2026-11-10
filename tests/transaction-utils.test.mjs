import assert from "node:assert/strict";
import test from "node:test";
import { buildTransactionIndex, filterTransactionsForPicker, getTransactionLabel } from "../src/lib/transaction-utils.ts";

const transactions = [
  {
    id: "expense-1",
    type: "expense",
    amount: 10,
    category: "Subscription",
    expenseName: "GitHub Copilot",
    expenseDate: "2026-06-01",
    description: "Monthly plan",
    createdAt: "2026-06-01T00:00:00.000Z",
  },
  {
    id: "expense-2",
    type: "expense",
    amount: 30,
    category: "Subscription",
    expenseName: "GitHub Copilot",
    expenseDate: "2026-06-12",
    description: "Annual adjustment",
    createdAt: "2026-06-12T00:00:00.000Z",
  },
  {
    id: "payment-1",
    type: "payment",
    source: "fiverr",
    orderId: "FO123",
    username: "clientA",
    orderDate: "2026-06-02",
    amount: 100,
    description: "Landing page",
    createdAt: "2026-06-02T00:00:00.000Z",
  },
  {
    id: "refund-1",
    type: "refund",
    refundFor: "expense",
    refundedTransactionId: "expense-2",
    refundDate: "2026-06-13",
    amount: 15,
    description: "Partial refund",
    createdAt: "2026-06-13T00:00:00.000Z",
  },
];

test("transaction picker search distinguishes duplicate expense names by date and amount", () => {
  const matches = filterTransactionsForPicker(transactions, "expense", "2026-06-12 30");

  assert.equal(matches.length, 1);
  assert.equal(matches[0].id, "expense-2");
});

test("transaction labels include refund reference context", () => {
  const index = buildTransactionIndex(transactions);

  assert.equal(getTransactionLabel(transactions[3], index), "Refund for GitHub Copilot - 12 Jun 2026 - $30.00");
});
