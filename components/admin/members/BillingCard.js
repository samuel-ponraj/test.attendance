"use client";

import React, { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

const BillingCard = ({ teamId, memberId, config }) => {
	const [periods, setPeriods] = useState([]);

	const formatCurrency = (val) =>
		`₹${Number(val || 0).toLocaleString("en-IN")}`;

	useEffect(() => {
		if (!teamId || !memberId) return;

		const ref = collection(
			db,
			"teams",
			teamId,
			"members",
			memberId,
			"billingPeriods"
		);

		const unsubscribe = onSnapshot(ref, (snap) => {
			const list = snap.docs.map((doc) => ({
				id: doc.id,
				...doc.data(),
			}));

			setPeriods(list);
		});

		return () => unsubscribe();
	}, [teamId, memberId]);

	const activePeriods = useMemo(() => {
		const cycle = config?.billingCycle;

		if (!cycle) return [];

		if (cycle === "term") {
			const validTermKeys = new Set(
				(config?.academicYears || []).flatMap((yearItem) =>
					(yearItem.terms || []).map(
						(term) => `${yearItem.academicYear}_term_${term.termNo}`
					)
				)
			);

			return periods.filter(
				(period) =>
					period.billingCycle === "term" &&
					validTermKeys.has(period.periodKey)
			);
		}

		return periods.filter((period) => period.billingCycle === cycle);
	}, [periods, config]);

	const totalAmount = activePeriods.reduce(
		(acc, period) => acc + Number(period.amount || 0),
		0
	);

	const totalPaid = activePeriods.reduce(
		(acc, period) => acc + Number(period.paid || 0),
		0
	);

	const totalBalance = activePeriods.reduce(
		(acc, period) => acc + Number(period.balance || 0),
		0
	);

	const isSettled = totalBalance <= 0 && activePeriods.length > 0;

	const rateLabel = (() => {
		if (config?.billingCycle === "daily") {
			return `${formatCurrency(config?.baseAmount)} / day`;
		}

		if (config?.billingCycle === "monthly") {
			return `${formatCurrency(config?.baseAmount)} / month`;
		}

		if (config?.billingCycle === "annual") {
			return `${formatCurrency(config?.baseAmount)} / year`;
		}

		if (config?.billingCycle === "term") {
			return `${formatCurrency(config?.baseAmount)} / term`;
		}

		return "Not configured";
	})();

	return (
		<Card className="rounded-2xl border shadow-sm">
			<CardHeader className="flex flex-row items-center justify-between">
				<CardTitle className="text-lg">Billing & Fees</CardTitle>

				<div className="flex gap-2">
					<Badge variant={totalBalance > 0 ? "outline" : "secondary"}>
						{totalBalance > 0 ? "Payment Due" : "Settled"}
					</Badge>
				</div>
			</CardHeader>

			<CardContent className="space-y-6">
				<div className="grid grid-cols-2 gap-4 md:grid-cols-4 p-3 rounded-xl border bg-muted/30">
					<div className="space-y-1">
						<p className="text-[10px] uppercase tracking-wider text-muted-foreground">
							Total Amount
						</p>
						<p className="text-lg font-bold text-primary">
							{formatCurrency(totalAmount)}
						</p>
					</div>

					<div className="space-y-1">
						<p className="text-[10px] uppercase tracking-wider text-muted-foreground">
							Total Paid
						</p>
						<p className="text-lg font-bold text-green-600">
							{formatCurrency(totalPaid)}
						</p>
					</div>

					<div className="space-y-1">
						<p className="text-[10px] uppercase tracking-wider text-muted-foreground">
							Total Balance
						</p>
						<p className="text-lg font-bold text-red-600">
							{formatCurrency(totalBalance)}
						</p>
					</div>

					<div className="space-y-1">
						<p className="text-[10px] uppercase tracking-wider text-muted-foreground">
							Rate
						</p>
						<p className="text-lg font-bold">{rateLabel}</p>
					</div>
				</div>

				<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
					<div className="space-y-2">
						<Label className="text-muted-foreground">Billing Frequency</Label>
						<Input
							value={config?.billingCycle?.toUpperCase() || "NOT CONFIGURED"}
							disabled
							className="bg-muted/50 font-medium opacity-100"
						/>
					</div>

					<div className="space-y-2">
						<Label className="text-muted-foreground">Rate</Label>
						<Input
							value={rateLabel}
							disabled
							className="bg-muted/50 font-medium opacity-100"
						/>
					</div>

					{config?.billingCycle === "term" && (
						<div className="space-y-2 md:col-span-2">
							<Label className="text-muted-foreground">Term Breakdown</Label>
							<Input
								value={`${config?.academicYears?.[0]?.terms?.length || 0} Terms configured`}
								disabled
								className="bg-muted/50 font-medium opacity-100"
							/>
						</div>
					)}
				</div>

				<div className="rounded-lg bg-primary/5 p-3 text-xs text-muted-foreground">
					<p>
						* These settings are managed at the Team Level. Charges are applied
						<b> {config?.billingCycle || "cycle"} </b>
						based on the selected billing configuration.
					</p>
				</div>
			</CardContent>
		</Card>
	);
};

export default BillingCard;