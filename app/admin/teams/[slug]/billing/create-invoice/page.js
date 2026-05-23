"use client";

import { useParams, useSearchParams } from "next/navigation";
import InvoiceForm from "@/components/admin/billing/InvoiceForm";
import TeamAccessGate from "@/components/admin/team/TeamAccessGate";

export default function Page() {
  const params = useParams();
  const searchParams = useSearchParams();

  const teamId = params.slug;
  const memberId = searchParams.get("memberId");
  const period = searchParams.get("period");

  return (
    <TeamAccessGate teamId={teamId}>
      <div className="flex flex-col gap-4 pb-4 md:gap-6 md:pb-6 px-4">
        <InvoiceForm teamId={teamId} memberId={memberId} period={period} />
      </div>
    </TeamAccessGate>
  );
}
