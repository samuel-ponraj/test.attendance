import {
  BadgeIndianRupee,
  CalendarClock,
  FileCheck2,
  Percent,
  ReceiptText,
  WalletCards,
} from "lucide-react";

const billingFeatures = [
  {
    icon: BadgeIndianRupee,
    title: "Multiple Billing Types",
    description:
      "Choose fixed billing, attendance-based billing, or salary tracking for each team.",
  },
  {
    icon: CalendarClock,
    title: "Daily, Monthly, Annual & Term",
    description:
      "Generate billing periods from the configured start date and match them to your payment cycle.",
  },
  {
    icon: WalletCards,
    title: "Payment Tracking",
    description:
      "View total amount, paid amount, discounts, and remaining balance member by member.",
  },
  {
    icon: Percent,
    title: "Discount Support",
    description:
      "Apply discounts during invoice creation while keeping the original billing amount visible.",
  },
  {
    icon: FileCheck2,
    title: "Attendance-Aware Fees",
    description:
      "Daily billing can skip holidays and leave days, so payable amounts stay accurate.",
  },
  {
    icon: ReceiptText,
    title: "Receipts & Payment History",
    description:
      "Download receipts and keep a clean payment log for admin review and member records.",
  },
];

const summaryStats = [
  ["3", "Billing types"],
  ["4", "Cycle options"],
  ["100%", "Member-level tracking"],
];

const BillingFeatures = () => {
  return (
    <section className="bg-[#0d0d0d] px-4 py-20 text-white">
      <div className="mx-auto grid w-full max-w-6xl gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
        <div>
          <span className="mb-3 inline-block text-xs font-semibold uppercase tracking-[0.15em] text-[#9d1c1b]">
            Billing Features
          </span>
          <h2 className="text-3xl font-bold leading-tight sm:text-4xl">
            Attendance and billing finally work together.
          </h2>
          <p className="mt-5 text-lg leading-8 text-neutral-400">
            Manage fees, salaries, invoices, payments, discounts, and balances
            from the same admin flow you already use for attendance.
          </p>

          <div className="mt-8 grid grid-cols-3 gap-3">
            {summaryStats.map(([value, label]) => (
              <div
                key={label}
                className="rounded-lg border border-white/10 bg-white/[0.04] p-4"
              >
                <p className="text-2xl font-bold text-white">{value}</p>
                <p className="mt-1 text-xs leading-5 text-neutral-400">
                  {label}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {billingFeatures.map((feature) => (
            <div
              key={feature.title}
              className="rounded-lg border border-white/10 bg-white/[0.03] p-5 transition-all duration-300 hover:border-[#9d1c1b]/50 hover:bg-white/[0.06]"
            >
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg bg-[#9d1c1b]/10 text-[#9d1c1b]">
                <feature.icon className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-semibold">{feature.title}</h3>
              <p className="mt-2 leading-7 text-neutral-400">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default BillingFeatures;
