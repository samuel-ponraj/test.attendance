"use client";

import Script from "next/script";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, CheckCircle2, CreditCard, Loader2 } from "lucide-react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/app/context/AuthContext";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  BILLING_CYCLES,
  SUBSCRIPTION_PLANS,
  getBillingOption,
} from "@/lib/subscriptionPlans";

function CheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const [scriptReady, setScriptReady] = useState(false);
  const [loading, setLoading] = useState(false);

  const selectedPlan = useMemo(() => {
    const planId = searchParams.get("plan") || "pro";
    return (
      SUBSCRIPTION_PLANS.find((plan) => plan.id === planId) ||
      SUBSCRIPTION_PLANS.find((plan) => plan.id === "pro")
    );
  }, [searchParams]);
  const billingCycle = useMemo(() => {
    const requestedBilling = searchParams.get("billing");
    return Object.values(BILLING_CYCLES).includes(requestedBilling)
      ? requestedBilling
      : BILLING_CYCLES.MONTHLY;
  }, [searchParams]);
  const selectedBilling = useMemo(
    () => getBillingOption(selectedPlan, billingCycle),
    [selectedPlan, billingCycle]
  );

  useEffect(() => {
    document.title = "Checkout | Kingz Digital Attendance";
  }, []);

  useEffect(() => {
    if (window.Razorpay) {
      setScriptReady(true);
    }
  }, []);

  const changeBillingCycle = (nextBillingCycle) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("plan", selectedPlan?.id || "pro");
    params.set("billing", nextBillingCycle);
    router.replace(`/checkout?${params.toString()}`);
  };

  const startCheckout = async () => {
    if (!user || !selectedPlan) return;
    if (!window.Razorpay) {
      toast.error("Razorpay checkout is still loading. Please try again.");
      return;
    }

    setLoading(true);
    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/create-subscription", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          plan: selectedPlan.id,
          billingCycle,
        }),
      });
      const subscription = await response.json();

      if (!response.ok) {
        throw new Error(subscription.error || "Failed to start checkout");
      }

      const options = {
        key: subscription.keyId,
        subscription_id: subscription.id,
        name: "Kingz Digital Attendance",
        description: `${selectedPlan.name} subscription`,
        prefill: {
          name: user.displayName || "",
          email: user.email || "",
        },
        theme: {
          color: "#0f172a",
        },
        handler: async (paymentResponse) => {
          try {
            const verifyResponse = await fetch("/api/subscription/verify", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({
                ...paymentResponse,
                billingCycle,
              }),
            });
            const verifyResult = await verifyResponse.json();

            if (!verifyResponse.ok) {
              throw new Error(verifyResult.error || "Payment verification failed");
            }

            toast.success("Pro plan activated successfully");
            router.push("/admin/account");
          } catch (error) {
            console.error("Payment verification error:", error);
            toast.error(error.message || "Payment verification failed");
          }
        },
      };

      const razorpay = new window.Razorpay(options);
      razorpay.on("payment.failed", (response) => {
        toast.error(response.error?.description || "Payment failed");
      });
      razorpay.open();
    } catch (error) {
      toast.error(error.message || "Unable to start checkout");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-muted/30 px-4 py-10">
      <div className="mx-auto max-w-4xl">
        <Button
          variant="ghost"
          className="mb-6"
          onClick={() => router.push("/admin/account")}
        >
          <ArrowLeft />
          Back to account
        </Button>

        <div className="grid gap-6 md:grid-cols-[1.15fr_0.85fr]">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-primary" />
                <CardTitle>Checkout</CardTitle>
              </div>
              <CardDescription>
                Upgrade your attendance workspace to Pro.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <p className="text-sm text-muted-foreground">Selected plan</p>
                <div className="mt-2 flex items-baseline justify-between rounded-lg border p-4">
                  <div>
                    <h2 className="text-2xl font-bold">{selectedPlan?.name}</h2>
                    <p className="text-sm text-muted-foreground">
                      {selectedBilling?.helperText || "Billed through Razorpay"}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-3xl font-bold">
                      {selectedBilling?.price}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {selectedBilling?.period}
                    </span>
                  </div>
                </div>
              </div>

              {selectedPlan?.billingOptions && (
                <div className="grid grid-cols-2 gap-2">
                  {selectedPlan.billingOptions.map((option) => (
                    <Button
                      key={option.id}
                      type="button"
                      variant={billingCycle === option.id ? "default" : "outline"}
                      onClick={() => changeBillingCycle(option.id)}
                    >
                      {option.label}
                    </Button>
                  ))}
                </div>
              )}

              <Button
                className="w-full"
                size="lg"
                disabled={loading}
                onClick={startCheckout}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Starting checkout...
                  </>
                ) : (
                  scriptReady ? "Pay with Razorpay" : "Loading Razorpay..."
                )}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>What Pro unlocks</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {selectedPlan?.features.map((feature) => (
                  <li key={feature.text} className="flex gap-2 text-sm">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
                    <span>{feature.text}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>

      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        onLoad={() => setScriptReady(true)}
        onReady={() => setScriptReady(true)}
      />
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <ProtectedRoute allowedRole="admin">
      <Suspense
        fallback={
          <div className="flex min-h-screen items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        }
      >
        <CheckoutContent />
      </Suspense>
    </ProtectedRoute>
  );
}
