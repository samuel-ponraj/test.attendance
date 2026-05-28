import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { requirePlatformAdmin } from "@/lib/platform-admin";

export const runtime = "nodejs";

const timestampToMillis = (value) => {
  if (!value) return 0;
  if (typeof value.toMillis === "function") return value.toMillis();
  if (value.seconds) return value.seconds * 1000;
  if (value instanceof Date) return value.getTime();
  return 0;
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

    const transactionsSnap = await adminDb
      .collectionGroup("subscriptionTransactions")
      .limit(200)
      .get();

    const userIds = Array.from(
      new Set(
        transactionsSnap.docs
          .map((docSnap) => docSnap.ref.parent.parent?.id)
          .filter(Boolean)
      )
    );
    const usersById = {};

    await Promise.all(
      userIds.map(async (uid) => {
        const snap = await adminDb.collection("users").doc(uid).get();
        usersById[uid] = snap.exists ? snap.data() || {} : {};
      })
    );

    const transactions = transactionsSnap.docs
      .map((docSnap) => {
        const uid = docSnap.ref.parent.parent?.id || "";
        const user = usersById[uid] || {};
        const data = docSnap.data() || {};

        return {
          id: docSnap.id,
          userId: uid,
          userName:
            [user.firstName, user.lastName].filter(Boolean).join(" ") ||
            user.displayName ||
            user.name ||
            "Unnamed user",
          userEmail: user.email || "",
          planName: data.planName || "Pro",
          billingCycle: data.billingCycle || "",
          amount: data.amount || 0,
          currency: data.currency || "INR",
          status: data.status || "success",
          createdAt: timestampToMillis(data.createdAt),
        };
      })
      .sort((a, b) => b.createdAt - a.createdAt);

    return NextResponse.json({ success: true, transactions });
  } catch (error) {
    console.error("Platform transactions load error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to load platform transactions" },
      { status: 500 }
    );
  }
}
