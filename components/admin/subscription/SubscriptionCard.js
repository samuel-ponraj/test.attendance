"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, X, CreditCard } from "lucide-react";
import { useTeams } from "../../../app/context/TeamsContext";
import { SUBSCRIPTION_PLANS } from "@/lib/subscriptionPlans";
import { useRouter } from "next/navigation";

const SubscriptionCard = () => {
  const { subscription } = useTeams();
  const router = useRouter();

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
                    <span className="text-3xl font-bold text-foreground">{plan.price}</span>
                    <span className="text-muted-foreground text-sm">{plan.period}</span>
                  </div>
                </div>

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
                  <Button variant="secondary" className="w-full" disabled>
                    Current Plan
                  </Button>
                ) : (
                  <Button
                    variant={isPro ? "default" : "outline"}
                    className="w-full"
                    disabled={!isPro && subscription === "pro"}
                    onClick={() => {
                      if (isPro) router.push("/checkout?plan=pro");
                    }}
                  >
                    {isPro ? "Upgrade to Pro" : "Downgrade to Basic"}
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
