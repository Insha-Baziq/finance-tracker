import { Redis } from "@upstash/redis";
import fs from "fs";
import crypto from "crypto";

const env = fs.readFileSync(".env.local", "utf8");
const url = env.match(/UPSTASH_REDIS_REST_URL="(.*)"/)[1];
const token = env.match(/UPSTASH_REDIS_REST_TOKEN="(.*)"/)[1];
const redis = new Redis({ url, token });

const RATE = 278;
const pkr = (amount) => +(amount / RATE).toFixed(2);

const expense = (date, amountPkr) => ({
  type: "expense",
  orderDate: date,
  amount: pkr(amountPkr),
  category: "Subscription",
  expenseName: "ChatGPT Plus subscription (Codex via Deedan Sajid reseller)",
  expenseDate: date,
  description: "Paid to Muhammad Deedan Sajid (ChatGPT reseller) - Raast Out statement expense",
  createdAt: `${date}T12:00:00.000Z`,
});

const refund = (date, amountPkr, refundedTransactionId, description) => ({
  type: "refund",
  orderDate: date,
  refundFor: "expense",
  refundedTransactionId,
  refundDate: date,
  amount: pkr(amountPkr),
  description,
  id: crypto.randomUUID(),
  createdAt: `${date}T12:00:00.000Z`,
});

(async () => {
  const transactions = await redis.get("transactions");
  const before = transactions.length;

  const subAug1 = { ...expense("2026-08-01", 3500), id: crypto.randomUUID() };
  const subAug19 = { ...expense("2026-08-19", 3500), id: crypto.randomUUID() };
  const subSep16 = { ...expense("2026-09-16", 3500), id: crypto.randomUUID() };

  const refundFull = refund(
    "2026-08-23", 3500, subAug19.id,
    "Full refund - reseller had no account available (Rs 3,500 received 23 Aug)"
  );
  const refundPartial = refund(
    "2026-08-23", 817, subAug1.id,
    "Partial refund - access revoked after 20 of 30 days, 10 days refunded (Rs 817 received 23 Aug)"
  );

  const newOnes = [subAug1, subAug19, subSep16, refundFull, refundPartial];
  await redis.set("transactions", [...transactions, ...newOnes]);

  const after = await redis.get("transactions");
  console.log(`Before: ${before} | Added: ${newOnes.length} | After: ${after.length}`);
  newOnes.forEach((t) => {
    const name = t.type === "refund" ? `REFUND (${t.description.slice(0, 40)}...)` : t.expenseName;
    console.log(`  [${t.type}] ${t.orderDate} - ${name} - $${t.amount}`);
  });
})();
