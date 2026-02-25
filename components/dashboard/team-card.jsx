"use client";

import { useState } from "react";
import { Users, Trash2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { auth, app } from "@/lib/firebase";
import { httpsCallable, getFunctions } from "firebase/functions";

const TeamCardLayout = ({ teams }) => {
  const functions = getFunctions(app);
  const router = useRouter();

  const [selectedTeamId, setSelectedTeamId] = useState(null);
  const [otpDialogOpen, setOtpDialogOpen] = useState(false);
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);

  const closeAllDialogs = () => {
    setSelectedTeamId(null);
    setOtpDialogOpen(false);
    setOtp("");
    setOtpSent(false);
  };

  if (!teams || teams.length === 0) return null;

  const sortedTeams = [...teams].sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
  );

  const handleSendOtp = async () => {
    if (!auth.currentUser || !selectedTeamId) return;

    setLoading(true);
    try {
      const res = await fetch("/api/team/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teamId: selectedTeamId,
          userEmail: auth.currentUser.email,
          userId: auth.currentUser.uid,
        }),
      });

      const result = await res.json();

      if (result.success) {
        toast.success("OTP sent!");
        setOtpSent(true);
        setOtpDialogOpen(true); // Now we move to the OTP input stage
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      toast.error("Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTeam = async () => {
    if (!auth.currentUser || !selectedTeamId || !otp) return;

    setLoading(true);
    try {
      const verifyDelete = httpsCallable(functions, "verifyOtpAndDeleteTeam");

      const result = await verifyDelete({
        teamId: selectedTeamId,
        otp,
      });

      if (result.data.success) {
        toast.success("Team deleted successfully");
        setOtpDialogOpen(false);
        // setSelectedTeamId(null); // Removed per your request
        setOtp("");
        setOtpSent(false);
        router.refresh();
      }
    } catch (error) {
      console.error("Delete error:", error);
      toast.error(error?.message || "Delete failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-4 px-4 lg:px-6">
        {sortedTeams.map((team) => {
          const totalPresent = team.attendanceSummary?.present || 0;
          const totalAbsent = team.attendanceSummary?.absent || 0;

          return (
            <Card
              key={team.id}
              className="group bg-card shadow-xs hover:shadow-md transition-all duration-300 gap-4 pb-4"
            >
              <CardHeader className="relative">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Users className="w-5 h-5 text-primary" />
                  </div>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      // FIX: Only set the ID. The dialog open logic is handled by the ID presence.
                      setSelectedTeamId(team.id);
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>

                <CardTitle>{team.name}</CardTitle>
                <CardDescription>{team.description}</CardDescription>
              </CardHeader>

              <div className="px-6 pb-2 flex gap-4">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-success" />
                  <span className="text-sm text-muted-foreground">
                    {totalPresent} Present
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-destructive" />
                  <span className="text-sm text-muted-foreground">
                    {totalAbsent} Absent
                  </span>
                </div>
              </div>

              <CardFooter className="flex items-center justify-between border-t !px-6 !py-4 !pb-0">
                <span className="text-sm text-muted-foreground">
                  {team.totalMembers} members
                </span>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push(`/dashboard/teams/${team.id}`)}
                >
                  View Team
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </div>

      {/* Confirm Delete Dialog (Step 1) */}
      <AlertDialog
        open={!!selectedTeamId && !otpDialogOpen}
        onOpenChange={(open) => {
          if (!open) closeAllDialogs();
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this team?</AlertDialogTitle>
            <AlertDialogDescription>
              An OTP will be sent to your email to confirm deletion.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
            <Button
              onClick={handleSendOtp}
              disabled={loading}
              className="bg-destructive text-white"
            >
              {loading ? "Sending OTP..." : "Send OTP"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* OTP Dialog (Step 2) */}
      <AlertDialog
        open={otpDialogOpen}
        onOpenChange={(open) => {
          if (!open) closeAllDialogs();
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Enter OTP</AlertDialogTitle>
            <AlertDialogDescription>
              Enter the 6-digit OTP sent to your email.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <Input
            placeholder="Enter OTP"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            maxLength={6}
          />

          <AlertDialogFooter>
            <Button
              variant="outline"
              onClick={closeAllDialogs}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleDeleteTeam}
              disabled={loading || otp.length !== 6}
              className="bg-destructive text-white"
            >
              {loading ? "Deleting..." : "Confirm Delete"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default TeamCardLayout;