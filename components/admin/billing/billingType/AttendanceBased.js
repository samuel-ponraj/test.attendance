"use client";

import Daily from "./attendanceBased/Daily";
import Monthly from "./attendanceBased/Monthly";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

const AttendanceBased = ({ teamId, team, members, initialMemberId }) => {
	const billingCycle = team?.billingConfig?.billingCycle;
	const router = useRouter();
	const backHref = teamId ? `/admin/teams/${teamId}` : "/admin/teams";

	if (billingCycle === "daily") {
		return <Daily teamId={teamId} team={team} members={members} initialMemberId={initialMemberId} />;
	}

	if (billingCycle === "monthly") {
		return <Monthly teamId={teamId} team={team} members={members} initialMemberId={initialMemberId} />;
	}


	return (
		<div className="rounded-xl border p-6 text-center text-muted-foreground">
			<div className="w-full max-w-[600px] flex justify-start">
        <button
          onClick={() => router.push(backHref)}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
      </div>
			No fixed billing cycle configured.
		</div>
	);
};

export default AttendanceBased;
