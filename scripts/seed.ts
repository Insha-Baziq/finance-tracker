import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const KEYS = {
  TRANSACTIONS: "transactions",
} as const;

const sampleTransactions = [
  {
    type: "payment" as const,
    source: "fiverr",
    orderDate: "2026-01-13",
    clearingDate: "2026-01-27",
    status: "Completed",
    username: "jodel12",
    orderId: "FO61B5C2BF782",
    grossAmount: 23.0,
    fees: 4.6,
    netAmount: 18.4,
    amount: 23.0,
    description: "Fiverr Order",
  },
  {
    type: "payment" as const,
    source: "fiverr",
    orderDate: "2026-01-25",
    clearingDate: "2026-02-08",
    status: "Completed",
    username: "joselodongo",
    orderId: "FO41B686FD584",
    grossAmount: 10.0,
    fees: 2.0,
    netAmount: 8.0,
    amount: 10.0,
    description: "Fiverr Order",
  },
  {
    type: "payment" as const,
    source: "fiverr",
    orderDate: "2026-01-28",
    clearingDate: "2026-02-11",
    status: "Completed",
    username: "jodel12",
    orderId: "FO62242D48F04",
    grossAmount: 25.0,
    fees: 5.0,
    netAmount: 20.0,
    amount: 25.0,
    description: "Fiverr Order",
  },
  {
    type: "payment" as const,
    source: "fiverr",
    orderDate: "2026-02-02",
    clearingDate: "2026-02-16",
    status: "Completed",
    username: "joselodongo",
    orderId: "FO5224C0E9205",
    grossAmount: 10.0,
    fees: 2.0,
    netAmount: 8.0,
    amount: 10.0,
    description: "Fiverr Order",
  },
  {
    type: "payment" as const,
    source: "fiverr",
    orderDate: "2026-02-06",
    clearingDate: "2026-02-20",
    status: "Completed",
    username: "jodel12",
    orderId: "FO5292C33E3C7",
    grossAmount: 80.0,
    fees: 16.0,
    netAmount: 64.0,
    amount: 80.0,
    description: "Fiverr Order",
  },
  {
    type: "payment" as const,
    source: "fiverr",
    orderDate: "2026-02-08",
    clearingDate: "2026-02-22",
    status: "Clearing",
    username: "joselodongo",
    orderId: "FO32251E76F87",
    grossAmount: 10.0,
    fees: 2.0,
    netAmount: 8.0,
    amount: 10.0,
    description: "Fiverr Order",
  },
  {
    type: "payment" as const,
    source: "fiverr",
    orderDate: "2026-02-08",
    clearingDate: "2026-02-22",
    status: "Clearing",
    username: "swele_szn",
    orderId: "FO1DB986D843",
    grossAmount: 20.0,
    fees: 4.0,
    netAmount: 16.0,
    amount: 20.0,
    description: "Fiverr Order",
  },
  {
    type: "payment" as const,
    source: "fiverr",
    orderDate: "2026-02-11",
    clearingDate: "",
    status: "Completed",
    username: "swell_season",
    orderId: "",
    grossAmount: 40.0,
    fees: 0,
    netAmount: 40.0,
    amount: 40.0,
    description: "Fiverr Order (No Fee)",
  },
  {
    type: "payment" as const,
    source: "fiverr",
    orderDate: "2026-02-19",
    clearingDate: "2026-03-05",
    status: "Clearing",
    username: "joselodongo",
    orderId: "FO2DBF81CC42",
    grossAmount: 60.0,
    fees: 12.0,
    netAmount: 48.0,
    amount: 60.0,
    description: "Fiverr Order",
  },
];

async function seed() {
  console.log("Seeding transactions...");

  const transactionsWithIds = sampleTransactions.map((tx) => ({
    ...tx,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  }));

  await redis.set(KEYS.TRANSACTIONS, transactionsWithIds);

  console.log(`Added ${transactionsWithIds.length} transactions to the database.`);
  console.log("Total Gross:", transactionsWithIds.reduce((sum, tx) => sum + tx.grossAmount, 0));
  console.log("Total Fees:", transactionsWithIds.reduce((sum, tx) => sum + (tx.fees || 0), 0));
  console.log("Total Net:", transactionsWithIds.reduce((sum, tx) => sum + tx.netAmount, 0));
}

seed().catch(console.error);
