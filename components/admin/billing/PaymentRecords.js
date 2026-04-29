"use client";

import React, { useState, useEffect } from "react";
import { 
  collection, 
  query, 
  where, 
  onSnapshot,
  getDocs 
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { db, auth } from "@/lib/firebase";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search } from "lucide-react";
import RecordPaymentModal from "./RecordPaymentModal";
import { PiFilePdf } from "react-icons/pi";
import { useRouter } from "next/navigation";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const PaymentRecords = () => {
  const [adminUserId, setAdminUserId] = useState(null);
  const [teams, setTeams] = useState([]);
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);

  const [isAlertOpen, setIsAlertOpen] = useState(false);

  const router = useRouter();

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
      const q = query(collection(db, "teams"), where("admin.userId", "==", adminUserId));
      const snap = await getDocs(q);
      const teamList = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setTeams(teamList);
      if (teamList.length > 0) setSelectedTeamId(teamList[0].id);
      setLoading(false);
    };
    fetchTeams();
  }, [adminUserId]);

  // Real-time listener for members
  useEffect(() => {
    if (!selectedTeamId || selectedTeamId === "none") return;

    const q = collection(db, "teams", selectedTeamId, "members");
    const unsubscribe = onSnapshot(q, (snap) => {
      setMembers(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => unsubscribe();
  }, [selectedTeamId]);

  const currentTeam = teams.find(t => t.id === selectedTeamId);

  const getColumns = () => {
    const config = currentTeam?.billingConfig;
    const cycle = config?.billingCycle;
    const baseAmount = config?.baseAmount || 0;

    if (cycle === "term") {
      const count = config?.termDetails?.divisionsPerYear || 3;
      return Array.from({ length: count }, (_, i) => ({
        key: `term_${i + 1}`,
        label: `Term ${i + 1}`,
        amount: i === count - 1
          ? baseAmount - Math.floor(baseAmount / count) * (count - 1)
          : Math.floor(baseAmount / count),
      }));
    }

    const keyMap = { monthly: "monthly", daily: "daily", annual: "annual" };
    const labelMap = { 
      monthly: new Date().toLocaleString("en-IN", { month: "long", year: "numeric" }),
      daily: "Today",
      annual: "Annual"
    };

    return [{ 
      key: keyMap[cycle] || "standard", 
      label: labelMap[cycle] || "Standard", 
      amount: baseAmount 
    }];
  };

  const columns = getColumns();

  const getNextDueDate = (member, team) => {
    const config = team?.billingConfig;
    if (!config?.billingStartDate) return "—";
    const lastPaymentDate = member.billing?.lastPaymentDate 
      ? new Date(member.billing.lastPaymentDate.seconds * 1000) 
      : null;
    if (!lastPaymentDate) return new Date(config.billingStartDate.seconds * 1000).toLocaleDateString('en-IN');

    const nextDate = new Date(lastPaymentDate);
    const cycle = config.billingCycle;
    if (cycle === 'daily') nextDate.setDate(nextDate.getDate() + 1);
    else if (cycle === 'monthly') nextDate.setMonth(nextDate.getMonth() + 1);
    else if (cycle === 'annual') nextDate.setFullYear(nextDate.getFullYear() + 1);
    else if (cycle === 'term') {
        const months = Math.floor(12 / (config.termDetails?.divisionsPerYear || 3));
        nextDate.setMonth(nextDate.getMonth() + months);
    }
    return nextDate.toLocaleDateString('en-IN');
  };

  const filteredMembers = members.filter(m => 
    `${m.firstName} ${m.lastName}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 px-4 md:px-6">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <Select value={selectedTeamId} onValueChange={setSelectedTeamId}>
          <SelectTrigger className="w-full md:w-[300px]"><SelectValue placeholder="Select Team" /></SelectTrigger>
          <SelectContent>
            {teams.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search member..." className="pl-9" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
      </div>

      <div className="rounded-xl border bg-card shadow-sm overflow-x-auto">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead rowSpan={2} className="border-r text-center">Member</TableHead>
              <TableHead rowSpan={2} className="text-center border-r">Bill Start</TableHead>
              {columns.map((col, idx) => (
                <TableHead key={idx} colSpan={3} className="text-center border-r">
                  <div className="font-bold">{col.label} (₹{col.amount})</div>
                </TableHead>
              ))}
              <TableHead rowSpan={2} className="text-center border-r">Last Paid</TableHead>
              <TableHead rowSpan={2} className="text-center border-r">Next Due</TableHead>
              <TableHead rowSpan={2} className="text-center border-r">Total Paid</TableHead>
              <TableHead rowSpan={2} className="text-center">Action</TableHead>
            </TableRow>
            <TableRow>
              {columns.map((_, idx) => (
                <React.Fragment key={idx}>
                  <TableHead className="text-center border-r">Paid</TableHead>
                  <TableHead className="text-center border-r">Balance</TableHead>
                  <TableHead className="text-center border-r">Bill</TableHead>
                </React.Fragment>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredMembers.map((member) => {
              const periods = member.billing?.periods || [];
              return (
                <TableRow key={member.id}>
                  <TableCell className="font-medium border-r text-center">{member.firstName} {member.lastName}</TableCell>
                  <TableCell className="text-center border-r">
                    {currentTeam?.billingConfig?.billingStartDate ? new Date(currentTeam.billingConfig.billingStartDate.seconds * 1000).toLocaleDateString("en-IN") : "—"}
                  </TableCell>
                  {columns.map((col, idx) => {
                    const p = periods?.find(per => per.key === col.key);
                    const paid = p?.paid || 0;
                    const balance = p ? p.balance : col.amount;
                    return (
                      <React.Fragment key={idx}>
                        <TableCell className="text-center border-r">{paid > 0 ? `₹${paid}` : "—"}</TableCell>
                        <TableCell className={`text-center border-r ${balance > 0 ? "text-red-600 font-bold" : "text-emerald-600"}`}>
                          {balance > 0 ? `₹${balance}` : "Settled"}
                        </TableCell>
                        <TableCell className="text-center border-r">
                          {balance === 0 ? (
                            <PiFilePdf 
                                onClick={() => router.push(`/admin/billing/create-invoice?teamId=${selectedTeamId}&memberId=${member.id}&period=${col.key}`)} 
                                className="cursor-pointer text-2xl text-orange-500 mx-auto" 
                            />
                          ) : "—"}
                        </TableCell>
                      </React.Fragment>
                    );
                  })}
                  <TableCell className="text-center border-r">
                    {member.billing?.lastPaymentDate ? new Date(member.billing.lastPaymentDate.seconds * 1000).toLocaleDateString('en-IN') : "—"}
                  </TableCell>
                  <TableCell className="text-center border-r">{getNextDueDate(member, currentTeam)}</TableCell>
                  <TableCell className="text-right font-bold border-r">₹{member.billing?.totalPaid || 0}</TableCell>
                  <TableCell className="text-center">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => {
                        // Calculate total pending balance across all columns
                        const totalPending = columns.reduce((acc, col) => {
                          const p = member.billing?.periods?.find(per => per.key === col.key);
                          // If period exists, use its balance; otherwise, use the full column amount
                          const balance = p ? p.balance : col.amount;
                          return acc + balance;
                        }, 0);

                        if (totalPending <= 0) {
                          setIsAlertOpen(true); // Show "All Settled" alert
                        } else {
                          setSelectedMember(member);
                          setIsModalOpen(true); // Open payment modal
                        }
                      }}
                    >
                      Record
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <RecordPaymentModal 
        isOpen={isModalOpen} 
        onOpenChange={setIsModalOpen} 
        member={selectedMember} 
        team={currentTeam} 
      />

      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Payment Complete</AlertDialogTitle>
            <AlertDialogDescription>
              All payments have been settled for this member. There are no pending amounts to record at this time.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setIsAlertOpen(false)}>
              Okay
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
    </div>
  );
};

export default PaymentRecords;