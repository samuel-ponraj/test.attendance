"use client";

import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { Lock } from "lucide-react";
import { db } from "@/lib/firebase";
import { useMembers } from "@/app/context/MembersContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { getPlan, PLAN_IDS } from "@/lib/subscriptionPlans";

export default function MemberDashboardGate({ children }) {
  const { members, loading: membersLoading } = useMembers();
  const [checking, setChecking] = useState(true);
  const [isEnabled, setIsEnabled] = useState(false);

  useEffect(() => {
    const checkPlan = async () => {
      if (membersLoading) return;

      const teamId = members?.[0]?.teamId;
      if (!teamId) {
        setIsEnabled(false);
        setChecking(false);
        return;
      }

      try {
        const teamSnap = await getDoc(doc(db, "teams", teamId));
        const adminUserId = teamSnap.data()?.admin?.userId;

        if (!adminUserId) {
          setIsEnabled(false);
          setChecking(false);
          return;
        }

        const adminSnap = await getDoc(doc(db, "users", adminUserId));
        const plan = getPlan(adminSnap.data()?.subscription || PLAN_IDS.BASIC);
        setIsEnabled(plan.limits.hasMemberDashboard);
      } catch (error) {
        console.error("Failed to check member dashboard subscription:", error);
        setIsEnabled(false);
      } finally {
        setChecking(false);
      }
    };

    checkPlan();
  }, [members, membersLoading]);

  if (checking || membersLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner className="size-8" />
      </div>
    );
  }

  if (!isEnabled) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center px-4">
        <Card className="max-w-md text-center">
          <CardHeader>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <Lock className="h-5 w-5 text-muted-foreground" />
            </div>
            <CardTitle>Member dashboard is a Pro feature</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Ask your team admin to upgrade to Pro to unlock the dedicated
            member dashboard.
          </CardContent>
        </Card>
      </div>
    );
  }

  return children;
}
