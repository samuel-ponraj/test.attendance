"use client";

import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { SUBSCRIPTION_PLANS } from "@/lib/subscriptionPlans";

const proPlan = SUBSCRIPTION_PLANS.find((plan) => plan.id === "pro");

export default function UpgradeDialog({
  open,
  onOpenChange,
  title = "Upgrade to Pro",
  description = "This feature is available on the Pro plan.",
}) {
  const router = useRouter();

  const goToCheckout = (billingCycle = "monthly") => {
    onOpenChange(false);
    router.push(`/checkout?plan=pro&billing=${billingCycle}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="rounded-lg border bg-muted/40 p-4">
          <p className="font-semibold">{proPlan?.name || "Pro"}</p>
          <p className="text-sm text-muted-foreground">
            More teams, more members, longer history, and PDF exports.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {proPlan?.billingOptions?.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => goToCheckout(option.id)}
                className="rounded-lg border bg-background p-3 text-left transition-colors hover:border-primary"
              >
                <span className="block text-sm font-medium">
                  {option.label}
                </span>
                <span className="mt-1 block text-xl font-bold">
                  {option.price}
                  <span className="text-sm font-normal text-muted-foreground">
                    {option.period}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Not now
          </Button>
          <Button onClick={() => goToCheckout("monthly")}>
            Upgrade Monthly
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
