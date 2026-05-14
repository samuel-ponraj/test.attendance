"use client";

import { ArrowRight, CheckCircle, ReceiptIndianRupee } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/app/context/AuthContext";

const highlights = [
  "Real-time tracking",
  "Team management",
  "Billing & receipts",
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
    <div className="relative flex min-h-[100vh] items-center justify-center overflow-hidden bg-[url('/bg1.jpg')] bg-cover bg-center bg-no-repeat px-4 py-16 text-white md:bg-fixed">
      <div className="absolute inset-0 bg-black/75" />

      <section className="relative z-10 flex w-full max-w-4xl flex-col items-center text-center">
        <p className="rounded-full bg-[#9d1c1b] px-4 py-2 text-sm font-medium text-white">
          Simple Attendance, Billing & Payment Management
        </p>

        <h1 className="mt-6 text-4xl font-extrabold leading-tight sm:text-5xl lg:text-6xl">
          Track Attendance and Billing with{" "}
          <span className="text-primary">Ease and Precision</span>
        </h1>

        <p className="mt-6 max-w-3xl text-base leading-8 text-neutral-300 sm:text-lg">
          Add teams, manage members, record attendance, generate billing
          periods, collect payments, and download receipts from one simple
          admin dashboard.
        </p>

        <div className="mt-8 flex w-full flex-col items-center justify-center gap-4 sm:flex-row">
          <button
            className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-[#9d1c1b] px-5 py-3 text-base font-medium text-white transition hover:bg-[#8b1918] sm:w-auto"
            onClick={handleRecordAttendance}
          >
            Record Attendance <ArrowRight className="h-5 w-5" />
          </button>

          <Link href="#features" className="w-full sm:w-auto">
            <button className="w-full rounded-md border border-white/80 px-5 py-3 text-base font-medium text-white transition hover:bg-white/10 sm:w-auto">
              Learn More
            </button>
          </Link>
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          {highlights.map((text) => (
            <div
              key={text}
              className="flex items-center gap-2 whitespace-nowrap text-sm text-neutral-200"
            >
              {text === "Billing & receipts" ? (
                <ReceiptIndianRupee className="h-5 w-5 text-primary" />
              ) : (
                <CheckCircle className="h-5 w-5 text-primary" />
              )}
              <span>{text}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default HomePage;
