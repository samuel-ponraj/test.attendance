"use client";

import TransactionsTable from "@/components/admin/dashboard/TransactionsTable";
import { Spinner } from "@/components/ui/spinner";
import { useTeams } from "@/app/context/TeamsContext";
import { ArrowLeft } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

export default function TransactionsPage() {
  const { loading, teams } = useTeams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const teamId = searchParams.get("teamId") || "";
  const visibleTeams = teamId
    ? teams.filter((team) => team.id === teamId)
    : teams;
  const selectedTeamName = visibleTeams[0]?.name || "";

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner className="size-8" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
      </div>

      <TransactionsTable
        teams={visibleTeams}
        limit={null}
        paginated
        title={teamId ? "Team Transactions" : "All Transactions"}
        description={
          teamId
            ? `Payment ledger for ${selectedTeamName || "this team"}.`
            : "Complete payment ledger across all teams."
        }
      />
    </div>
  );
}
