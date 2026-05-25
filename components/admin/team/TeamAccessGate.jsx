"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, Lock } from "lucide-react";

import { useTeams } from "@/app/context/TeamsContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import UpgradeDialog from "@/components/admin/subscription/UpgradeDialog";
import { useState } from "react";

export default function TeamAccessGate({ teamId, children }) {
  const router = useRouter();
  const { lockedTeams, loading } = useTeams();
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const lockedTeam = lockedTeams.find((team) => team.id === teamId);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner className="size-8" />
      </div>
    );
  }

  if (!lockedTeam) return children;

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <Card className="max-w-xl">
        <CardContent className="space-y-5 p-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/10 text-amber-600">
            <Lock className="h-6 w-6" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-semibold">Team locked by your plan</h2>
            <p className="text-sm text-muted-foreground">
              Your current plan unlocks 2 teams. 2 recently created teams are
              locked. Upgrade to view and manage locked teams without deleting
              their data.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Button variant="outline" onClick={() => router.push("/admin/teams")}>
              <ArrowLeft className="h-4 w-4" />
              Back to teams
            </Button>
            <Button onClick={() => setUpgradeOpen(true)}>Upgrade to Pro</Button>
          </div>
          <UpgradeDialog
            open={upgradeOpen}
            onOpenChange={setUpgradeOpen}
            title="Upgrade to unlock teams"
            description="Your current plan unlocks 2 teams. 2 recently created teams are locked. Upgrade to view and manage locked teams without deleting their data."
          />
        </CardContent>
      </Card>
    </div>
  );
}
