import {
	collection,
	doc,
	getDoc,
	getDocs,
	query,
	setDoc,
	updateDoc,
	addDoc,
	Timestamp,
	increment,
	orderBy,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

export const formatCurrency = (value) => {
	return `₹${Number(value || 0).toLocaleString("en-IN")}`;
};

export const formatDate = (value) => {
	if (!value) return "—";

	if (value?.seconds) {
		return new Date(value.seconds * 1000).toLocaleDateString("en-IN");
	}

	return new Date(value).toLocaleDateString("en-IN");
};

export const toDateKey = (date) => {
	const d = new Date(date);
	const year = d.getFullYear();
	const month = String(d.getMonth() + 1).padStart(2, "0");
	const day = String(d.getDate()).padStart(2, "0");

	return `${year}-${month}-${day}`;
};

export const getBillingStartDate = (team) => {
	const start = team?.billingConfig?.billingStartDate;

	if (!start) return new Date();

	if (start?.seconds) {
		return new Date(start.seconds * 1000);
	}

	return new Date(start);
};

export const getBaseAmount = (team) => {
	return Number(
		team?.billingConfig?.baseAmount ||
			team?.billingConfig?.amountPerMember ||
			0
	);
};

export const fetchBillingPeriods = async ({ teamId, memberId }) => {
	const periodsRef = collection(
		db,
		"teams",
		teamId,
		"members",
		memberId,
		"billingPeriods"
	);

	const q = query(periodsRef, orderBy("fromDate", "asc"));
	const snap = await getDocs(q);

	return snap.docs.map((docSnap) => ({
		id: docSnap.id,
		...docSnap.data(),
	}));
};

export const ensureBillingPeriods = async ({ teamId, member, periods }) => {
	await Promise.all(
		periods.map(async (period) => {
			const periodRef = doc(
				db,
				"teams",
				teamId,
				"members",
				member.id,
				"billingPeriods",
				period.id
			);

			const periodSnap = await getDoc(periodRef);

			if (periodSnap.exists()) {
	const old = periodSnap.data();

	const newAmount = Number(period.amount || 0);
	const oldPaid = Number(old.paid || 0);
	const isHoliday = period.status === "holiday";

	await updateDoc(periodRef, {
		periodLabel: period.periodLabel,
		fromDate: period.fromDate,
		toDate: period.toDate,
		dueDate: period.dueDate || "",
		dayNumber: period.dayNumber ?? null,
		dayName: period.dayName || "",
		isHoliday: !!period.isHoliday,
		amount: newAmount,
		balance: isHoliday ? 0 : Math.max(newAmount - oldPaid, 0),
		status: isHoliday
			? "holiday"
			: oldPaid >= newAmount
				? "settled"
				: oldPaid > 0
					? "partial"
					: "pending",
		updatedAt: Timestamp.now(),
	});

	return;
}

			await setDoc(periodRef, {
				...period,
				memberId: member.id,
				memberName: `${member.firstName || ""} ${member.lastName || ""}`.trim(),
				billingType: "fixed",
				paid: 0,
				balance: period.isHoliday ? 0 : Number(period.amount || 0),
				status: period.isHoliday ? "holiday" : "pending",
				createdAt: Timestamp.now(),
				updatedAt: Timestamp.now(),
			});
		})
	);
};

export const recordFixedPayment = async ({
	teamId,
	member,
	period,
	paymentAmount,
	paymentMode,
}) => {
	const amount = Number(paymentAmount || 0);

	if (amount <= 0) return;

	const payableAmount = Math.min(amount, Number(period.balance || 0));
	const newPaid = Number(period.paid || 0) + payableAmount;
	const newBalance = Number(period.amount || 0) - newPaid;
	const newStatus = newBalance <= 0 ? "settled" : "partial";

	const periodRef = doc(
		db,
		"teams",
		teamId,
		"members",
		member.id,
		"billingPeriods",
		period.id
	);

	await updateDoc(periodRef, {
		paid: newPaid,
		balance: newBalance,
		status: newStatus,
		lastPaymentAmount: payableAmount,
		lastPaymentDate: Timestamp.now(),
		updatedAt: Timestamp.now(),
	});

	await addDoc(collection(db, "teams", teamId, "payments"), {
		memberId: member.id,
		memberName: `${member.firstName || ""} ${member.lastName || ""}`.trim(),

		periodId: period.id,
		period: period.periodLabel,
		periodLabel: period.periodLabel,
		billingCycle: period.billingCycle,

		paymentMode: paymentMode || "cash",
		amount: payableAmount,

		status: "success",
		createdAt: Timestamp.now(),
	});

	const memberRef = doc(db, "teams", teamId, "members", member.id);

	await setDoc(
		memberRef,
		{
			billing: {
				totalPaid: increment(payableAmount),
				lastPaymentDate: Timestamp.now(),
			},
		},
		{ merge: true }
	);
};

export const getStatusText = (status) => {
	if (status === "settled") {
		return <span className="text-emerald-600 font-semibold">Settled</span>;
	}

	if (status === "partial") {
		return <span className="text-orange-500 font-semibold">Partial</span>;
	}

	return <span className="text-red-600 font-semibold">Pending</span>;
};