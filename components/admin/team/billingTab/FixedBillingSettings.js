"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import {
	Select,
	SelectTrigger,
	SelectValue,
	SelectContent,
	SelectItem,
} from "@/components/ui/select";

const FixedBillingSettings = ({
	config,
	setConfig,
	totalMembers,
	billingType,
	billingTypes,
	selectedBillingType,
	isBillingTypeLocked,
	setBillingType,
	billingStartDate,
	setBillingStartDate,
	billingModes,
}) => {
	const updateField = (key, value) => {
		setConfig((prev) => ({
			...prev,
			[key]: value,
		}));
	};

	return (
		<div className="space-y-6">
			<div className="grid gap-3 p-3 rounded-lg border bg-muted/40">
				<p className="text-sm font-medium">Estimated Billing Snapshot</p>

				<div className="text-sm text-muted-foreground space-y-1">
					<p>
						Total Members: <b>{totalMembers}</b>
					</p>

					<p>
						Billing Type:{" "}
						<b>{selectedBillingType?.label || "Not selected"}</b>
					</p>

					<p>
						Rate:{" "}
						<b>
							₹{config.amountPerMember} / member
						</b>
					</p>

					{config.billingCycle === "term" && (
						<div className="pt-1 border-t mt-1 border-gray-700/50">
							<p>
								Terms per Year: <b>{config.divisionsPerYear}</b>
							</p>

							<p>
								Est. Term Duration:{" "}
								<b>
									{Math.round(
										12 / (Number(config.divisionsPerYear) || 1)
									)}{" "}
									months
								</b>
							</p>
						</div>
					)}

					<div className="pt-2">
						<p className="text-primary font-bold text-base">
							Total Charge: ₹
							{totalMembers * Number(config.amountPerMember || 0)}
						</p>
					</div>
				</div>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
				{/* <div className="space-y-2 w-full">
					<Label>Billing Type</Label>

					<Select
						value={billingType}
						onValueChange={setBillingType}
						disabled={isBillingTypeLocked}
					>
						<SelectTrigger className="w-full">
							<SelectValue placeholder="Select billing type" />
						</SelectTrigger>

						<SelectContent>
							{billingTypes.map((type) => (
								<SelectItem key={type.value} value={type.value}>
									{type.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>

					<p className="text-[11px] text-muted-foreground">
						{isBillingTypeLocked
							? "Billing type is locked after setup."
							: selectedBillingType?.description ||
							  "Choose how members should be billed."}
					</p>
				</div> */}

				<div className="space-y-2">
					<Label>Billing Start Date</Label>

					<Input
						type="date"
						value={billingStartDate}
						onChange={(e) => setBillingStartDate(e.target.value)}
						className="w-full"
					/>

					<p className="text-[10px] text-muted-foreground italic">
						The 1-year cycle will end automatically on this date + 365
						days.
					</p>
				</div>

				<div className="space-y-2 w-full">
					<Label>Billing Cycle</Label>

					<Select
						value={config.billingCycle}
						onValueChange={(value) =>
							updateField("billingCycle", value)
						}
					>
						<SelectTrigger className="w-full">
							<SelectValue placeholder="Select cycle" />
						</SelectTrigger>

						<SelectContent>
							{billingModes.map((mode) => (
								<SelectItem key={mode.value} value={mode.value}>
									{mode.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>

				<div className="space-y-2 w-full">
					<Label>
						{config.billingCycle === "term"
							? "Rate Per Member (Per Term)"
							: "Rate Per Member (₹)"}
					</Label>

					<Input
						type="number"
						min={0}
						value={config.amountPerMember}
						onChange={(e) =>
							updateField("amountPerMember", e.target.value)
						}
						placeholder="e.g. 500"
						className="w-full"
					/>
				</div>

				{config.billingCycle === "term" && (
					<div className="space-y-2 w-full">
						<Label>How many terms in one year?</Label>

						<Input
							type="number"
							min={1}
							value={config.divisionsPerYear}
							onChange={(e) =>
								updateField(
									"divisionsPerYear",
									e.target.value
								)
							}
							placeholder="e.g. 3"
							className="w-full"
						/>
					</div>
				)}

				{config.billingCycle === "monthly" && (
					<div className="space-y-2 w-full">
						<Label>Due Day of Month</Label>

						<Input
							type="number"
							min={1}
							max={31}
							value={config.dueDayOfMonth}
							onChange={(e) =>
								updateField(
									"dueDayOfMonth",
									e.target.value
								)
							}
						/>
					</div>
				)}

				{(config.billingCycle === "term" ||
					config.billingCycle === "annual") && (
					<div className="space-y-2 w-full">
						<Label>Due After Days</Label>

						<Input
							type="number"
							min={1}
							value={config.dueDaysAfterStart}
							onChange={(e) =>
								updateField(
									"dueDaysAfterStart",
									e.target.value
								)
							}
						/>
					</div>
				)}

				{config.billingCycle === "daily" && (
					<div className="space-y-2 w-full">
						<Label>Due Every N Days</Label>

						<Input
							type="number"
							min={1}
							value={config.dueEveryNDays}
							onChange={(e) =>
								updateField(
									"dueEveryNDays",
									e.target.value
								)
							}
						/>
					</div>
				)}

				<div className="space-y-2 w-full">
					<Label>Grace Days</Label>

					<Input
						type="number"
						min={0}
						value={config.graceDays}
						onChange={(e) =>
							updateField("graceDays", e.target.value)
						}
					/>
				</div>

				<div className="space-y-2 w-full">
					<Label>Late Fee Per Day (₹)</Label>

					<Input
						type="number"
						min={0}
						value={config.lateFeePerDay}
						onChange={(e) =>
							updateField(
								"lateFeePerDay",
								e.target.value
							)
						}
					/>
				</div>
			</div>
		</div>
	);
};

export default FixedBillingSettings;