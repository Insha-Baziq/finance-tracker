export const REIMBURSEMENT_OWNERS = ["baziq", "insha"] as const;

export type ReimbursementOwner = (typeof REIMBURSEMENT_OWNERS)[number];
export type ReimbursementStatus = "pending" | "paid";

export interface PersonalExpense {
  id: string;
  owner: ReimbursementOwner;
  expenseName: string;
  amount: number;
  category?: string;
  expenseDate: string;
  description: string;
  status: ReimbursementStatus;
  reimbursementTransactionId?: string;
  paidAt?: string;
  createdAt: string;
}

export const REIMBURSEMENT_OWNER_LABELS: Record<ReimbursementOwner, string> = {
  baziq: "Baziq",
  insha: "Insha",
};

export function isReimbursementOwner(value: unknown): value is ReimbursementOwner {
  return typeof value === "string" && REIMBURSEMENT_OWNERS.includes(value as ReimbursementOwner);
}
