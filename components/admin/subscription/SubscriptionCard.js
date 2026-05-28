"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import {
  Building2,
  CalendarClock,
  CheckCircle2,
  CreditCard,
  Download,
  FileText,
  IndianRupee,
  Loader2,
  Mail,
  RefreshCw,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";
import { collection, doc, onSnapshot, orderBy, query } from "firebase/firestore";
import jsPDF from "jspdf";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useAuth } from "@/app/context/AuthContext";
import { useTeams } from "@/app/context/TeamsContext";
import { db } from "@/lib/firebase";
import {
  BILLING_CYCLES,
  SUBSCRIPTION_PLANS,
  getBillingOption,
  getPlan,
} from "@/lib/subscriptionPlans";

const CUSTOM_PLAN = {
  id: "custom",
  name: "Custom",
  price: "Custom",
  period: "",
  contactHref:
    "mailto:contact@kingzdigitalsolutions.in?subject=Custom%20Attendance%20Plan",
  features: [
    { text: "Higher team and member limits", included: true },
    { text: "Custom billing workflows", included: true },
    { text: "Priority onboarding support", included: true },
    { text: "Dedicated implementation guidance", included: true },
  ],
};

const formatDate = (value) => {
  if (!value) return "Not available";

  const date =
    typeof value?.toDate === "function"
      ? value.toDate()
      : value instanceof Date
      ? value
      : new Date(value);

  if (Number.isNaN(date.getTime())) return "Not available";

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

const titleCase = (value) =>
  value
    ? String(value)
        .replace(/[-_]/g, " ")
        .replace(/\b\w/g, (char) => char.toUpperCase())
    : "Not available";

const formatAmount = (value, currency = "INR") =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(Number(value || 0));

const getStatusClassName = (status = "") => {
  const normalized = String(status || "success").toLowerCase();

  if (["failed", "cancelled"].includes(normalized)) {
    return "border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300";
  }

  if (["pending", "created"].includes(normalized)) {
    return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300";
  }

  return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300";
};

const generateSubscriptionInvoice = ({ transaction, user }) => {
  const doc = new jsPDF();
  const invoiceNo = transaction.id || "subscription-invoice";
  const buyerName = user?.displayName || user?.email || "Customer";
  const buyerEmail = user?.email || "-";
  const createdAt = formatDate(transaction.createdAt);

  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, 210, 297, "F");
  doc.setDrawColor(230, 230, 230);
  doc.rect(7, 7, 196, 283);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text("Kingz Digital Attendance", 12, 22);

  doc.setFontSize(24);
  doc.text("Subscription Invoice", 198, 22, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(90, 90, 90);
  doc.text(`Invoice No: ${invoiceNo}`, 198, 33, { align: "right" });
  doc.text(`Date: ${createdAt}`, 198, 40, { align: "right" });

  doc.setDrawColor(220, 220, 220);
  doc.line(12, 50, 198, 50);

  doc.setTextColor(20, 20, 20);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Bill To", 12, 64);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(90, 90, 90);
  doc.text(buyerName, 12, 72);
  doc.text(buyerEmail, 12, 79);

  doc.setFillColor(245, 247, 250);
  doc.roundedRect(12, 96, 186, 42, 2, 2, "F");

  doc.setTextColor(20, 20, 20);
  doc.setFont("helvetica", "bold");
  doc.text("Plan", 20, 110);
  doc.text("Billing Cycle", 82, 110);
  doc.text("Status", 130, 110);
  doc.text("Amount", 190, 110, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setTextColor(80, 80, 80);
  doc.text(transaction.planName || "Pro", 20, 124);
  doc.text(titleCase(transaction.billingCycle), 82, 124);
  doc.text(titleCase(transaction.status || "success"), 130, 124);
  doc.text(
    formatAmount(transaction.amount, transaction.currency || "INR"),
    190,
    124,
    { align: "right" },
  );

  doc.setFillColor(20, 20, 20);
  doc.roundedRect(12, 162, 186, 22, 2, 2, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(255, 255, 255);
  doc.text("Total Paid", 20, 176);
  doc.text(
    formatAmount(transaction.amount, transaction.currency || "INR"),
    190,
    176,
    { align: "right" },
  );

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(120, 120, 120);
  doc.text("Thank you for your subscription.", 12, 276);
  doc.text("This is a system generated invoice.", 12, 283);

  doc.save(`subscription-invoice-${invoiceNo}.pdf`);
};

const ReportItem = ({ icon: Icon, label, value }) => (
  <div className="flex gap-3 rounded-lg border bg-muted/20 p-4">
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
      <Icon className="h-4 w-4" />
    </div>
    <div className="min-w-0">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 break-words text-sm font-semibold">{value}</p>
    </div>
  </div>
);

const SubscriptionCard = () => {
  const { subscription, planLimits, allTeams, lockedTeams } = useTeams();
  const { user } = useAuth();
  const router = useRouter();
  const [billingCycle, setBillingCycle] = useState(BILLING_CYCLES.MONTHLY);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [razorpayDetails, setRazorpayDetails] = useState(null);
  const [loadingRazorpayDetails, setLoadingRazorpayDetails] = useState(false);
  const [subscriptionDetails, setSubscriptionDetails] = useState(null);
  const [transactions, setTransactions] = useState([]);

  useEffect(() => {
    if (!user?.uid) {
      setSubscriptionDetails(null);
      return;
    }

    const unsubscribe = onSnapshot(doc(db, "users", user.uid), (snapshot) => {
      setSubscriptionDetails(snapshot.exists() ? snapshot.data() : null);
    });

    return () => unsubscribe();
  }, [user?.uid]);

  useEffect(() => {
    if (
      !user ||
      subscriptionDetails?.subscription !== "pro" ||
      !subscriptionDetails?.razorpaySubscriptionId
    ) {
      setRazorpayDetails(null);
      setLoadingRazorpayDetails(false);
      return;
    }

    let active = true;

    const loadRazorpayDetails = async () => {
      setLoadingRazorpayDetails(true);

      try {
        const token = await user.getIdToken();
        const response = await fetch("/api/subscription/details", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || "Failed to load Razorpay details");
        }

        if (active) setRazorpayDetails(result.subscription);
      } catch (error) {
        console.error("Load Razorpay subscription details error:", error);
        if (active) setRazorpayDetails(null);
      } finally {
        if (active) setLoadingRazorpayDetails(false);
      }
    };

    loadRazorpayDetails();

    return () => {
      active = false;
    };
  }, [
    user,
    subscriptionDetails?.subscription,
    subscriptionDetails?.razorpaySubscriptionId,
  ]);

  useEffect(() => {
    if (!user?.uid) {
      setTransactions([]);
      return;
    }

    const transactionsQuery = query(
      collection(db, "users", user.uid, "subscriptionTransactions"),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(transactionsQuery, (snapshot) => {
      setTransactions(
        snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        }))
      );
    });

    return () => unsubscribe();
  }, [user?.uid]);

  const currentPlan = useMemo(
    () => getPlan(subscriptionDetails?.subscription || subscription),
    [subscription, subscriptionDetails?.subscription]
  );

  const activeTeams = allTeams?.length || 0;
  const lockedTeamCount = lockedTeams?.length || 0;
  const currentStatus =
    subscriptionDetails?.subscriptionStatus ||
    (subscription === "basic" ? "active" : "Not available");
  const recurringCycle =
    subscriptionDetails?.subscriptionBillingCycle ||
    (subscription === "basic" ? "Not recurring" : "");
  const planStartedAt =
    subscriptionDetails?.subscriptionStartedAt ||
    subscriptionDetails?.subscriptionUpdatedAt ||
    subscriptionDetails?.createdAt;
  const nextPaymentAt =
    razorpayDetails?.nextPaymentAt || razorpayDetails?.currentEndAt || null;

  const reportItems = [
    {
      icon: ShieldCheck,
      label: "Current Plan",
      value: currentPlan.name,
    },
    {
      icon: RefreshCw,
      label: "Subscription Status",
      value: titleCase(currentStatus),
    },
    {
      icon: CalendarClock,
      label: "Started Date",
      value: formatDate(planStartedAt),
    },
    {
      icon: CreditCard,
      label: "Recurring Details",
      value:
        subscription === "basic"
          ? "No recurring payment"
          : titleCase(recurringCycle),
    },
    {
      icon: CalendarClock,
      label: "Next Subscription Payment",
      value:
        subscriptionDetails?.subscription !== "pro"
          ? "No recurring payment"
          : loadingRazorpayDetails
          ? "Loading from Razorpay..."
          : formatDate(nextPaymentAt),
    },
    {
      icon: IndianRupee,
      label: "Latest Payment",
      value: transactions[0]
        ? formatAmount(transactions[0].amount, transactions[0].currency)
        : "No subscription transaction yet",
    },
    {
      icon: CalendarClock,
      label: "Last Updated",
      value: formatDate(subscriptionDetails?.subscriptionUpdatedAt),
    },
    {
      icon: Users,
      label: "Team Usage",
      value: `${activeTeams} active / ${planLimits.teams} allowed${
        lockedTeamCount ? `, ${lockedTeamCount} locked` : ""
      }`,
    },
  ];

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

  const plans = [...SUBSCRIPTION_PLANS, CUSTOM_PLAN];

  return (
    <div className="flex w-full flex-col gap-4 md:p-0 px-4 md:px-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-primary" />
                <CardTitle>Subscriptions</CardTitle>
              </div>
              <CardDescription className="mt-2">
                Manage your plan, payment status, and recurring subscription
                details.
              </CardDescription>
            </div>
            <Badge variant="outline">{currentPlan.name} plan</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 lg:grid-cols-3">
            {plans.map((plan) => {
              const isCustom = plan.id === "custom";
              const isCurrentPlan = plan.id === subscription;
              const isPro = plan.id === "pro";
              const selectedBilling = getBillingOption(plan, billingCycle);

              return (
                <div
                  key={plan.id}
                  className={`relative flex min-h-full flex-col rounded-xl border-2 p-6 transition-all ${
                    isCurrentPlan
                      ? "border-primary"
                      : plan.popular
                      ? "border-primary/30"
                      : "border-border"
                  }`}
                >
                  {plan.popular && (
                    <Badge className="absolute right-4 top-4">Popular</Badge>
                  )}

                  <div className="mb-6 text-center">
                    <h3 className="text-xl font-bold text-foreground">
                      {plan.name}
                    </h3>
                    {!isCustom && (
                      <div className="mt-2">
                        <span className="text-3xl font-bold text-foreground">
                          {selectedBilling.price}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {selectedBilling.period}
                        </span>
                      </div>
                    )}
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

                  <ul className="mb-6 flex-1 space-y-3">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm">
                        {feature.included ? (
                          <CheckCircle2 className="h-4 w-4 shrink-0 text-green-500" />
                        ) : (
                          <X className="h-4 w-4 shrink-0 text-muted-foreground/40" />
                        )}
                        <span
                          className={
                            feature.included
                              ? "text-foreground"
                              : "text-muted-foreground/60"
                          }
                        >
                          {feature.text}
                        </span>
                      </li>
                    ))}
                  </ul>

                  {isCustom ? (
                    <Button asChild className="w-full">
                      <a href={plan.contactHref}>
                        <Mail className="h-4 w-4" />
                        Contact Us
                      </a>
                    </Button>
                  ) : isCurrentPlan ? (
                    <div className="space-y-2">
                      <Button variant="secondary" className="w-full" disabled>
                        Current Plan
                      </Button>
                      {isPro && (
                        <AlertDialog
                          open={cancelOpen}
                          onOpenChange={setCancelOpen}
                        >
                          <AlertDialogTrigger asChild>
                            <Button
                              type="button"
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
                                This will cancel the active Razorpay
                                subscription and move your account back to Basic
                                immediately.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel disabled={cancelling}>
                                Keep Pro
                              </AlertDialogCancel>
                              <AlertDialogAction
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
                          router.push(
                            `/checkout?plan=pro&billing=${billingCycle}`
                          );
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

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            <CardTitle>Current Plan Report</CardTitle>
          </div>
          <CardDescription>
            Subscription, payment, recurring billing, and usage details for this
            account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 lg:grid-cols-2">
            {reportItems.map((item) => (
              <ReportItem
                key={item.label}
                icon={item.icon}
                label={item.label}
                value={item.value}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            <CardTitle>Subscription Transactions</CardTitle>
          </div>
          <CardDescription>
            Payments made for plan upgrades and recurring subscription renewals.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Billing Cycle</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Invoice</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="h-24 text-center text-muted-foreground"
                    >
                      No subscription transactions recorded yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  transactions.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell className="font-medium">
                        {formatDate(transaction.createdAt)}
                      </TableCell>
                      <TableCell>{transaction.planName || "Pro"}</TableCell>
                      <TableCell>{titleCase(transaction.billingCycle)}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={getStatusClassName(transaction.status)}
                        >
                          {titleCase(transaction.status || "success")}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatAmount(
                          transaction.amount,
                          transaction.currency || "INR"
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            generateSubscriptionInvoice({ transaction, user })
                          }
                        >
                          <Download className="h-4 w-4" />
                          Invoice
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SubscriptionCard;
