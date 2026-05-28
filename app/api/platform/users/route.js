import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { requirePlatformAdmin } from "@/lib/platform-admin";
import {
  getPlatformRazorpayConfig,
  getPlatformRazorpayInstance,
} from "@/lib/server-platform";

export const runtime = "nodejs";

const timestampToMillis = (value) => {
  if (!value) return 0;
  if (typeof value.toMillis === "function") return value.toMillis();
  if (value.seconds) return value.seconds * 1000;
  if (value instanceof Date) return value.getTime();
  return 0;
};

const secondsToMillis = (value) => {
  const seconds = Number(value || 0);
  return seconds > 0 ? seconds * 1000 : 0;
};

const getDerivedSubscriptionEndAt = (data = {}) => {
  const explicitEndAt = timestampToMillis(
    data.subscriptionEndAt ||
      data.subscriptionEndsAt ||
      data.subscriptionCurrentEndAt ||
      data.subscriptionExpiresAt
  );

  if (explicitEndAt) return explicitEndAt;

  const cancelledAt = timestampToMillis(data.subscriptionCancelledAt);
  if (cancelledAt) return cancelledAt;

  const startedAt = timestampToMillis(
    data.subscriptionStartedAt || data.subscriptionUpdatedAt
  );

  if (!startedAt || data.subscription !== "pro") return 0;

  const endDate = new Date(startedAt);
  const billingCycle = String(data.subscriptionBillingCycle || "monthly").toLowerCase();

  if (billingCycle === "yearly" || billingCycle === "annual") {
    endDate.setFullYear(endDate.getFullYear() + 1);
  } else {
    endDate.setMonth(endDate.getMonth() + 1);
  }

  return endDate.getTime();
};

export async function GET(req) {
  try {
    const platformUser = await requirePlatformAdmin(req);

    if (platformUser.error) {
      return NextResponse.json(
        { error: platformUser.error },
        { status: platformUser.status }
      );
    }

    const [usersSnap, teamsSnap] = await Promise.all([
      adminDb.collection("users").limit(200).get(),
      adminDb.collection("teams").limit(1000).get(),
    ]);
    const razorpayConfig = await getPlatformRazorpayConfig();
    const razorpay =
      razorpayConfig.keyId && razorpayConfig.keySecret
        ? getPlatformRazorpayInstance(razorpayConfig)
        : null;

    const teamStats = teamsSnap.docs.reduce((stats, teamDoc) => {
      const data = teamDoc.data() || {};
      const adminUserId = data.admin?.userId;

      if (!adminUserId) return stats;

      if (!stats[adminUserId]) {
        stats[adminUserId] = {
          teamCount: 0,
          memberCount: 0,
        };
      }

      stats[adminUserId].teamCount += 1;
      stats[adminUserId].memberCount += Number(data.totalMembers || 0);

      return stats;
    }, {});

    const users = await Promise.all(
      usersSnap.docs.map(async (userDoc) => {
        const data = userDoc.data() || {};
        const transactionsSnap = await userDoc.ref
          .collection("subscriptionTransactions")
          .get();
        const latestTransaction =
          transactionsSnap.docs
            .map((transactionDoc) => transactionDoc.data() || {})
            .sort(
              (a, b) => timestampToMillis(b.createdAt) - timestampToMillis(a.createdAt)
            )[0] || null;
        const displayName =
          [data.firstName, data.lastName].filter(Boolean).join(" ") ||
          data.displayName ||
          data.name ||
          "Unnamed user";
        let nextPaymentAt = 0;

        if (razorpay && data.subscription === "pro" && data.razorpaySubscriptionId) {
          try {
            const razorpaySubscription = await razorpay.subscriptions.fetch(
              data.razorpaySubscriptionId
            );
            nextPaymentAt =
              secondsToMillis(razorpaySubscription.charge_at) ||
              secondsToMillis(razorpaySubscription.current_end);
          } catch (error) {
            console.error(
              `Failed to fetch Razorpay subscription ${data.razorpaySubscriptionId}:`,
              error
            );
          }
        }

        return {
          id: userDoc.id,
          name: displayName,
          email: data.email || "",
          subscription: data.subscription || "basic",
          subscriptionStatus: data.subscriptionStatus || "active",
          subscriptionBillingCycle: data.subscriptionBillingCycle || "",
          createdAt: timestampToMillis(data.createdAt || data.lastLogin),
          subscriptionStartedAt: timestampToMillis(data.subscriptionStartedAt),
          subscriptionEndAt: getDerivedSubscriptionEndAt(data),
          subscriptionCancelledAt: timestampToMillis(data.subscriptionCancelledAt),
          nextPaymentAt,
          subscriptionUpdatedAt: timestampToMillis(data.subscriptionUpdatedAt),
          latestPaymentAmount: latestTransaction?.amount || 0,
          latestPaymentAt: timestampToMillis(latestTransaction?.createdAt),
          teamCount: teamStats[userDoc.id]?.teamCount || data.teamCount || 0,
          memberCount: teamStats[userDoc.id]?.memberCount || 0,
        };
      })
    );

    return NextResponse.json({ success: true, users });
  } catch (error) {
    console.error("Platform users load error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to load platform users" },
      { status: 500 }
    );
  }
}
