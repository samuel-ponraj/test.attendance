"use client";

import React, { useState, useCallback } from "react";
import { doc, collection, runTransaction, Timestamp } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { toast } from "sonner";

import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogFooter,
} from "@/components/ui/dialog";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";

const RecordPaymentModal = ({
	isOpen,
	onOpenChange,
	member,
	team,
	attendanceSummary,
	billingPeriods = [],
}) => {
	const [amount, setAmount] = useState("");
	const [method, setMethod] = useState("");
	const [isSaving, setIsSaving] = useState(false);

	const generateDummyLink = useCallback(() => {
		if (!member) return "";

		const base = "https://pay.yourapp.com/pay";

		const params = new URLSearchParams({
			memberId: member.id,
			amount: amount || "0",
			ts: Date.now().toString(),
		});

		return `${base}?${params.toString()}`;
	}, [member?.id, amount]);

	const getBillingAmount = useCallback(() => {
		if (!member || !team) {
			return {
				totalPayable: 0,
				totalPaid: 0,
				remainingAmount: 0,
				isAttendanceBased: false,
			};
		}

		const billingType = team?.billingConfig?.billingType;
		const isAttendanceBased = billingType === "attendanceBased";

		const existingPeriods = member.billing?.periods || [];

		const totalPaid = existingPeriods.reduce(
			(sum, period) => sum + Number(period.paid || 0),
			0
		);

		if (isAttendanceBased && attendanceSummary && billingPeriods.length > 0) {
			const today = new Date();
			today.setHours(0, 0, 0, 0);

			const totalPayable = billingPeriods.reduce((sum, period) => {
				const summary = attendanceSummary?.[period.key];

				const periodStarted = period.startDate <= today;

				const hasAttendance =
					summary &&
					(summary.presentDays > 0 ||
						summary.absentDays > 0 ||
						summary.halfDays > 0);

				const payableAmount =
					periodStarted && hasAttendance
						? Number(summary.payableAmount || 0)
						: Number(period.amount || 0);

				return sum + payableAmount;
			}, 0);

			return {
				totalPayable,
				totalPaid,
				remainingAmount: Math.max(totalPayable - totalPaid, 0),
				isAttendanceBased: true,
			};
		}

		if (existingPeriods.length > 0) {
			const totalPayable = existingPeriods.reduce(
				(sum, p) => sum + Number(p.amount || 0),
				0
			);

			const remainingAmount = existingPeriods.reduce(
				(sum, p) => sum + Number(p.balance || 0),
				0
			);

			return {
				totalPayable,
				totalPaid,
				remainingAmount,
				isAttendanceBased: false,
			};
		}

		const baseAmount = Number(team?.billingConfig?.baseAmount || 0);

		return {
			totalPayable: baseAmount,
			totalPaid: 0,
			remainingAmount: baseAmount,
			isAttendanceBased: false,
		};
	}, [member, team, attendanceSummary, billingPeriods]);

	const billingAmount = getBillingAmount();
	const remainingAmount = billingAmount.remainingAmount;

	if (!member || !team) return null;

	const handleSubmit = async () => {
		const numAmount = Number(amount);

		if (!amount || numAmount <= 0) {
			return toast.error("Enter valid amount");
		}

		if (numAmount > remainingAmount) {
			return toast.error(
				`Entered amount exceeds remaining balance of ₹${remainingAmount.toLocaleString()}`
			);
		}

		if (!method) {
			return toast.error("Select payment mode");
		}

		setIsSaving(true);

		try {
			const memberRef = doc(db, `teams/${team.id}/members`, member.id);
			const logRef = doc(collection(db, `teams/${team.id}/payments`));

			await runTransaction(db, async (transaction) => {
				const memberDoc = await transaction.get(memberRef);

				if (!memberDoc.exists()) {
					throw new Error("Member not found");
				}

				const data = memberDoc.data();
				let periods = data.billing?.periods || [];

				if (team?.billingConfig?.billingType === "attendanceBased") {
					const today = new Date();
					today.setHours(0, 0, 0, 0);

					periods = billingPeriods.map((period) => {
						const summary = attendanceSummary?.[period.key];

						const periodStarted = period.startDate <= today;

						const hasAttendance =
							summary &&
							(summary.presentDays > 0 ||
								summary.absentDays > 0 ||
								summary.halfDays > 0);

						const payableAmount =
							periodStarted && hasAttendance
								? Number(summary.payableAmount || 0)
								: Number(period.amount || 0);

						const existingPeriod = periods.find(
							(p) => p.key === period.key
						);

						const paid = Number(existingPeriod?.paid || 0);
						const balance = Math.max(payableAmount - paid, 0);

						return {
							key: period.key,
							label: period.label,
							amount: Number(period.amount || 0),
							payableAmount,
							paid,
							balance,
							status:
								balance === 0
									? "paid"
									: paid > 0
									? "partial"
									: "pending",

							totalDays: summary?.totalDays || 0,
							presentDays: summary?.presentDays || 0,
							absentDays: summary?.absentDays || 0,
							halfDays: summary?.halfDays || 0,
							payableDays: summary?.payableDays || 0,
						};
					});
				} else if (!periods.length) {
					const config = team?.billingConfig;
					const cycle = config?.billingCycle;
					const baseAmount = Number(config?.baseAmount || 0);

					if (cycle === "term") {
						const count = Number(
							config?.termDetails?.divisionsPerYear || 3
						);

						periods = Array.from({ length: count }, (_, i) => {
							const amt =
								i === count - 1
									? baseAmount -
									  Math.floor(baseAmount / count) *
											(count - 1)
									: Math.floor(baseAmount / count);

							return {
								key: `term_${i + 1}`,
								label: `Term ${i + 1}`,
								amount: amt,
								paid: 0,
								balance: amt,
								status: "pending",
							};
						});
					} else {
						const labelMap = {
							monthly: "Monthly",
							daily: "Daily",
							annual: "Annual",
						};

						periods = [
							{
								key: cycle || "standard",
								label: labelMap[cycle] || "Standard",
								amount: baseAmount,
								paid: 0,
								balance: baseAmount,
								status: "pending",
							},
						];
					}
				}

				let remaining = numAmount;

				const updatedPeriods = periods.map((p) => {
					if (remaining <= 0) return p;

					const balance = Number(
						p.balance ?? p.payableAmount ?? p.amount ?? 0
					);

					if (balance <= 0) return p;

					const pay = Math.min(balance, remaining);
					remaining -= pay;

					const newBalance = balance - pay;

					return {
						...p,
						paid: Number(p.paid || 0) + pay,
						balance: newBalance,
						status: newBalance === 0 ? "paid" : "partial",
						paidDate: Timestamp.now(),
					};
				});

				const totalPaid = Number(data.billing?.totalPaid || 0) + numAmount;

				transaction.update(memberRef, {
					"billing.periods": updatedPeriods,
					"billing.totalPaid": totalPaid,
					"billing.lastPaymentDate": Timestamp.now(),
				});

				const user = auth.currentUser;

				transaction.set(logRef, {
					memberId: member.id,
					memberName: `${member.firstName} ${member.lastName}`,
					amount: numAmount,
					paymentMode: method,
					paymentLink: method === "Link" ? generateDummyLink() : null,
					capturedBy: user?.displayName || user?.email || "Admin",
					capturedById: user?.uid || null,
					createdAt: Timestamp.now(),
				});
			});

			toast.success("Payment Recorded");

			setAmount("");
			setMethod("");
			onOpenChange(false);
		} catch (err) {
			console.error(err);
			toast.error("Transaction failed");
		} finally {
			setIsSaving(false);
		}
	};

	return (
		<Dialog open={isOpen} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>
						Record Payment: {member.firstName}
					</DialogTitle>
				</DialogHeader>

				<div className="space-y-4 py-4">
					<div className="rounded-lg border bg-muted/40 p-3">
						<p className="text-sm font-semibold text-destructive">
              Total Remaining Balance: ₹
              {billingAmount.remainingAmount.toLocaleString()}
            </p>
					</div>

					<Input
						type="number"
						max={remainingAmount}
						placeholder="Enter Amount"
						value={amount}
						onChange={(e) => setAmount(e.target.value)}
					/>

					<Select value={method} onValueChange={setMethod}>
						<SelectTrigger>
							<SelectValue placeholder="Select Payment Mode" />
						</SelectTrigger>

						<SelectContent>
							<SelectItem value="Cash">Cash</SelectItem>
							<SelectItem value="Link">Payment Link</SelectItem>
						</SelectContent>
					</Select>

					{method === "Link" && amount > 0 && (
						<div className="p-2 border rounded bg-muted text-xs break-all space-y-2">
							<p className="font-medium">Generated Payment Link</p>
							<p>{generateDummyLink()}</p>

							<Button
								size="sm"
								variant="secondary"
								onClick={() =>
									navigator.clipboard.writeText(generateDummyLink())
								}
							>
								Copy Link
							</Button>
						</div>
					)}
				</div>

				<DialogFooter>
					<Button variant="ghost" onClick={() => onOpenChange(false)}>
						Cancel
					</Button>

					<Button onClick={handleSubmit} disabled={isSaving}>
						{isSaving ? "Saving..." : "Confirm"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
};

export default RecordPaymentModal;