"use client";

import React, { useState } from "react";
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

const Fixed = ({ teamId, team, members, onRecordPayment }) => {
	const router = useRouter();
	const [isAlertOpen, setIsAlertOpen] = useState(false);

	const getColumns = () => {
		const config = team?.billingConfig;
		const cycle = config?.billingCycle;
		const baseAmount = config?.baseAmount || 0;

		if (cycle === "term") {
			const count = config?.termDetails?.divisionsPerYear || 3;

			return Array.from({ length: count }, (_, i) => ({
				key: `term_${i + 1}`,
				label: `Term ${i + 1}`,
				amount:
					i === count - 1
						? baseAmount -
						  Math.floor(baseAmount / count) * (count - 1)
						: Math.floor(baseAmount / count),
			}));
		}

		const keyMap = {
			monthly: "monthly",
			daily: "daily",
			annual: "annual",
		};

		const labelMap = {
			monthly: new Date().toLocaleString("en-IN", {
				month: "long",
				year: "numeric",
			}),
			daily: "Today",
			annual: "Annual",
		};

		return [
			{
				key: keyMap[cycle] || "standard",
				label: labelMap[cycle] || "Standard",
				amount: baseAmount,
			},
		];
	};

	const getNextDueDate = (member) => {
		const config = team?.billingConfig;

		if (!config?.billingStartDate) return "—";

		const lastPaymentDate = member.billing?.lastPaymentDate
			? new Date(member.billing.lastPaymentDate.seconds * 1000)
			: null;

		if (!lastPaymentDate) {
			return new Date(
				config.billingStartDate.seconds * 1000
			).toLocaleDateString("en-IN");
		}

		const nextDate = new Date(lastPaymentDate);
		const cycle = config.billingCycle;

		if (cycle === "daily") nextDate.setDate(nextDate.getDate() + 1);
		else if (cycle === "monthly") nextDate.setMonth(nextDate.getMonth() + 1);
		else if (cycle === "annual") nextDate.setFullYear(nextDate.getFullYear() + 1);
		else if (cycle === "term") {
			const months = Math.floor(
				12 / (config.termDetails?.divisionsPerYear || 3)
			);
			nextDate.setMonth(nextDate.getMonth() + months);
		}

		return nextDate.toLocaleDateString("en-IN");
	};

	const columns = getColumns();

	const getBillStartDate = () => {
		if (!team?.billingConfig?.billingStartDate) return "—";

		return new Date(
			team.billingConfig.billingStartDate.seconds * 1000
		).toLocaleDateString("en-IN");
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

							{columns.map((col) => (
								<TableHead
									key={col.key}
									colSpan={3}
									className="text-center border-r"
								>
									<div className="font-bold">
										{col.label} (₹{col.amount})
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
							{columns.map((col) => (
								<React.Fragment key={col.key}>
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
							const periods = member.billing?.periods || [];

							const totalPending = columns.reduce((acc, col) => {
								const period = periods.find((p) => p.key === col.key);
								const balance = period ? period.balance : col.amount;

								return acc + balance;
							}, 0);

							return (
								<TableRow key={member.id}>
									<TableCell className="font-medium border-r text-center">
										{member.firstName} {member.lastName}
									</TableCell>

									<TableCell className="text-center border-r">
										{getBillStartDate()}
									</TableCell>

									{columns.map((col) => {
										const period = periods.find(
											(p) => p.key === col.key
										);

										const paid = period?.paid || 0;
										const balance = period
											? period.balance
											: col.amount;

										return (
											<React.Fragment key={col.key}>
												<TableCell className="text-center border-r">
													{paid > 0 ? `₹${paid}` : "—"}
												</TableCell>

												<TableCell
													className={`text-center border-r ${
														balance > 0
															? "text-red-600 font-bold"
															: "text-emerald-600"
													}`}
												>
													{balance > 0
														? `₹${balance}`
														: "Settled"}
												</TableCell>

												<TableCell className="text-center border-r">
													{balance === 0 ? (
														<PiFilePdf
															onClick={() =>
																router.push(
																	`/admin/billing/create-invoice?teamId=${teamId}&memberId=${member.id}&period=${col.key}`
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

									<TableCell className="text-center border-r">
										{member.billing?.lastPaymentDate
											? new Date(
													member.billing.lastPaymentDate.seconds *
														1000
											  ).toLocaleDateString("en-IN")
											: "—"}
									</TableCell>

									<TableCell className="text-center border-r">
										{getNextDueDate(member)}
									</TableCell>

									<TableCell className="text-right font-bold border-r">
										₹{member.billing?.totalPaid || 0}
									</TableCell>

									<TableCell className="text-center">
										<Button
											variant="outline"
											size="sm"
											onClick={() => {
												if (totalPending <= 0) {
													setIsAlertOpen(true);
												} else {
													onRecordPayment(member);
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

export default Fixed;