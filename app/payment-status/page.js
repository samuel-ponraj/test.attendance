"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, CircleX } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function PaymentStatusPage() {
  const searchParams = useSearchParams();
  const paymentStatus = searchParams.get("payment");
  const teamId = searchParams.get("teamId");
  const memberId = searchParams.get("memberId");
  const isSuccess = paymentStatus === "success";
  const adminHref =
    teamId && memberId
      ? `/admin/teams/${teamId}/billing?memberId=${memberId}&payment=${paymentStatus || "success"}`
      : "/login";

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
      <Card className="w-full max-w-md">
        <CardContent className="space-y-6 p-8 text-center">
          <div className="flex justify-center">
            {isSuccess ? (
              <CheckCircle2 className="h-16 w-16 text-emerald-600" />
            ) : (
              <CircleX className="h-16 w-16 text-red-600" />
            )}
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-bold">
              {isSuccess ? "Payment Successful" : "Payment Not Completed"}
            </h1>
            <p className="text-muted-foreground">
              {isSuccess
                ? "Thank you. Your payment has been recorded successfully."
                : "We could not confirm this payment. Please contact the admin if money was deducted."}
            </p>
          </div>

          <Button asChild className="w-full">
            <Link href={adminHref}>
              {teamId && memberId ? "Back to Billing" : "Go to Login"}
            </Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
