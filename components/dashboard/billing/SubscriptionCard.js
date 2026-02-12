import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, X, CreditCard, Zap } from "lucide-react";
import { toast } from "sonner";
import { useTeams } from '../../../app/context/TeamsContext'

const plans = [
  {
    id: "basic",
    name: "Basic",
    price: "₹0",
    period: "forever",
    features: [
      { text: "Up to 2 Teams", included: true },
      { text: "Up to 50 Members per Team", included: true },
      { text: "6-Month Attendance History", included: true },
      { text: "Excel Members Import", included: true },
      { text: "Attendance Report Export (PDF)", included: true },
      { text: "Basic Attendance Analytics", included: true },
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price: "₹49",
    period: "/month",
    popular: true,
    features: [
      { text: "Unlimited Teams", included: true }, 
      { text: "Unlimited Members per Team", included: true }, 
      { text: "1-Year Attendance History", included: true }, 
      { text: "Excel Members Import", included: true }, 
      { text: "Attendance Report Export (PDF)", included: true }, 
      { text: "Advanced Analytics & Detailed Reports", included: true }, 
      { text: "Dedicated Member Dashboard for Self Attendance", included: true }, 
    ],
  },
];


const SubscriptionCard = () => {
  // Use the real-time subscription status from your context
  const { subscription } = useTeams();

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
          {plans.map((plan) => {
            // Check if this plan matches the user's current subscription status
            const isCurrentPlan = plan.id === subscription;
            const isPro = plan.id === "pro";

            return (
              <div
                key={plan.id}
                className={`relative rounded-xl border-2 p-6 transition-all ${
                  isCurrentPlan
                    ? "border-primary "
                    : plan.popular
                    ? "border-primary/30"
                    : "border-border"
                }`}
              >
                {plan.popular && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground">
                    <Zap className="h-3 w-3 mr-1" />
                    Coming Soon
                  </Badge>
                )}

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
                    // DISABLED: Button is disabled for Pro because it is "Coming Soon"
                    // and disabled for Basic if the user is already Pro
                    disabled={isPro || subscription === "pro"} 
                    onClick={() => toast.info("Payment integration coming soon!")}
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
