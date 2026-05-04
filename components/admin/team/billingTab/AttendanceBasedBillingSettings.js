"use client";

import { useEffect, useState } from "react";
import { doc, updateDoc, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

import {
	Select,
	SelectTrigger,
	SelectValue,
	SelectContent,
	SelectItem,
} from "@/components/ui/select";

import {
	AlertDialog,
	AlertDialogTrigger,
	AlertDialogContent,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogCancel,
	AlertDialogAction,
} from "@/components/ui/alert-dialog";

const AttendanceBasedBillingSettings = ({
	teamId,
	teamData,
	billingType,
	setBillingType,
	isBillingTypeLocked,
	setIsBillingTypeLocked,
}) => {
	const [loading, setLoading] = useState(false);
	const [billingStartDate, setBillingStartDate] = useState("");

	useEffect(() => {
		const config = teamData?.billingConfig || {};

		setBillingType(config.billingType || "attendanceBased");

		if (config.billingStartDate) {
			setBillingStartDate(
				config.billingStartDate.toDate().toISOString().split("T")[0]
			);
		} else {
			setBillingStartDate(new Date().toISOString().split("T")[0]);
		}
	}, [teamData]);

	const updateBillingSettings = async () => {
		if (!teamId) return;

		setLoading(true);

		try {
			const ref = doc(db, "teams", teamId);
			const startDate = new Date(billingStartDate);

			const billingConfig = {
				billingType: "attendanceBased",
				currency: "INR",

				billingStartDate: Timestamp.fromDate(startDate),

				rateSource: "member.salaryConfig",

				attendanceBasedConfig: {
					calculationMethod: "presentDays",
					formula: "presentDays * member.salaryConfig.dailyRate",
					attendancePath:
						"teams/{teamId}/attendance/{dateKey}/punches/{memberId}",
					presentField: "present",
					memberRatePath: "teams/{teamId}/members/{memberId}/salaryConfig",
				},

				autoGeneratePeriods: true,
				termDetails: null,
				dueConfig: null,
			};

			await updateDoc(ref, { billingConfig });

			setBillingType("attendanceBased");
			setIsBillingTypeLocked(true);
		} finally {
			setLoading(false);
		}
	};

	return (
		<Card>
			<CardHeader className="flex flex-row items-center justify-between">
				<CardTitle>Attendance Based Billing Settings</CardTitle>

				<AlertDialog>
					<AlertDialogTrigger asChild>
						<Button disabled={loading || !billingType}>
							{loading ? "Saving..." : "Save Changes"}
						</Button>
					</AlertDialogTrigger>

					<AlertDialogContent>
						<AlertDialogHeader>
							<AlertDialogTitle>
								Confirm Attendance Based Billing
							</AlertDialogTitle>

							<AlertDialogDescription>
								Attendance-based billing uses each member&apos;s individual
								salary/rate from their profile. Amount, due details, grace days,
								and late fees are handled inside each member&apos;s billing or
								salary configuration.
							</AlertDialogDescription>
						</AlertDialogHeader>

						<AlertDialogFooter>
							<AlertDialogCancel disabled={loading}>
								Cancel
							</AlertDialogCancel>

							<AlertDialogAction
								onClick={updateBillingSettings}
								disabled={loading}
							>
								Confirm
							</AlertDialogAction>
						</AlertDialogFooter>
					</AlertDialogContent>
				</AlertDialog>
			</CardHeader>

			<CardContent className="space-y-6">
				<div className="rounded-lg border bg-muted/40 p-4 space-y-2 text-sm">
					<p className="font-medium">How attendance-based billing works</p>

					<p className="text-muted-foreground">
						No common billing cycle or amount is configured here. The payable
						amount is calculated for each member separately using their
						attendance and salary/rate details.
					</p>

					<div className="rounded-md bg-background border p-3">
						<p className="font-medium">Formula</p>
						<p className="text-muted-foreground">
							Present Days × Member-Specific Daily Rate
						</p>
					</div>
				</div>

				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					{/* <div className="space-y-2">
						<Label>Billing Type</Label>

						<Select
							value={billingType || "attendanceBased"}
							onValueChange={setBillingType}
							disabled={isBillingTypeLocked}
						>
							<SelectTrigger>
								<SelectValue placeholder="Select billing type" />
							</SelectTrigger>

							<SelectContent>
								<SelectItem value="fixed">Fixed Billing</SelectItem>
								<SelectItem value="attendanceBased">
									Attendance Based Billing
								</SelectItem>
							</SelectContent>
						</Select>

						<p className="text-[11px] text-muted-foreground">
							{isBillingTypeLocked
								? "Billing type is locked after setup."
								: "Choose Attendance Based if billing depends on present days and individual member salary."}
						</p>
					</div> */}

					<div className="space-y-2">
						<Label>Billing Start Date</Label>

						<Input
							type="date"
							value={billingStartDate}
							onChange={(e) => setBillingStartDate(e.target.value)}
						/>
					</div>

					<div className="space-y-2 md:col-span-2">
						<Label>Member Attendance Rate</Label>

						<div className="rounded-md border p-3 bg-muted/40 text-sm text-muted-foreground leading-relaxed">
							Attendance rate is not entered here. Each member will have their
							own salary or daily rate in their profile.
							<br />
							<span className="font-medium text-foreground">
								Example: Joining Date, Salary Type, Daily Rate, Monthly Salary,
								Working Days, Half-Day Settings
							</span>
						</div>
					</div>
				</div>
			</CardContent>
		</Card>
	);
};

export default AttendanceBasedBillingSettings;