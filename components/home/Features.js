import {
  Users,
  ClipboardCheck,
  BarChart3,
  Shield,
  Clock,
  Smartphone,
  ReceiptIndianRupee,
  CalendarDays,
  FileText,
} from "lucide-react";

const features = [
  {
    icon: Users,
    title: "Team Management",
    description:
      "Create and organize multiple teams with ease. Add or remove members as your organization grows.",
  },
  {
    icon: ClipboardCheck,
    title: "Quick Attendance",
    description:
      "Mark attendance with a single click. Present, absent, and half-day statuses are recorded instantly.",
  },
  {
    icon: BarChart3,
    title: "Visual Dashboard",
    description:
      "Get a clear overview of teams, members, attendance status, and billing balances at a glance.",
  },
  {
    icon: Shield,
    title: "Admin Controls",
    description:
      "Secure admin access ensures only authorized personnel can manage teams, records, and payments.",
  },
  {
    icon: Clock,
    title: "Real-time Updates",
    description:
      "Attendance and payment records stay current, keeping admins and teams on the same page.",
  },
  {
    icon: Smartphone,
    title: "Responsive Design",
    description:
      "Access the platform from any device, including desktop, tablet, and mobile phone.",
  },
  {
    icon: ReceiptIndianRupee,
    title: "Smart Billing",
    description:
      "Enable fixed, attendance-based, or salary billing so fees match the way your team actually works.",
  },
  {
    icon: CalendarDays,
    title: "Flexible Billing Cycles",
    description:
      "Set up daily, monthly, annual, or term-based billing periods with clear start dates.",
  },
  {
    icon: FileText,
    title: "Receipts & Records",
    description:
      "Record payments, apply discounts, track balances, and download clean payment receipts.",
  },
];

const Features = () => {
  return (
    <section id="features" className="bg-[#0d0d0d] px-4 py-20 text-white">
      <div className="mx-auto w-full max-w-6xl">
        <div className="mb-16 text-center">
          <span className="mb-3 inline-block text-xs font-semibold uppercase tracking-[0.15em] text-[#9d1c1b]">
            Features
          </span>
          <h2 className="mb-4 text-3xl font-bold sm:text-4xl">
            Everything You Need
          </h2>
          <p className="mx-auto max-w-2xl text-lg leading-8 text-neutral-400">
            Powerful features designed to make attendance, billing, and team
            management simple for organizations of any size.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, index) => (
            <div
              key={feature.title}
              className="rounded-lg border border-white/10 bg-white/[0.03] p-6 shadow-[0_8px_24px_rgba(149,157,165,0.12)] transition-all duration-300 hover:-translate-y-1 hover:border-[#9d1c1b]/50 hover:bg-white/[0.06]"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-[#9d1c1b]/10 text-[#9d1c1b]">
                <feature.icon className="h-6 w-6" />
              </div>

              <h3 className="mb-2 text-xl font-semibold">{feature.title}</h3>
              <p className="leading-7 text-neutral-400">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
