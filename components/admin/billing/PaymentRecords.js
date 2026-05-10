"use client";

import React, { useEffect, useState } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
  getDocs,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { db, auth } from "@/lib/firebase";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { Search } from "lucide-react";
import RecordPaymentModal from "./RecordPaymentModal";
import Fixed from "./billingType/Fixed";
import AttendanceBased from "./billingType/AttendanceBased";
import { Label } from "@/components/ui/label";
import Salary from "./billingType/salary/Salary";

const PaymentRecords = () => {
  const [adminUserId, setAdminUserId] = useState(null);
  const [teams, setTeams] = useState([]);
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [selectedAttendanceSummary, setSelectedAttendanceSummary] =
    useState(null);
  const [selectedBillingPeriods, setSelectedBillingPeriods] = useState([]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) setAdminUserId(user.uid);
      else setAdminUserId(null);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const fetchTeams = async () => {
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
  }, [adminUserId]);

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
    return <div className="px-4 md:px-6">Loading...</div>;
  }

  return (
    <div className="space-y-6 px-4 md:px-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
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
      </div>

      {billingType === "attendanceBased" ? (
          <AttendanceBased
            teamId={selectedTeamId}
            team={currentTeam}
            members={filteredMembers}
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
          />
        ) : (
          <Fixed
            teamId={selectedTeamId}
            team={currentTeam}
            members={filteredMembers}
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
