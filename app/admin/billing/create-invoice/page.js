"use client";

import { useSearchParams } from "next/navigation";
import InvoiceForm from "../../../../components/admin/billing/InvoiceForm";

export default function Page() {
  const searchParams = useSearchParams();

  const teamId = searchParams.get("teamId");
  const memberId = searchParams.get("memberId");
  const period = searchParams.get("period");

  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6 px-4">
      <InvoiceForm 
        teamId={teamId}
        memberId={memberId}
        period={period}
      />
    </div>
  );
}