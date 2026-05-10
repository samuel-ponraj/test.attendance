"use client";

import Daily from "./fixed/Daily";
import Monthly from "./fixed/Monthly";
import Annual from "./fixed/Annual";
import Term from "./fixed/Term";

const Fixed = ({ teamId, team, members }) => {
	const billingCycle = team?.billingConfig?.billingCycle;

	if (billingCycle === "daily") {
		return <Daily teamId={teamId} team={team} members={members} />;
	}

	if (billingCycle === "monthly") {
		return <Monthly teamId={teamId} team={team} members={members} />;
	}

	if (billingCycle === "annual") {
		return <Annual teamId={teamId} team={team} members={members} />;
	}

	if (billingCycle === "term") {
		return <Term teamId={teamId} team={team} members={members} />;
	}

	return (
		<div className="rounded-xl border p-6 text-center text-muted-foreground">
			No fixed billing cycle configured.
		</div>
	);
};

export default Fixed;