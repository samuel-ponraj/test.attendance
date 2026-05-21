"use client";

import TransactionsTable from "@/components/admin/dashboard/TransactionsTable";
import { Spinner } from "@/components/ui/spinner";
import { useTeams } from "@/app/context/TeamsContext";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

export default function TransactionsPage() {
  const { loading, teams } = useTeams();
  const router = useRouter();

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner className="size-8" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:pb-6">
      <div className="flex items-center justify-between px-4 lg:px-6">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
      </div>

      <TransactionsTable
        teams={teams}
        limit={null}
        paginated
        title="All Transactions"
        description="Complete payment ledger across all teams."
      />
    </div>
  );
}
