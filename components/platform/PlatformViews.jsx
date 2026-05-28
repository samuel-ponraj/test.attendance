"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CreditCard,
  Eye,
  EyeOff,
  IndianRupee,
  Loader2,
  ReceiptIndianRupee,
  Save,
  Shield,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/app/context/AuthContext";
import { auth } from "@/lib/firebase";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  EmailAuthProvider,
  sendPasswordResetEmail,
  updatePassword,
  reauthenticateWithCredential,
} from "firebase/auth";

const formatDate = (millis) => {
  if (!millis) return "Not available";

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(millis));
};

const formatDateOnly = (millis) => {
  if (!millis) return "Not available";

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
  }).format(new Date(millis));
};

const formatAmount = (value, currency = "INR") =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(Number(value || 0));

const titleCase = (value) =>
  value
    ? String(value)
        .replace(/[-_]/g, " ")
        .replace(/\b\w/g, (char) => char.toUpperCase())
    : "Not available";

const statusClassName = (status = "") => {
  const normalized = String(status || "active").toLowerCase();

  if (["cancelled", "failed"].includes(normalized)) {
    return "border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300";
  }

  if (["pending", "created"].includes(normalized)) {
    return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300";
  }

  return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300";
};

const usePlatformFetch = () => {
  const { user } = useAuth();

  return useCallback(async (url, options = {}) => {
    if (!user) throw new Error("Authentication required");

    const token = await user.getIdToken();
    const response = await fetch(url, {
      ...options,
      headers: {
        ...(options.headers || {}),
        Authorization: `Bearer ${token}`,
      },
    });
    const rawBody = await response.text();
    let data = {};

    if (rawBody) {
      try {
        data = JSON.parse(rawBody);
      } catch {
        throw new Error(rawBody.slice(0, 160) || "Invalid server response");
      }
    }

    if (!response.ok) {
      throw new Error(data.error || "Request failed");
    }

    return data;
  }, [user]);
};

function LoadingState() {
  return (
    <div className="flex h-40 items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );
}

export function PlatformDashboard() {
  const [users, setUsers] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const platformFetch = usePlatformFetch();

  useEffect(() => {
    let active = true;

    const loadData = async () => {
      const [usersResult, transactionsResult] = await Promise.allSettled([
        platformFetch("/api/platform/users"),
        platformFetch("/api/platform/transactions"),
      ]);

      if (!active) return;

      if (usersResult.status === "fulfilled") {
        setUsers(usersResult.value.users || []);
      } else {
        toast.error(usersResult.reason?.message || "Failed to load users");
      }

      if (transactionsResult.status === "fulfilled") {
        setTransactions(transactionsResult.value.transactions || []);
      } else {
        toast.error(
          transactionsResult.reason?.message || "Failed to load transactions"
        );
      }

      setLoading(false);
    };

    loadData();

    return () => {
      active = false;
    };
  }, [platformFetch]);

  const totalMembers = users.reduce(
    (sum, user) => sum + Number(user.memberCount || 0),
    0
  );
  const totalTeams = users.reduce(
    (sum, user) => sum + Number(user.teamCount || 0),
    0
  );
  const totalRevenue = transactions.reduce(
    (sum, transaction) => sum + Number(transaction.amount || 0),
    0
  );

  if (loading) return <LoadingState />;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={Users} label="Customers" value={users.length} />
        <MetricCard icon={Users} label="Teams" value={totalTeams} />
        <MetricCard icon={Users} label="Members" value={totalMembers} />
        <MetricCard
          icon={IndianRupee}
          label="Subscription Revenue"
          value={formatAmount(totalRevenue)}
        />
      </div>
      <PlatformUsersTable users={users.slice(0, 8)} compact />
      <PlatformTransactionsTable transactions={transactions.slice(0, 8)} compact />
    </div>
  );
}

function MetricCard({ icon: Icon, label, value }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm font-medium">{label}</CardTitle>
        <Icon className="h-4 w-4 text-primary" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}

export function PlatformUsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const platformFetch = usePlatformFetch();

  useEffect(() => {
    let active = true;

    platformFetch("/api/platform/users")
      .then((data) => {
        if (active) setUsers(data.users || []);
      })
      .catch((error) => toast.error(error.message || "Failed to load users"))
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [platformFetch]);

  if (loading) return <LoadingState />;

  return <PlatformUsersTable users={users} />;
}

function PlatformUsersTable({ users, compact = false }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          <CardTitle>Users</CardTitle>
        </div>
        <CardDescription>
          Customer admins, subscription dates, status, team counts, and member counts.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Status</TableHead>
                {!compact && <TableHead>Start Date</TableHead>}
                {!compact && <TableHead>Ends / Cancelled</TableHead>}
                {!compact && <TableHead>Next Payment</TableHead>}
                <TableHead className="text-right">Teams</TableHead>
                <TableHead className="text-right">Members</TableHead>
                {!compact && <TableHead>Latest Payment</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={compact ? 5 : 9} className="h-24 text-center">
                    No users found.
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => {
                  const isCancelled =
                    String(user.subscriptionStatus || "").toLowerCase() === "cancelled";
                  const endLabel = isCancelled ? "Cancelled" : "Ends";
                  const endDate = isCancelled
                    ? user.subscriptionCancelledAt || user.subscriptionEndAt
                    : user.subscriptionEndAt;

                  return (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="font-medium">{user.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {user.email || "No email"}
                        </div>
                      </TableCell>
                      <TableCell>{titleCase(user.subscription)}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={statusClassName(user.subscriptionStatus)}
                        >
                          {titleCase(user.subscriptionStatus)}
                        </Badge>
                      </TableCell>
                      {!compact && (
                        <TableCell>{formatDateOnly(user.subscriptionStartedAt)}</TableCell>
                      )}
                      {!compact && (
                        <TableCell>
                          <div className="font-medium">{formatDateOnly(endDate)}</div>
                          <div className="text-xs text-muted-foreground">{endLabel}</div>
                        </TableCell>
                      )}
                      {!compact && (
                        <TableCell>
                          {user.nextPaymentAt ? formatDateOnly(user.nextPaymentAt) : "-"}
                        </TableCell>
                      )}
                      <TableCell className="text-right">{user.teamCount}</TableCell>
                      <TableCell className="text-right">{user.memberCount}</TableCell>
                      {!compact && (
                        <TableCell>
                          {user.latestPaymentAmount
                            ? `${formatAmount(user.latestPaymentAmount)} on ${formatDate(
                                user.latestPaymentAt
                              )}`
                            : "No payment"}
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

export function PlatformTransactionsPage() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const platformFetch = usePlatformFetch();

  useEffect(() => {
    let active = true;

    platformFetch("/api/platform/transactions")
      .then((data) => {
        if (active) setTransactions(data.transactions || []);
      })
      .catch((error) =>
        toast.error(error.message || "Failed to load transactions")
      )
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [platformFetch]);

  if (loading) return <LoadingState />;

  return <PlatformTransactionsTable transactions={transactions} />;
}

function PlatformTransactionsTable({ transactions, compact = false }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <ReceiptIndianRupee className="h-5 w-5 text-primary" />
          <CardTitle>Subscription Transactions</CardTitle>
        </div>
        <CardDescription>
          Platform subscription payments across all customer accounts.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Cycle</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    No subscription transactions found.
                  </TableCell>
                </TableRow>
              ) : (
                transactions.map((transaction) => (
                  <TableRow key={`${transaction.userId}_${transaction.id}`}>
                    <TableCell>{formatDate(transaction.createdAt)}</TableCell>
                    <TableCell>
                      <div className="font-medium">{transaction.userName}</div>
                      {!compact && (
                        <div className="text-xs text-muted-foreground">
                          {transaction.userEmail || "No email"}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>{transaction.planName}</TableCell>
                    <TableCell>{titleCase(transaction.billingCycle)}</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={statusClassName(transaction.status)}
                      >
                        {titleCase(transaction.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {formatAmount(transaction.amount, transaction.currency)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

export function PlatformSubscriptionsPage() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const platformFetch = usePlatformFetch();

  useEffect(() => {
    let active = true;

    platformFetch("/api/platform/settings")
      .then((data) => {
        if (active) setSettings(data.settings);
      })
      .catch((error) => toast.error(error.message || "Failed to load settings"))
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [platformFetch]);

  const updateRazorpay = (key, value) => {
    setSettings((current) => ({
      ...current,
      razorpay: {
        ...current.razorpay,
        [key]: value,
      },
    }));
  };

  const updatePlanId = (cycle, value) => {
    setSettings((current) => ({
      ...current,
      razorpay: {
        ...current.razorpay,
        subscriptionPlanIds: {
          ...current.razorpay.subscriptionPlanIds,
          [cycle]: value,
        },
      },
    }));
  };

  const updateSupport = (key, value) => {
    setSettings((current) => ({
      ...current,
      support: {
        ...current.support,
        [key]: value,
      },
    }));
  };

  const saveSettings = async () => {
    setSaving(true);

    try {
      const data = await platformFetch("/api/platform/settings", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(settings),
      });
      setSettings(data.settings);
      toast.success("Platform settings saved");
    } catch (error) {
      toast.error(error.message || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading || !settings) return <LoadingState />;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-primary" />
          <CardTitle>Platform Subscription Settings</CardTitle>
        </div>
        <CardDescription>
          These settings belong to the SaaS platform owner and are used for admin
          plan upgrades.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex items-center justify-between rounded-lg border p-4">
          <div>
            <h3 className="text-sm font-semibold">Platform Razorpay</h3>
            <p className="text-xs text-muted-foreground">
              Used only for SaaS subscriptions, not customer member payments.
            </p>
          </div>
          <Switch
            checked={settings.razorpay.enabled}
            onCheckedChange={(checked) => updateRazorpay("enabled", checked)}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Razorpay Key ID</Label>
            <Input
              value={settings.razorpay.keyId}
              onChange={(event) => updateRazorpay("keyId", event.target.value)}
              placeholder="rzp_live_..."
            />
          </div>
          <div className="space-y-2">
            <Label>Razorpay Key Secret</Label>
            <Input
              type="password"
              value={settings.razorpay.keySecret}
              onChange={(event) =>
                updateRazorpay("keySecret", event.target.value)
              }
              placeholder={
                settings.razorpay.hasKeySecret
                  ? "Saved secret. Enter a new secret to replace it."
                  : "Razorpay key secret"
              }
            />
          </div>
          <div className="space-y-2">
            <Label>Monthly Pro Plan ID</Label>
            <Input
              value={settings.razorpay.subscriptionPlanIds.monthly}
              onChange={(event) => updatePlanId("monthly", event.target.value)}
              placeholder="plan_..."
            />
          </div>
          <div className="space-y-2">
            <Label>Yearly Pro Plan ID</Label>
            <Input
              value={settings.razorpay.subscriptionPlanIds.yearly}
              onChange={(event) => updatePlanId("yearly", event.target.value)}
              placeholder="plan_..."
            />
          </div>
          <div className="space-y-2">
            <Label>Currency</Label>
            <Input
              value={settings.razorpay.currency}
              onChange={(event) =>
                updateRazorpay("currency", event.target.value.toUpperCase())
              }
              placeholder="INR"
            />
          </div>
          <div className="space-y-2">
            <Label>Support Email</Label>
            <Input
              value={settings.support.email}
              onChange={(event) => updateSupport("email", event.target.value)}
              placeholder="contact@kingzdigitalsolutions.in"
            />
          </div>
        </div>

        <Button onClick={saveSettings} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save />}
          Save Settings
        </Button>
      </CardContent>
    </Card>
  );
}

export function PlatformSettingsPage() {
  const { user } = useAuth();
  const [isResetMode, setIsResetMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleChangePassword = async () => {
    if (!user) return;

    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error("All fields are required");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setLoading(true);

    try {
      const credential = EmailAuthProvider.credential(
        user.email,
        currentPassword
      );

      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPassword);

      toast.success("Password updated successfully");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      console.error("Platform password update error:", error);
      toast.error(
        error.code === "auth/wrong-password"
          ? "Current password is incorrect"
          : error.message || "Failed to update password"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResetPasswordEmail = async () => {
    if (!user?.email) return;

    setLoading(true);

    try {
      await sendPasswordResetEmail(auth, user.email);
      toast.success("Reset link sent to your email");
    } catch (error) {
      console.error("Platform password reset error:", error);
      toast.error("Failed to send reset email");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          <CardTitle>{isResetMode ? "Reset Password" : "Change Password"}</CardTitle>
        </div>
        <CardDescription>
          {isResetMode
            ? "We'll send a recovery link to your registered email address"
            : "Update your platform account password"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isResetMode ? (
          <>
            <div className="space-y-2">
              <Label>Current Password</Label>
              <div className="relative">
                <Input
                  type={showCurrent ? "text" : "password"}
                  value={currentPassword}
                  onChange={(event) => setCurrentPassword(event.target.value)}
                  placeholder="Enter current password"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent(!showCurrent)}
                  className="absolute right-3 top-2.5 text-muted-foreground"
                >
                  {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>New Password</Label>
              <div className="relative">
                <Input
                  type={showNew ? "text" : "password"}
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  placeholder="Minimum 6 characters"
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="absolute right-3 top-2.5 text-muted-foreground"
                >
                  {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Confirm New Password</Label>
              <div className="relative">
                <Input
                  type={showConfirm ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  placeholder="Repeat new password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-2.5 text-muted-foreground"
                >
                  {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <Button
              onClick={handleChangePassword}
              disabled={loading}
              className="w-full sm:w-[170px]"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Update Password"
              )}
            </Button>
          </>
        ) : (
          <>
            <div className="space-y-2">
              <Label>Email Address</Label>
              <Input value={user?.email || ""} disabled className="bg-muted" />
              <p className="text-xs text-muted-foreground">
                A password reset link will be sent to the email above.
              </p>
            </div>
            <Button
              onClick={handleResetPasswordEmail}
              disabled={loading}
              className="w-full sm:w-[180px]"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Send Reset Link"
              )}
            </Button>
          </>
        )}

        <div className="mt-4 border-t pt-2">
          <button
            type="button"
            onClick={() => setIsResetMode(!isResetMode)}
            className="text-sm text-primary hover:underline"
          >
            {isResetMode
              ? "Wait, I know my password (Change)"
              : "Forgot your password? (Reset via Email)"}
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
