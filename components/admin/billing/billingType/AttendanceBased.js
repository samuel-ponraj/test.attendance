"use client";

import Daily from "./attendanceBased/Daily";
import Monthly from "./attendanceBased/Monthly";

const AttendanceBased = ({ teamId, team, members }) => {
	const billingCycle = team?.billingConfig?.billingCycle;

	if (billingCycle === "daily") {
		return <Daily teamId={teamId} team={team} members={members} />;
	}

	if (billingCycle === "monthly") {
		return <Monthly teamId={teamId} team={team} members={members} />;
	}

	return (
		<div className="rounded-xl border p-6 text-center text-muted-foreground">
			No fixed billing cycle configured.
		</div>
	);
};

export default AttendanceBased;