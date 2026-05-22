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

  const goToCheckout = () => {
    onOpenChange(false);
    router.push("/checkout?plan=pro");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="rounded-lg border bg-muted/40 p-4">
          <div className="flex items-baseline justify-between gap-4">
            <div>
              <p className="font-semibold">{proPlan?.name || "Pro"}</p>
              <p className="text-sm text-muted-foreground">
                More teams, more members, longer history, and PDF exports.
              </p>
            </div>
            <div className="text-right">
              <span className="text-2xl font-bold">
                {proPlan?.price || "₹499"}
              </span>
              <span className="text-sm text-muted-foreground">
                {proPlan?.period || "/month"}
              </span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Not now
          </Button>
          <Button onClick={goToCheckout}>Upgrade to Pro</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
