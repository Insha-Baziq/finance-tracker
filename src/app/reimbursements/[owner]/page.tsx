import { notFound } from "next/navigation";
import { PersonalReimbursementLedger } from "@/components/reimbursements/personal-reimbursement-ledger";
import { isReimbursementOwner } from "@/lib/reimbursements";

export default async function PersonalLedgerPage({
  params,
}: {
  params: Promise<{ owner: string }>;
}) {
  const { owner } = await params;
  if (!isReimbursementOwner(owner)) notFound();

  return <PersonalReimbursementLedger owner={owner} />;
}
