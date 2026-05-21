"use client";

import Daily from "./fixed/Daily";
import Monthly from "./fixed/Monthly";
import Annual from "./fixed/Annual";
import Term from "./fixed/Term";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

const Fixed = ({
  teamId,
  team,
  members,
  initialMemberId,
  showBackButton = true,
}) => {
  const billingCycle = team?.billingConfig?.billingCycle;
  const router = useRouter();
  const backHref = teamId ? `/admin/teams/${teamId}` : "/admin/teams";

  if (billingCycle === "daily") {
    return (
      <Daily
        teamId={teamId}
        team={team}
        members={members}
        initialMemberId={initialMemberId}
        showBackButton={showBackButton}
      />
    );
  }

  if (billingCycle === "monthly") {
    return (
      <Monthly
        teamId={teamId}
        team={team}
        members={members}
        initialMemberId={initialMemberId}
        showBackButton={showBackButton}
      />
    );
  }

  if (billingCycle === "annual") {
    return (
      <Annual
        teamId={teamId}
        team={team}
        members={members}
        initialMemberId={initialMemberId}
        showBackButton={showBackButton}
      />
    );
  }

  if (billingCycle === "term") {
    return (
      <Term
        teamId={teamId}
        team={team}
        members={members}
        initialMemberId={initialMemberId}
        showBackButton={showBackButton}
      />
    );
  }

  return (
    <>
      {showBackButton && (
        <div className="w-full max-w-[600px] flex justify-start">
          <button
            onClick={() => router.push(backHref)}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
        </div>
      )}
      <div className="rounded-xl border p-6 text-center text-muted-foreground">
        No fixed billing cycle configured.
      </div>
    </>
  );
};

export default Fixed;
