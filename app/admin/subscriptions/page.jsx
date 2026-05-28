import SubscriptionCard from "@/components/admin/subscription/SubscriptionCard";
import { Toaster } from "sonner";

export default function SubscriptionsPage() {
  return (
    <div className="flex w-full flex-col gap-4 md:gap-6">
      <Toaster richColors position="top-center" />
      <SubscriptionCard />
    </div>
  );
}
