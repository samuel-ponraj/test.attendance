"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { CheckCircle2, X, CreditCard, Loader2 } from "lucide-react";
import { useTeams } from "../../../app/context/TeamsContext";
import {
  BILLING_CYCLES,
  SUBSCRIPTION_PLANS,
  getBillingOption,
} from "@/lib/subscriptionPlans";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useAuth } from "@/app/context/AuthContext";

const SubscriptionCard = () => {
  const { subscription } = useTeams();
  const { user } = useAuth();
  const router = useRouter();
  const [billingCycle, setBillingCycle] = useState(BILLING_CYCLES.MONTHLY);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const cancelSubscription = async () => {
    if (!user) {
      toast.error("Please sign in again to cancel your subscription");
      return;
    }

    setCancelling(true);

    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/subscription/cancel", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to cancel subscription");
      }

      toast.success("Subscription cancelled");
      setCancelOpen(false);
      router.refresh();
    } catch (error) {
      console.error("Cancel subscription error:", error);
      toast.error(error.message || "Failed to cancel subscription");
    } finally {
      setCancelling(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-primary" />
          <CardTitle>Billing & Plans</CardTitle>
        </div>
        <CardDescription>Manage your subscription plan</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid md:grid-cols-2 gap-6">
          {SUBSCRIPTION_PLANS.map((plan) => {
            const isCurrentPlan = plan.id === subscription;
            const isPro = plan.id === "pro";
            const selectedBilling = getBillingOption(plan, billingCycle);

            return (
              <div
                key={plan.id}
                className={`relative rounded-xl border-2 p-6 transition-all ${
                  isCurrentPlan
                    ? "border-primary"
                    : plan.popular
                    ? "border-primary/30"
                    : "border-border"
                }`}
              >
                <div className="text-center mb-6">
                  <h3 className="text-xl font-bold text-foreground">{plan.name}</h3>
                  <div className="mt-2">
                    <span className="text-3xl font-bold text-foreground">
                      {selectedBilling.price}
                    </span>
                    <span className="text-muted-foreground text-sm">
                      {selectedBilling.period}
                    </span>
                  </div>
                </div>

                {isPro && (
                  <div className="mb-6 grid grid-cols-2 gap-2">
                    {plan.billingOptions.map((option) => (
                      <Button
                        key={option.id}
                        type="button"
                        variant={
                          billingCycle === option.id ? "default" : "outline"
                        }
                        onClick={() => setBillingCycle(option.id)}
                      >
                        {option.label}
                      </Button>
                    ))}
                  </div>
                )}

                <ul className="space-y-3 mb-6">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm">
                      {feature.included ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                      ) : (
                        <X className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                      )}
                      <span className={feature.included ? "text-foreground" : "text-muted-foreground/60"}>
                        {feature.text}
                      </span>
                    </li>
                  ))}
                </ul>

                {isCurrentPlan ? (
                  <div className="space-y-2">
                    <Button variant="secondary" className="w-full" disabled>
                      Current Plan
                    </Button>
                    {isPro && (
                      <AlertDialog open={cancelOpen} onOpenChange={setCancelOpen}>
                        <AlertDialogTrigger asChild>
                          <Button
                            type="button"
                            variant="destructive"
                            className="w-full"
                            disabled={cancelling}
                          >
                            {cancelling ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Cancelling...
                              </>
                            ) : (
                              "Cancel Subscription"
                            )}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>
                              Cancel Pro subscription?
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              This will cancel the active Razorpay subscription
                              and move your account back to Basic immediately.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel disabled={cancelling}>
                              Keep Pro
                            </AlertDialogCancel>
                            <AlertDialogAction
                              variant="destructive"
                              disabled={cancelling}
                              onClick={(event) => {
                                event.preventDefault();
                                cancelSubscription();
                              }}
                            >
                              {cancelling ? "Cancelling..." : "Cancel Pro"}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                ) : (
                  <Button
                    variant={isPro ? "default" : "outline"}
                    className="w-full"
                    disabled={!isPro && subscription === "pro"}
                    onClick={() => {
                      if (isPro) {
                        router.push(`/checkout?plan=pro&billing=${billingCycle}`);
                      }
                    }}
                  >
                    {isPro
                      ? `Upgrade ${selectedBilling.label}`
                      : "Downgrade to Basic"}
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default SubscriptionCard;
