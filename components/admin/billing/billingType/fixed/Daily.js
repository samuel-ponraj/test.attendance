"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";

import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";

import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription,
	DialogFooter,
} from "@/components/ui/dialog";

import { PiFilePdf } from "react-icons/pi";
import { ArrowLeft, User, User2 } from "lucide-react";
import { generateReceipt } from "../../GenerateReceipt";
import BillingContentLoader from "../BillingContentLoader";

import {
	formatCurrency,
	formatDate,
	toDateKey,
	getBillingStartDate,
	getBaseAmount,
	fetchBillingPeriods,
	ensureBillingPeriods,
	recordFixedPayment,
	getStatusText,
  getEffectiveBalance,
} from "../BillingHelpers";

const Daily = ({ teamId, team, members, initialMemberId }) => {
	const router = useRouter();
	const backHref = teamId ? `/admin/teams/${teamId}` : "/admin/teams";

	const [selectedMemberId, setSelectedMemberId] = useState(initialMemberId || "");
	const [filterStatus, setFilterStatus] = useState("all");
	const [filterFromDate, setFilterFromDate] = useState("");
	const [filterToDate, setFilterToDate] = useState("");

	const [billingPeriods, setBillingPeriods] = useState([]);
	const [periodsLoading, setPeriodsLoading] = useState(false);
	const [selectedPeriod, setSelectedPeriod] = useState(null);
	const [paymentAmount, setPaymentAmount] = useState("");
	const [isPaymentOpen, setIsPaymentOpen] = useState(false);
	const [loading, setLoading] = useState(false);
	const [paymentMode, setPaymentMode] = useState("cash");

	const [workingDays, setWorkingDays] = useState([0, 1, 2, 3, 4, 5, 6]);
	const [scheduleLoaded, setScheduleLoaded] = useState(false);

	const selectedMember = useMemo(() => {
		if (!selectedMemberId || selectedMemberId === "placeholder") return null;
		return members?.find((member) => member.id === selectedMemberId);
	}, [members, selectedMemberId]);

	const fetchSchedule = async () => {
	try {
		const days = team?.schedule?.workingDays;

		if (Array.isArray(days)) {
			setWorkingDays(days.map(Number));
		} else {
			setWorkingDays([0, 1, 2, 3, 4, 5, 6]);
		}
	} finally {
		setScheduleLoaded(true);
	}
};

	useEffect(() => {
	setScheduleLoaded(false);
	fetchSchedule();
}, [team?.id, team?.schedule?.workingDays]);

	const getDailyPeriods = () => {
		const billStart = getBillingStartDate(team);
		const today = new Date();
		const baseAmount = getBaseAmount(team);

		const rows = [];
		const current = new Date(billStart);

		while (current <= today) {
			const dateKey = toDateKey(current);
			const dayNumber = current.getDay();
			const isHoliday = !workingDays.includes(dayNumber);

			rows.push({
				id: `${dateKey}_daily`,
				periodKey: "daily",
				periodLabel: formatDate(dateKey),
				billingCycle: "daily",
				fromDate: dateKey,
				toDate: dateKey,
				dueDate: dateKey,

				dayNumber,
				dayName: current.toLocaleDateString("en-IN", {
					weekday: "long",
				}),
				isHoliday,

				amount: isHoliday ? 0 : baseAmount,
				status: isHoliday ? "holiday" : "pending",
			});

			current.setDate(current.getDate() + 1);
		}

		return rows;
	};

	const loadPeriods = async () => {
		if (!selectedMember || !scheduleLoaded) return;

		setPeriodsLoading(true);

		try {
			const generated = getDailyPeriods();

			await ensureBillingPeriods({
				teamId,
				member: selectedMember,
				periods: generated,
			});

			const data = await fetchBillingPeriods({
				teamId,
				memberId: selectedMember.id,
			});

			setBillingPeriods(data);
		} finally {
			setPeriodsLoading(false);
		}
	};

	useEffect(() => {
		if (selectedMember && scheduleLoaded) {
			loadPeriods();
		}
	}, [
		selectedMemberId,
		teamId,
		scheduleLoaded,
		workingDays,
		team?.billingConfig?.billingStartDate,
	]);

	const filteredPeriods = billingPeriods.filter((period) => {
		const matchesCycle = period.billingCycle === "daily";

		const matchesStatus =
			filterStatus === "all" ? true : period.status === filterStatus;

		const matchesFromDate = filterFromDate
			? period.fromDate >= filterFromDate
			: true;

		const matchesToDate = filterToDate ? period.toDate <= filterToDate : true;

		return matchesCycle && matchesStatus && matchesFromDate && matchesToDate;
	});

	const payablePeriods = filteredPeriods.filter((period) => !period.isHoliday);

	const totalAmount = payablePeriods.reduce(
		(acc, period) => acc + Number(period.amount || 0),
		0
	);

	const totalPaid = payablePeriods.reduce(
		(acc, period) => acc + Number(period.paid || 0),
		0
	);

	const totalBalance = payablePeriods.reduce(
		(acc, period) => acc + getEffectiveBalance(period),
		0
	);

	const openPaymentDialog = (period) => {
		if (period.isHoliday || period.status === "holiday") return;

		router.push(
			`/admin/teams/${teamId}/billing/create-invoice?memberId=${selectedMember.id}&periodId=${period.id}`
		);
	};

	const downloadReceipt = async (period) => {
		if (!selectedMember) return;

		try {
			await generateReceipt({
				team,
				member: selectedMember,
				period,
			});
			toast.success("Receipt downloaded successfully");
		} catch (error) {
			console.error("Error downloading receipt:", error);
			toast.error("Failed to download receipt");
		}
	};

	const recordPayment = async () => {
		if (!selectedMember || !selectedPeriod) return;

		setLoading(true);

		try {
			await recordFixedPayment({
				teamId,
				member: selectedMember,
				period: selectedPeriod,
				paymentAmount,
				paymentMode,
			});

			await loadPeriods();

			setIsPaymentOpen(false);
			setSelectedPeriod(null);
			setPaymentAmount("");
			setPaymentMode("cash");

			toast.success("Payment recorded successfully");
		} catch (error) {
			console.error("Error recording payment:", error);
			toast.error("Failed to record payment");
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="space-y-5">
			<div className="w-full max-w-[600px] flex justify-start">
        <button
          onClick={() => router.push(backHref)}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
      </div>
			<Card>
				<CardContent>
					<div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
						<div className="space-y-2 col-span-2 lg:col-span-1">
							<Label>Select Member</Label>

							<Select value={selectedMemberId} onValueChange={setSelectedMemberId}>
								<SelectTrigger className="w-full">
									<SelectValue placeholder="Select Member" />
								</SelectTrigger>

								<SelectContent>
									<SelectItem value="placeholder" disabled>
										Select Member
									</SelectItem>

									{members?.map((member) => (
										<SelectItem key={member.id} value={member.id}>
											{member.firstName} {member.lastName}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						<div className="space-y-2 col-span-1">
							<Label>From Date</Label>
							<Input
								type="date"
								value={filterFromDate}
								onChange={(e) => setFilterFromDate(e.target.value)}
								className="w-full"
							/>
						</div>

						<div className="space-y-2 col-span-1">
							<Label>To Date</Label>
							<Input
								type="date"
								value={filterToDate}
								onChange={(e) => setFilterToDate(e.target.value)}
								className="w-full"
							/>
						</div>

						<div className="space-y-2 col-span-2 lg:col-span-1">
							<Label>Status</Label>

							<Select value={filterStatus} onValueChange={setFilterStatus}>
								<SelectTrigger className="w-full">
									<SelectValue placeholder="Status" />
								</SelectTrigger>

								<SelectContent>
									<SelectItem value="all">All</SelectItem>
									<SelectItem value="pending">Pending</SelectItem>
									<SelectItem value="partial">Partial</SelectItem>
									<SelectItem value="settled">Settled</SelectItem>
									<SelectItem value="holiday">Holiday</SelectItem>
								</SelectContent>
							</Select>
						</div>

						<div className="flex items-end col-span-2 lg:col-span-1">
							<Button
								className="w-full"
								onClick={() => {
									setSelectedMemberId("placeholder");
									setFilterStatus("all");
									setFilterFromDate("");
									setFilterToDate("");
								}}
							>
								Clear Filter
							</Button>
						</div>
					</div>
				</CardContent>
			</Card>

			{!selectedMember ? (
				<Card>
					<CardContent className="py-12 text-center">
						<User className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
						<h3 className="font-semibold">Please select the member</h3>
						<p className="text-sm text-muted-foreground">
							Select a member to view daily billing.
						</p>
					</CardContent>
				</Card>
			) : periodsLoading ? (
				<BillingContentLoader />
			) : (
				<>
					<Card className="gap-2">
						<CardHeader className="grid grid-cols-2 items-center">
							<CardTitle className="flex items-center gap-2 text-xl">
								<User2 className="h-5 w-5 shrink-0" />
								<span className="truncate">
									{selectedMember.firstName} {selectedMember.lastName}
								</span>
							</CardTitle>

							<div className="flex justify-end">
								<Link href={`/admin/teams/${teamId}/members/${selectedMember.id}`}>
									<Button variant="outline" size="sm">
										Go To Profile
									</Button>
								</Link>
							</div>
						</CardHeader>

						<CardContent>
							<div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
								<div className="rounded-lg border bg-muted/30 p-3">
									<p className="text-xs text-muted-foreground">Cycle</p>
									<p className="font-semibold">Daily</p>
								</div>

								<div className="rounded-lg border bg-muted/30 p-3">
									<p className="text-xs text-muted-foreground">Total Amount</p>
									<p className="font-semibold">{formatCurrency(totalAmount)}</p>
								</div>

								<div className="rounded-lg border bg-muted/30 p-3">
									<p className="text-xs text-muted-foreground">Total Paid</p>
									<p className="font-semibold text-emerald-600">
										{formatCurrency(totalPaid)}
									</p>
								</div>

								<div className="rounded-lg border bg-muted/30 p-3">
									<p className="text-xs text-muted-foreground">Total Balance</p>
									<p className="font-semibold text-red-600">
										{formatCurrency(totalBalance)}
									</p>
								</div>
							</div>
						</CardContent>
					</Card>

					<div className="rounded-xl border bg-card shadow-sm overflow-x-auto">
						<Table>
							<TableHeader className="bg-muted/50">
								<TableRow>
									<TableHead className="text-center border-r">Date</TableHead>
									<TableHead className="text-center border-r">Day</TableHead>
									<TableHead className="text-center border-r">Amount</TableHead>
									<TableHead className="text-center border-r">Paid</TableHead>
                  <TableHead className="text-center border-r">Discount</TableHead>
									<TableHead className="text-center border-r">Balance</TableHead>
									<TableHead className="text-center border-r">Status</TableHead>
									<TableHead className="text-center">Action</TableHead>
								</TableRow>
							</TableHeader>

							<TableBody>
								{filteredPeriods.length === 0 ? (
									<TableRow>
										<TableCell
											colSpan={8}
											className="text-center py-8 text-muted-foreground"
										>
											No daily billing records found.
										</TableCell>
									</TableRow>
								) : (
									filteredPeriods.map((period) => {
										const holiday =
											period.isHoliday || period.status === "holiday";

										return (
											<TableRow
												key={period.id}
												className={holiday ? "bg-muted/30" : ""}
											>
												<TableCell className="text-center border-r">
													{formatDate(period.fromDate)}
												</TableCell>

												<TableCell className="text-center border-r">
													{period.dayName || "—"}
												</TableCell>

												<TableCell className="text-center border-r">
													{holiday ? "-" : formatCurrency(period.amount)}
												</TableCell>

												<TableCell className="text-center border-r">
													{holiday
														? "-"
														: Number(period.paid || 0) > 0
															? formatCurrency(period.paid)
															: "—"}
												</TableCell>

												<TableCell className="text-center border-r">
                        {period.status === "holiday" || period.isHoliday || period.status === "leave" ? "-" : formatCurrency(period.discountAmount || 0)}
                      </TableCell>

                      <TableCell className="text-center border-r font-semibold">
													{holiday
														? "-" : getEffectiveBalance(period) > 0
															? formatCurrency(getEffectiveBalance(period))
															: formatCurrency(0)}
												</TableCell>

												<TableCell className="text-center border-r">
													{holiday ? (
														<span className="text-muted-foreground font-semibold">
															Holiday
														</span>
													) : (
														getStatusText(getEffectiveBalance(period) <= 0 ? "settled" : period.status)
													)}
												</TableCell>

												<TableCell className="text-center">
													{holiday ? (
														<span className="text-sm text-muted-foreground">
															Not Applicable
														</span>
													) : (period.status === "settled" || getEffectiveBalance(period) <= 0) ? (
														<PiFilePdf
															className="cursor-pointer text-2xl text-orange-500 mx-auto"
															onClick={() => downloadReceipt(period)}
														/>
													) : (
														<Button
															size="sm"
															variant="outline"
															onClick={() => openPaymentDialog(period)}
														>
															Record
														</Button>
													)}
												</TableCell>
											</TableRow>
										);
									})
								)}
							</TableBody>
						</Table>
					</div>
				</>
			)}

			<Dialog open={isPaymentOpen} onOpenChange={setIsPaymentOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Record Daily Payment</DialogTitle>
						<DialogDescription>{selectedPeriod?.periodLabel}</DialogDescription>
					</DialogHeader>

					<div className="space-y-2">
						<Label>Payment Amount</Label>
						<Input
							type="number"
							value={paymentAmount}
							onChange={(e) => setPaymentAmount(e.target.value)}
						/>
					</div>

					<div className="space-y-2">
						<Label>Payment Mode</Label>

						<Select value={paymentMode} onValueChange={setPaymentMode}>
							<SelectTrigger>
								<SelectValue placeholder="Select payment mode" />
							</SelectTrigger>

							<SelectContent>
								<SelectItem value="cash">Cash</SelectItem>
								<SelectItem value="upi">UPI</SelectItem>
								<SelectItem value="bank_transfer">Bank Transfer</SelectItem>
								<SelectItem value="card">Card</SelectItem>
								<SelectItem value="cheque">Cheque</SelectItem>
							</SelectContent>
						</Select>
					</div>

					<DialogFooter>
						<Button variant="outline" onClick={() => setIsPaymentOpen(false)}>
							Cancel
						</Button>

						<Button onClick={recordPayment} disabled={loading}>
							{loading ? "Saving..." : "Save Payment"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
};

export default Daily;







