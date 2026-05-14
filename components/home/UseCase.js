"use client";

import { motion } from "framer-motion";
import {
  GraduationCap,
  Dumbbell,
  Building2,
  Users,
  ReceiptIndianRupee,
} from "lucide-react";

const useCases = [
  {
    icon: GraduationCap,
    title: "Classes & Tuitions",
    description:
      "Track daily student attendance and connect it with monthly or term fee records.",
    color: "text-blue-400",
    border: "border-blue-500/30",
    background: "bg-blue-500/10",
  },
  {
    icon: Dumbbell,
    title: "Sports Teams",
    description:
      "Keep practice attendance, session participation, and payment status easy to review.",
    color: "text-emerald-400",
    border: "border-emerald-500/30",
    background: "bg-emerald-500/10",
  },
  {
    icon: Building2,
    title: "Offices",
    description:
      "Streamline employee attendance, salary tracking, and admin payment records.",
    color: "text-violet-400",
    border: "border-violet-500/30",
    background: "bg-violet-500/10",
  },
  {
    icon: Users,
    title: "Training Teams",
    description:
      "Monitor trainee attendance for workshops, batches, and corporate programs.",
    color: "text-orange-400",
    border: "border-orange-500/30",
    background: "bg-orange-500/10",
  },
  {
    icon: ReceiptIndianRupee,
    title: "Fee-Based Programs",
    description:
      "Manage fees, discounts, receipts, and balances for programs that charge by attendance or cycle.",
    color: "text-rose-400",
    border: "border-rose-500/30",
    background: "bg-rose-500/10",
  },
];

const UseCasesSection = () => {
  return (
    <section id="use-cases" className="bg-[#0d0d0d] px-4 py-20 text-white">
      <div className="mx-auto w-full max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mx-auto mb-16 max-w-3xl text-center"
        >
          <span className="mb-3 inline-block text-xs font-semibold uppercase tracking-[0.15em] text-[#9d1c1b]">
            Use Cases
          </span>
          <h2 className="text-3xl font-bold sm:text-4xl">
            Built for <span className="text-primary">any team</span>
          </h2>
          <p className="mt-4 text-lg leading-8 text-neutral-400">
            Whether you manage a classroom, office, sports group, or paid
            program, Kingz Digital Attendance adapts to attendance and billing
            needs.
          </p>
        </motion.div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {useCases.map((useCase, index) => (
            <motion.div
              key={useCase.title}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className={`h-full rounded-lg border ${useCase.border} ${useCase.background} p-6 transition-all duration-300 hover:-translate-y-1`}
            >
              <div className={`mb-5 flex h-14 w-14 items-center justify-center rounded-lg bg-black/20 ${useCase.color}`}>
                <useCase.icon className="h-7 w-7" />
              </div>

              <h3 className="text-xl font-semibold">{useCase.title}</h3>
              <p className="mt-3 leading-7 text-neutral-400">
                {useCase.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default UseCasesSection;
