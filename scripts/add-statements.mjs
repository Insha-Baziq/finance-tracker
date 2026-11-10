import { Redis } from "@upstash/redis";
import fs from "fs";
import crypto from "crypto";

const env = fs.readFileSync(".env.local", "utf8");
const url = env.match(/UPSTASH_REDIS_REST_URL="(.*)"/)[1];
const token = env.match(/UPSTASH_REDIS_REST_TOKEN="(.*)"/)[1];
const redis = new Redis({ url, token });

const expense = (date, usd, name, category, desc) => ({
  type: "expense",
  orderDate: date,
  amount: usd,
  category,
  expenseName: name,
  expenseDate: date,
  description: desc,
  createdAt: `${date}T12:00:00.000Z`,
});

const fiverrPayment = (orderDate, clearingDate, username, orderId, gross, desc) => ({
  type: "payment",
  source: "fiverr",
  orderDate,
  clearingDate,
  status: "Completed",
  username,
  orderId,
  grossAmount: gross,
  fees: +(gross * 0.2).toFixed(2),
  netAmount: +(gross * 0.8).toFixed(2),
  amount: gross,
  description: desc,
  createdAt: `${orderDate}T12:00:00.000Z`,
});

const newTransactions = [
  // nsave
  {
    type: "payment",
    source: "bank",
    orderDate: "2026-07-14",
    clearingDate: "",
    status: "Completed",
    orderId: "MoneyGram deposit",
    grossAmount: 25,
    fees: 0,
    netAmount: 25,
    amount: 25,
    description: "Client payment via MoneyGram (nsave)",
    createdAt: "2026-07-14T12:00:00.000Z",
  },
  expense("2026-09-08", 37.72, "Magnific AI subscription", "Subscription", "MAGNIFIC statement expense"),
  expense("2026-09-21", 20, "Claude Pro Subscription (neddatascience@gmail.com)", "Subscription", "ANTHROPIC* CLAUDE SUB statement expense (nsave)"),
  // NayaPay
  expense("2026-07-20", 9.99, "Upwork Freelancer Plus membership", "Subscription", "Upwork -936555730Membersh statement expense"),
  expense("2026-07-26", 20, "Claude Pro Subscription (neddatascience@gmail.com)", "Subscription", "ANTHROPIC* CLAUDE SUB statement expense"),
  expense("2026-07-26", 10.39, "Opencode Subscription (neddatascience@gmail.com)", "Tools", "ANOMALY statement expense"),
  expense("2026-07-27", 10.8, "OpenRouter credits", "Tools", "OPENROUTER, INC statement expense"),
  expense("2026-08-05", 15, "Upwork Connects", "Subscription", "Upwork -941390584Connects statement expense"),
  expense("2026-08-06", 30.11, "Higgsfield subscription", "Subscription", "HIGGSFIELD INC. statement expense"),
  expense("2026-08-18", 5.18, "Opencode Subscription (neddatascience@gmail.com)", "Tools", "ANOMALY statement expense"),
  expense("2026-08-26", 20, "Claude Pro Subscription (neddatascience@gmail.com)", "Subscription", "ANTHROPIC* CLAUDE SUB statement expense"),
  expense("2026-09-03", 18, "Heroku credits", "Tools", "HEROKU* AUG-113700133 statement expense"),
  expense("2026-09-06", 10, "BytePlus credits", "Tools", "BYTEPLUS BYTEPLUS.COM statement expense"),
  // Fiverr payments (CSV amounts are net; gross = net / 0.8)
  fiverrPayment("2026-08-29", "2026-09-12", "shabina_khan786", "Fiverr Order FO7310680D847", 20, "Fiverr Order"),
  fiverrPayment("2026-09-04", "2026-09-18", "shabina_khan786", "Fiverr Order FO52A12F129C7", 90, "Fiverr Order"),
  fiverrPayment("2026-09-05", "2026-09-19", "usmanstudios", "Fiverr Order FO21506695F44", 50, "Fiverr Order"),
  // Fiverr expenses
  expense("2026-08-01", 3.47, "Fiverr Ads", "Other", "Fiverr Ads statement expense"),
  expense("2026-08-23", 25, "Fiverr Standard plan subscription", "Subscription", "Fiverr Standard plan statement expense"),
];

(async () => {
  const transactions = await redis.get("transactions");
  const before = transactions.length;

  const withIds = newTransactions.map((t) => ({
    ...t,
    id: crypto.randomUUID(),
  }));

  await redis.set("transactions", [...transactions, ...withIds]);

  const after = await redis.get("transactions");
  console.log(`Before: ${before} | Added: ${withIds.length} | After: ${after.length}`);
  withIds.forEach((t) => {
    const name = t.type === "payment" ? t.orderId : t.expenseName;
    console.log(`  [${t.type}] ${t.orderDate || t.expenseDate} - ${name} - $${t.amount}`);
  });
})();
