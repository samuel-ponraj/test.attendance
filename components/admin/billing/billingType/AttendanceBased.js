"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";

import { Button } from "@/components/ui/button";
import { PiFilePdf } from "react-icons/pi";

import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

const AttendanceBased = ({ teamId, team, members, onRecordPayment }) => {
	const router = useRouter();

	const [isAlertOpen, setIsAlertOpen] = useState(false);
	const [attendanceData, setAttendanceData] = useState({});
	const [loadingAttendance, setLoadingAttendance] = useState(false);

	const formatCurrency = (value) => `₹${Math.round(value || 0)}`;

	const toDate = (value) => {
		if (!value) return null;

		if (value?.seconds) {
			return new Date(value.seconds * 1000);
		}

		return new Date(value);
	};

	const formatDateKey = (date) => {
		const year = date.getFullYear();
		const month = String(date.getMonth() + 1).padStart(2, "0");
		const day = String(date.getDate()).padStart(2, "0");

		return `${year}-${month}-${day}`;
	};

	const formatDisplayDate = (date) => {
		if (!date) return "—";

		return date.toLocaleDateString("en-IN");
	};

	const getDaysBetween = (startDate, endDate) => {
		const dates = [];
		const current = new Date(startDate);

		current.setHours(0, 0, 0, 0);

		const end = new Date(endDate);
		end.setHours(0, 0, 0, 0);

		while (current <= end) {
			dates.push(new Date(current));
			current.setDate(current.getDate() + 1);
		}

		return dates;
	};

	const generateBillingPeriods = () => {
		const config = team?.billingConfig;

		if (!config) return [];

		const cycle = config?.billingCycle;
		const baseAmount = Number(config?.baseAmount || 0);

		const billingStartDate = toDate(config?.billingStartDate);
		const today = new Date();

		if (!billingStartDate) return [];

		const startDate = new Date(billingStartDate);
		startDate.setHours(0, 0, 0, 0);

		if (cycle === "daily") {
			const endDate = new Date(today);
			endDate.setHours(0, 0, 0, 0);

			return [
				{
					key: formatDateKey(endDate),
					label: "Today",
					startDate: endDate,
					endDate,
					amount: baseAmount,
					cycle,
				},
			];
		}

		if (cycle === "monthly") {
			const year = today.getFullYear();
			const month = today.getMonth();

			const monthStart = new Date(year, month, 1);
			const monthEnd = new Date(year, month + 1, 0);

			const effectiveStart =
				startDate > monthStart && startDate <= monthEnd
					? startDate
					: monthStart;

			return [
				{
					key: `${year}-${String(month + 1).padStart(2, "0")}`,
					label: today.toLocaleString("en-IN", {
						month: "long",
						year: "numeric",
					}),
					startDate: effectiveStart,
					endDate: monthEnd,
					amount: baseAmount,
					cycle,
				},
			];
		}

		if (cycle === "annual") {
			const year = today.getFullYear();

			const yearStart = new Date(year, 0, 1);
			const yearEnd = new Date(year, 11, 31);

			const effectiveStart =
				startDate > yearStart && startDate <= yearEnd
					? startDate
					: yearStart;

			return [
				{
					key: `${year}`,
					label: `Annual ${year}`,
					startDate: effectiveStart,
					endDate: yearEnd,
					amount: baseAmount,
					cycle,
				},
			];
		}

		if (cycle === "term") {
			const divisions = Number(config?.termDetails?.divisionsPerYear || 3);
			const monthsPerTerm = Math.floor(12 / divisions);

			return Array.from({ length: divisions }, (_, index) => {
				const termStart = new Date(startDate);
				termStart.setMonth(startDate.getMonth() + index * monthsPerTerm);

				const termEnd = new Date(termStart);
				termEnd.setMonth(termStart.getMonth() + monthsPerTerm);
				termEnd.setDate(termEnd.getDate() - 1);

				const amount =
					index === divisions - 1
						? baseAmount -
						  Math.floor(baseAmount / divisions) * (divisions - 1)
						: Math.floor(baseAmount / divisions);

				return {
					key: `term_${index + 1}`,
					label: `Term ${index + 1}`,
					startDate: termStart,
					endDate: termEnd,
					amount,
					cycle,
				};
			});
		}

		return [
			{
				key: "standard",
				label: "Standard",
				startDate,
				endDate: today,
				amount: baseAmount,
				cycle,
			},
		];
	};

	const periods = useMemo(() => generateBillingPeriods(), [team]);

	const fetchAttendanceForMemberPeriod = async (memberId, period) => {
		const dates = getDaysBetween(period.startDate, period.endDate);

		let presentDays = 0;
		let absentDays = 0;
		let halfDays = 0;

		await Promise.all(
			dates.map(async (date) => {
				const dateKey = formatDateKey(date);

				const punchRef = doc(
					db,
					"teams",
					teamId,
					"attendance",
					dateKey,
					"punches",
					memberId
				);

				const punchSnap = await getDoc(punchRef);

				if (punchSnap.exists()) {
					const status = punchSnap.data()?.status;

					if (status === "present") presentDays += 1;
					else if (status === "absent") absentDays += 1;
					else if (status === "halfday") halfDays += 1;
				}
			})
		);

		const totalDays = dates.length;
		const payableDays = presentDays + halfDays * 0.5;
		const perDayAmount = totalDays > 0 ? period.amount / totalDays : 0;
		const payableAmount = Math.round(perDayAmount * payableDays);

		return {
			totalDays,
			presentDays,
			absentDays,
			halfDays,
			payableDays,
			payableAmount,
		};
	};

	useEffect(() => {
		const preloadAttendance = async () => {
			if (!teamId || !members?.length || !periods?.length) return;

			setLoadingAttendance(true);

			try {
				const result = {};

				for (const member of members) {
					result[member.id] = {};

					for (const period of periods) {
						const summary = await fetchAttendanceForMemberPeriod(
							member.id,
							period
						);

						result[member.id][period.key] = summary;
					}
				}

				setAttendanceData(result);
			} catch (error) {
				console.error("Attendance preload error:", error);
			} finally {
				setLoadingAttendance(false);
			}
		};

		preloadAttendance();
	}, [teamId, members, periods]);

	const getBillStartDate = () => {
		const startDate = toDate(team?.billingConfig?.billingStartDate);
		return formatDisplayDate(startDate);
	};

	const getNextDueDate = (member) => {
		const config = team?.billingConfig;

		if (!config?.billingStartDate) return "—";

		const lastPaymentDate = member.billing?.lastPaymentDate
			? toDate(member.billing.lastPaymentDate)
			: null;

		if (!lastPaymentDate) {
			return getBillStartDate();
		}

		const nextDate = new Date(lastPaymentDate);
		const cycle = config.billingCycle;

		if (cycle === "daily") {
			nextDate.setDate(nextDate.getDate() + 1);
		} else if (cycle === "monthly") {
			nextDate.setMonth(nextDate.getMonth() + 1);
		} else if (cycle === "annual") {
			nextDate.setFullYear(nextDate.getFullYear() + 1);
		} else if (cycle === "term") {
			const divisions = Number(config.termDetails?.divisionsPerYear || 3);
			const months = Math.floor(12 / divisions);
			nextDate.setMonth(nextDate.getMonth() + months);
		}

		return nextDate.toLocaleDateString("en-IN");
	};

	const getPeriodPayment = (member, periodKey) => {
		const billingPeriods = member.billing?.periods || [];
		return billingPeriods.find((item) => item.key === periodKey);
	};

	return (
		<>
			<div className="rounded-xl border bg-card shadow-sm overflow-x-auto">
				<Table>
					<TableHeader className="bg-muted/50">
						<TableRow>
							<TableHead rowSpan={2} className="border-r text-center">
								Member
							</TableHead>

							<TableHead rowSpan={2} className="text-center border-r">
								Bill Start
							</TableHead>

							{periods.map((period) => (
								<TableHead
									key={period.key}
									colSpan={8}
									className="text-center border-r py-2"
								>
									<div className="font-bold pb-2">
										{period.label} ({formatCurrency(period.amount)})
									</div>

									<div className="text-xs font-normal text-muted-foreground">
										{formatDisplayDate(period.startDate)} -{" "}
										{formatDisplayDate(period.endDate)}
									</div>
								</TableHead>
							))}

							<TableHead rowSpan={2} className="text-center border-r">
								Last Paid
							</TableHead>

							<TableHead rowSpan={2} className="text-center border-r">
								Next Due
							</TableHead>

							<TableHead rowSpan={2} className="text-center border-r">
								Total Paid
							</TableHead>

							<TableHead rowSpan={2} className="text-center">
								Action
							</TableHead>
						</TableRow>

						<TableRow>
							{periods.map((period) => (
								<React.Fragment key={period.key}>
									<TableHead className="text-center border-r">
										Total
									</TableHead>
									<TableHead className="text-center border-r">
										P
									</TableHead>
									<TableHead className="text-center border-r">
										A
									</TableHead>
									<TableHead className="text-center border-r">
										H
									</TableHead>
									<TableHead className="text-center border-r">
										Payable
									</TableHead>
									<TableHead className="text-center border-r">
										Paid
									</TableHead>
									<TableHead className="text-center border-r">
										Balance
									</TableHead>
									<TableHead className="text-center border-r">
										Bill
									</TableHead>
								</React.Fragment>
							))}
						</TableRow>
					</TableHeader>

					<TableBody>
						{members.map((member) => {
							const totalPending = periods.reduce((acc, period) => {
								const summary =
									attendanceData?.[member.id]?.[period.key];

								const payment = getPeriodPayment(member, period.key);

								const today = new Date();
								today.setHours(0, 0, 0, 0);

								const periodStarted = period.startDate <= today;

								const hasAttendance =
									summary &&
									(summary.presentDays > 0 ||
										summary.absentDays > 0 ||
										summary.halfDays > 0);

								const payableAmount =
									periodStarted && hasAttendance
										? summary.payableAmount
										: period.amount;

								const paid = payment?.paid || 0;
								const balance = Math.max(payableAmount - paid, 0);

								return acc + balance;
							}, 0);

							return (
								<TableRow key={member.id}>
									<TableCell className="font-medium border-r text-center whitespace-nowrap">
										{member.firstName} {member.lastName}
									</TableCell>

									<TableCell className="text-center border-r whitespace-nowrap">
										{getBillStartDate()}
									</TableCell>

									{periods.map((period) => {
										const summary =
											attendanceData?.[member.id]?.[period.key];

										const payment = getPeriodPayment(member, period.key);

										const today = new Date();
										today.setHours(0, 0, 0, 0);

										const periodStarted = period.startDate <= today;

										const hasAttendance =
											summary &&
											(summary.presentDays > 0 ||
												summary.absentDays > 0 ||
												summary.halfDays > 0);

										const payableAmount =
											periodStarted && hasAttendance
												? summary.payableAmount
												: period.amount;

										const paid = payment?.paid || 0;
										const balance = Math.max(payableAmount - paid, 0);

										return (
											<React.Fragment key={period.key}>
												<TableCell className="text-center border-r">
													{loadingAttendance
														? "..."
														: summary?.totalDays ?? "—"}
												</TableCell>

												<TableCell className="text-center border-r text-emerald-600 font-medium">
													{loadingAttendance
														? "..."
														: summary?.presentDays ?? 0}
												</TableCell>

												<TableCell className="text-center border-r text-red-600 font-medium">
													{loadingAttendance
														? "..."
														: summary?.absentDays ?? 0}
												</TableCell>

												<TableCell className="text-center border-r text-orange-600 font-medium">
													{loadingAttendance
														? "..."
														: summary?.halfDays ?? 0}
												</TableCell>

												<TableCell className="text-center border-r font-bold">
													{loadingAttendance ? "..." : formatCurrency(payableAmount)}
												</TableCell>

												<TableCell className="text-center border-r">
													{paid > 0 ? formatCurrency(paid) : "—"}
												</TableCell>

												<TableCell
													className={`text-center border-r ${
														balance > 0
															? "text-red-600 font-bold"
															: "text-emerald-600 font-bold"
													}`}
												>
													{balance > 0
														? formatCurrency(balance)
														: "Settled"}
												</TableCell>

												<TableCell className="text-center border-r">
													{balance === 0 ? (
														<PiFilePdf
															onClick={() =>
																router.push(
																	`/admin/billing/create-invoice?teamId=${teamId}&memberId=${member.id}&period=${period.key}`
																)
															}
															className="cursor-pointer text-2xl text-orange-500 mx-auto"
														/>
													) : (
														"—"
													)}
												</TableCell>
											</React.Fragment>
										);
									})}

									<TableCell className="text-center border-r whitespace-nowrap">
										{member.billing?.lastPaymentDate
											? formatDisplayDate(
													toDate(member.billing.lastPaymentDate)
											  )
											: "—"}
									</TableCell>

									<TableCell className="text-center border-r whitespace-nowrap">
										{getNextDueDate(member)}
									</TableCell>

									<TableCell className="text-right font-bold border-r">
										{formatCurrency(member.billing?.totalPaid || 0)}
									</TableCell>

									<TableCell className="text-center">
										<Button
											variant="outline"
											size="sm"
											disabled={loadingAttendance}
											onClick={() => {
												if (totalPending <= 0) {
													setIsAlertOpen(true);
												} else {
													onRecordPayment(member, attendanceData?.[member.id], periods);
												}
											}}
										>
											Record
										</Button>
									</TableCell>
								</TableRow>
							);
						})}
					</TableBody>
				</Table>
				<div className="p-4 font-medium text-sm text-muted-foreground">
					<p>P - Present, A - Absent, H - Half Day</p>
				</div>
			</div>

			<AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Payment Complete</AlertDialogTitle>
						<AlertDialogDescription>
							All payments have been settled for this member.
						</AlertDialogDescription>
					</AlertDialogHeader>

					<AlertDialogFooter>
						<AlertDialogAction onClick={() => setIsAlertOpen(false)}>
							Okay
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
};

export default AttendanceBased;