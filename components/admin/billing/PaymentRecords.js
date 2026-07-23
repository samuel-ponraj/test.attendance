"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  collection,
  doc,
  getDoc,
  query,
  where,
  onSnapshot,
  getDocs,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { db, auth } from "@/lib/firebase";
import { ArrowLeft, ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import RecordPaymentModal from "./RecordPaymentModal";
import Fixed from "./billingType/Fixed";
import AttendanceBased from "./billingType/AttendanceBased";
import { Label } from "@/components/ui/label";
import Salary from "./billingType/salary/Salary";

const PaymentRecords = ({ teamId }) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialMemberId = searchParams.get("memberId") || "";

  const [adminUserId, setAdminUserId] = useState(null);
  const [teams, setTeams] = useState([]);
  const [selectedTeamId, setSelectedTeamId] = useState(teamId || "");
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [selectedAttendanceSummary, setSelectedAttendanceSummary] =
    useState(null);
  const [selectedBillingPeriods, setSelectedBillingPeriods] = useState([]);

  useEffect(() => {
    if (teamId) {
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) setAdminUserId(user.uid);
      else setAdminUserId(null);
    });

    return () => unsubscribe();
  }, [teamId]);

  useEffect(() => {
    const fetchTeams = async () => {
      if (teamId) {
        const teamSnap = await getDoc(doc(db, "teams", teamId));

        if (teamSnap.exists()) {
          setTeams([
            {
              id: teamSnap.id,
              ...teamSnap.data(),
            },
          ]);
          setSelectedTeamId(teamSnap.id);
        } else {
          setTeams([]);
          setSelectedTeamId("");
        }

        setLoading(false);
        return;
      }

      if (!adminUserId) return;

      const q = query(
        collection(db, "teams"),
        where("admin.userId", "==", adminUserId),
      );

      const snap = await getDocs(q);
      const teamList = snap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setTeams(teamList);

      if (teamList.length > 0) {
        setSelectedTeamId(teamList[0].id);
      }

      setLoading(false);
    };

    fetchTeams();
  }, [adminUserId, teamId]);

  useEffect(() => {
    if (!selectedTeamId || selectedTeamId === "none") return;

    const membersRef = collection(db, "teams", selectedTeamId, "members");

    const unsubscribe = onSnapshot(membersRef, (snap) => {
      const memberList = snap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setMembers(memberList);
    });

    return () => unsubscribe();
  }, [selectedTeamId]);

  const currentTeam = teams.find((team) => team.id === selectedTeamId);

  const filteredMembers = members.filter((member) =>
    `${member.firstName || ""} ${member.lastName || ""}`
      .toLowerCase()
  );

  const billingType = currentTeam?.billingConfig?.billingType || "fixed";

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        {teamId ? (
          <button
            onClick={() => router.push(`/admin/teams/${teamId}`)}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
        ) : (
          <div className="space-y-2 w-full md:w-[300px]">
            <Label>Select Team</Label>

            <Select value={selectedTeamId} onValueChange={setSelectedTeamId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select Team" />
              </SelectTrigger>

              <SelectContent>
                {teams.map((team) => (
                  <SelectItem key={team.id} value={team.id}>
                    {team.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <Button asChild variant="outline" className="gap-2 md:ml-auto">
          <Link
            href={
              selectedTeamId
                ? `/admin/transactions?teamId=${encodeURIComponent(selectedTeamId)}`
                : "/admin/transactions"
            }
          >
            View Transactions
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>

      {billingType === "attendanceBased" ? (
          <AttendanceBased
            teamId={selectedTeamId}
            team={currentTeam}
            members={filteredMembers}
            initialMemberId={initialMemberId}
            showBackButton={false}
            onRecordPayment={(member, attendanceSummary, billingPeriods) => {
              setSelectedMember(member);
              setSelectedAttendanceSummary(attendanceSummary);
              setSelectedBillingPeriods(billingPeriods);
              setIsModalOpen(true);
            }}
          />
        ) : billingType === "salary" ? (
          <Salary
            teamId={selectedTeamId}
            team={currentTeam}
            members={filteredMembers}
            initialMemberId={initialMemberId}
          />
        ) : (
          <Fixed
            teamId={selectedTeamId}
            team={currentTeam}
            members={filteredMembers}
            initialMemberId={initialMemberId}
            showBackButton={false}
            onRecordPayment={(member) => {
              setSelectedMember(member);
              setSelectedAttendanceSummary(null);
              setSelectedBillingPeriods([]);
              setIsModalOpen(true);
            }}
          />
        )}

      <RecordPaymentModal
        isOpen={isModalOpen}
        onOpenChange={setIsModalOpen}
        member={selectedMember}
        team={currentTeam}
        attendanceSummary={selectedAttendanceSummary}
        billingPeriods={selectedBillingPeriods}
      />
    </div>
  );
};

export default PaymentRecords;
