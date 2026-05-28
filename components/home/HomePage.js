"use client";

import {
  ArrowRight,
  CalendarCheck,
  CheckCircle,
  ReceiptIndianRupee,
  Users,
  WalletCards,
} from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/app/context/AuthContext";
import styles from "./HomePage.module.css";

const highlights = [
  "Live attendance",
  "Fee tracking",
  "Receipts",
];

const floatingStats = [
  {
    label: "Present today",
    value: "18",
    icon: CalendarCheck,
    className: styles.floatAttendance,
  },
  {
    label: "Members",
    value: "28",
    icon: Users,
    className: styles.floatMembers,
  },
  {
    label: "Paid",
    value: "Rs 48k",
    icon: WalletCards,
    className: styles.floatPaid,
  },
  {
    label: "Receipts",
    value: "PDFs",
    icon: ReceiptIndianRupee,
    className: styles.floatReceipts,
  },
];

const HomePage = () => {
  const router = useRouter();
  const { user, userData, loading } = useAuth();

  const handleRecordAttendance = () => {
    if (loading) return;

    if (!user) {
      router.push("/login");
      return;
    }

    if (userData?.role === "admin") {
      router.push("/admin");
    } else if (userData?.role === "member") {
      router.push("/member");
    } else {
      router.push("/pending");
    }
  };

  return (
    <div className="relative flex min-h-screen items-center overflow-hidden bg-[url('/bg1.jpg')] bg-cover bg-center bg-no-repeat px-4 pb-12 pt-24 text-white md:bg-fixed md:pb-14 md:pt-28 lg:pb-12 lg:pt-24">
      <div className="absolute inset-0 bg-black/80" />
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#0d0d0d] to-transparent" />

      <section className="relative z-10 mx-auto grid w-full max-w-7xl items-center gap-14 md:gap-12 lg:grid-cols-[0.78fr_1.12fr] lg:gap-12">
        <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
          <p className="rounded-full bg-[#9d1c1b] px-4 py-2 text-xs font-semibold text-white">
            Attendance + Billing
          </p>

          <h1 className="mt-5 max-w-2xl text-[2.1rem] font-extrabold leading-[1.08] sm:text-[2.8rem] lg:text-[3.35rem]">
            Attendance, billing, receipts.{" "}
            <span className="text-primary">All in one place.</span>
          </h1>

          <p className="mt-5 max-w-lg text-[0.95rem] leading-7 text-neutral-300 sm:text-base">
            Mark members present, see fee balances, and collect payments from a
            focused admin dashboard.
          </p>

          <div className="mt-7 flex w-full flex-col items-center gap-3 sm:w-auto sm:flex-row lg:items-start">
            <button
              className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-md bg-[#9d1c1b] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#8b1918] sm:w-auto"
              onClick={handleRecordAttendance}
            >
              Start Tracking <ArrowRight className="h-5 w-5" />
            </button>

            <Link href="#features" className="w-full sm:w-auto">
              <button className="w-full cursor-pointer rounded-md border border-white/70 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10 sm:w-auto">
                See Dashboard
              </button>
            </Link>
          </div>

          <div className="mt-7 hidden flex-wrap items-center justify-center gap-x-5 gap-y-3 sm:flex lg:justify-start">
            {highlights.map((text) => (
              <div
                key={text}
                className="flex items-center gap-2 whitespace-nowrap text-[0.82rem] text-neutral-200"
              >
                {text !== "Live attendance" ? (
                  <ReceiptIndianRupee className="h-5 w-5 text-primary" />
                ) : (
                  <CheckCircle className="h-5 w-5 text-primary" />
                )}
                <span>{text}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative mx-auto mt-4 w-full max-w-3xl md:mt-0 md:max-w-4xl lg:max-w-[860px] xl:max-w-[940px]">
          <div className="absolute -inset-4 rounded-[28px] bg-[#9d1c1b]/15 blur-3xl" />

          {floatingStats.map((item) => (
            <div
              key={item.label}
              className={`${styles.floatingStat} ${item.className}`}
            >
              <span className={styles.floatingIcon}>
                <item.icon className="h-4 w-4" />
              </span>
              <span>
                <strong>{item.value}</strong>
                <small>{item.label}</small>
              </span>
            </div>
          ))}

          <div className="relative overflow-hidden rounded-lg border border-white/15 bg-black/40 shadow-2xl shadow-black/60">
            <Image
              src="/mockups/dashboard-desktop.png"
              alt="Kingz Digital Attendance dashboard preview"
              width={1920}
              height={1080}
              priority
              className="h-auto w-full"
            />
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
