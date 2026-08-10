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

export const startOfLocalDay = (date) => {
	const d = new Date(date);
	d.setHours(0, 0, 0, 0);
	return d;
};

export const getBillingStartDate = (team) => {
	const start = team?.billingConfig?.billingStartDate;

	if (!start) return startOfLocalDay(new Date());

	if (start?.seconds) {
		return startOfLocalDay(start.seconds * 1000);
	}

	return startOfLocalDay(start);
};

export const getMemberBillingStartDate = (team, member) => {
	const billingStart = getBillingStartDate(team);
	const joinedAt = member?.createdAt;

	if (!joinedAt) return billingStart;

	const joinedDate = joinedAt?.seconds
		? new Date(joinedAt.seconds * 1000)
		: new Date(joinedAt);

	if (Number.isNaN(joinedDate.getTime())) return billingStart;

	const joinedDay = startOfLocalDay(joinedDate);

	return joinedDay > billingStart ? joinedDay : billingStart;
};

export const getBaseAmount = (team) => {
	return Number(
		team?.billingConfig?.baseAmount ||
			team?.billingConfig?.amountPerMember ||
			0
	);
};

export const fetchBillingPeriods = async ({ teamId, memberId, fromDate }) => {
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

	return snap.docs
		.map((docSnap) => ({
			id: docSnap.id,
			...docSnap.data(),
		}))
		.filter((period) => {
			if (!fromDate) return true;
			return period.fromDate >= fromDate;
		});
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
	const oldDiscount = Number(old.discountAmount || 0);
	const nonPayableStatus =
		period.status === "holiday" || period.isHoliday
			? "holiday"
			: period.status === "leave"
				? "leave"
				: "";
	const newBalance = nonPayableStatus
		? 0
		: Math.max(newAmount - oldPaid - oldDiscount, 0);

	await updateDoc(periodRef, {
		periodKey: period.periodKey || old.periodKey || "",
		periodLabel: period.periodLabel,
		billingCycle: period.billingCycle || old.billingCycle || "",
		billingType: period.billingType || old.billingType || "fixed",
		fromDate: period.fromDate,
		toDate: period.toDate,
		dueDate: period.dueDate || "",
		dayNumber: period.dayNumber ?? null,
		dayName: period.dayName || "",
		isHoliday: !!period.isHoliday,
		attendance: period.attendance || old.attendance || null,
		presentDays: period.presentDays ?? old.presentDays ?? 0,
		halfDays: period.halfDays ?? old.halfDays ?? 0,
		absentDays: period.absentDays ?? old.absentDays ?? 0,
		billableDays: period.billableDays ?? old.billableDays ?? 0,
		totalDaysInMonth: period.totalDaysInMonth ?? old.totalDaysInMonth ?? 0,
		amount: newAmount,
		balance: newBalance,
		status: nonPayableStatus
			? nonPayableStatus
			: newAmount <= 0 && period.status === "pending"
				? "pending"
			: newBalance <= 0
				? "settled"
				: oldPaid > 0 || oldDiscount > 0
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
				billingType: period.billingType || "fixed",
				paid: 0,
				balance:
					period.status === "holiday" ||
					period.isHoliday ||
					period.status === "leave"
						? 0
						: Number(period.amount || 0),
				status:
					period.status === "holiday" || period.isHoliday
						? "holiday"
						: period.status === "leave"
							? "leave"
							: "pending",
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

	const discount = Number(period.discountAmount || 0);
	const currentBalance = Math.max(
		Number(period.amount || 0) - Number(period.paid || 0) - discount,
		0
	);
	const payableAmount = Math.min(amount, currentBalance);
	const previousPaid = Number(period.paid || 0);
	const previousDiscount = discount;
	const newPaid = Number(period.paid || 0) + payableAmount;
	const newBalance = Math.max(Number(period.amount || 0) - newPaid - discount, 0);
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
		periodAmount: Number(period.amount || 0),
		previousPaid,
		previousDiscount,
		paidAmount: payableAmount,
		amount: payableAmount,
		discountAmount: 0,
		totalDiscountAmount: discount,
		balanceAfterPayment: newBalance,

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

export const getEffectiveBalance = (period) => {
	const amount = Number(period?.amount || 0);
	const paid = Number(period?.paid || 0);
	const discount = Number(period?.discountAmount || 0);

	return Math.max(amount - paid - discount, 0);
};
