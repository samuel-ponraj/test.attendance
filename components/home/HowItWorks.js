"use client";

import { motion } from "framer-motion";
import { UserPlus, ListPlus, CheckCircle, ReceiptIndianRupee } from "lucide-react";

const steps = [
  {
    number: "01",
    icon: UserPlus,
    title: "Create Your Team",
    description:
      "Sign up and create your first team in seconds. Add team details and schedule preferences.",
  },
  {
    number: "02",
    icon: ListPlus,
    title: "Add Members",
    description:
      "Build your roster by adding members and keeping their records organized.",
  },
  {
    number: "03",
    icon: CheckCircle,
    title: "Mark Attendance",
    description:
      "Record present, absent, or half-day attendance and keep a clear history.",
  },
  {
    number: "04",
    icon: ReceiptIndianRupee,
    title: "Manage Billing",
    description:
      "Generate billing periods, collect payments, track balances, and download receipts.",
  },
];

const HowItWorksSection = () => {
  return (
    <section id="how-it-works" className="bg-[#0d0d0d] px-4 py-24 text-white">
      <div className="relative z-10 mx-auto w-full max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mx-auto mb-16 max-w-3xl text-center"
        >
          <span className="mb-3 inline-block text-xs font-semibold uppercase tracking-[0.15em] text-[#9d1c1b]">
            How It Works
          </span>

          <h2 className="text-3xl font-bold sm:text-4xl">
            Get started in <span className="text-primary">4 simple steps</span>
          </h2>

          <p className="mt-4 text-lg leading-8 text-neutral-400">
            No complex setup required. Start tracking attendance and billing in
            minutes.
          </p>
        </motion.div>

        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, index) => (
            <motion.div
              key={step.number}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.15 }}
              className="relative text-center"
            >
              {index < steps.length - 1 && (
                <div className="absolute left-[60%] top-14 hidden h-px w-full bg-gradient-to-r from-[#9d1c1b] to-transparent lg:block" />
              )}

              <div className="relative mx-auto mb-6 flex h-28 w-28 items-center justify-center rounded-full border border-[#9d1c1b]/35 bg-[#9d1c1b]/10 text-[#9d1c1b]">
                <span className="absolute -right-1 -top-1 flex h-8 w-8 items-center justify-center rounded-full bg-[#9d1c1b] text-xs font-bold text-white">
                  {step.number}
                </span>
                <step.icon className="h-12 w-12" />
              </div>

              <h3 className="text-xl font-semibold">{step.title}</h3>
              <p className="mt-3 leading-7 text-neutral-400">
                {step.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;
