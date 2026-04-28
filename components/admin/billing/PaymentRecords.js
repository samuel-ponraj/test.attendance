"use client";

import React, { useState, useEffect } from "react";
import { 
  collection, 
  query, 
  getDocs, 
  where, 
  doc, 
  onSnapshot 
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { db, auth } from "@/lib/firebase";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search } from "lucide-react";
import RecordPaymentModal from "./RecordPaymentModal";

const PaymentRecords = () => {
  const [adminUserId, setAdminUserId] = useState(null);
  const [teams, setTeams] = useState([]);
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) setAdminUserId(user.uid);
      else {
        setLoading(false);
        setAdminUserId(null);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const fetchTeams = async () => {
      if (!adminUserId) return;
      try {
        const teamsRef = collection(db, "teams");
        const q = query(teamsRef, where("admin.userId", "==", adminUserId));
        const snap = await getDocs(q);
        const teamList = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setTeams(teamList);
        if (teamList.length > 0) setSelectedTeamId(teamList[0].id);
      } catch (err) {
        console.error("Fetch teams error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchTeams();
  }, [adminUserId]);

  const fetchMembers = async () => {
    if (!selectedTeamId || selectedTeamId === "none") return;
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, "teams", selectedTeamId, "members"));
      setMembers(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (err) {
      console.error("Fetch members error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchMembers(); }, [selectedTeamId]);

  // Handle local state update after payment
  const handlePaymentSuccess = (memberId, updatedBilling) => {
    setMembers(prev => prev.map(m => 
      m.id === memberId ? { ...m, billing: updatedBilling } : m
    ));
  };

  const filteredMembers = members.filter(m => 
    `${m.firstName} ${m.lastName}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const currentTeam = teams.find(t => t.id === selectedTeamId);

  const getStatusDetail = (member) => {
    const cycle = currentTeam?.billingConfig?.billingCycle;
    switch(cycle) {
      case 'term':
        return `Term ${currentTeam?.billingConfig?.currentTerm || 1}`;
      case 'monthly':
        return new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
      default:
        return 'Standard Plan';
    }
  };

  const getColumns = () => {
    const cycle = currentTeam?.billingConfig?.billingCycle;
    const baseAmount = currentTeam?.billingConfig?.baseAmount || 0;

    if (cycle === "term") {
      const count = currentTeam?.billingConfig?.termDetails?.divisionsPerYear || 3;
      return Array.from({ length: count }, (_, i) => ({
        label: `Term ${i + 1}`,
        amount: i === count - 1
            ? baseAmount - Math.floor(baseAmount / count) * (count - 1)
            : Math.floor(baseAmount / count),
      }));
    }
    if (cycle === "monthly") {
      return Array.from({ length: 12 }, (_, i) => ({
        label: new Date(0, i).toLocaleString("en-IN", { month: "short" }),
        amount: Math.floor(baseAmount / 12),
      }));
    }
    return [{ label: "Standard", amount: baseAmount }];
  };

  const columns = getColumns();

  return (
    <div className="space-y-6 px-4 md:px-6">

      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 w-[300px]">
            <Select value={selectedTeamId} onValueChange={setSelectedTeamId}>
              <SelectTrigger className="bg-background shadow-sm">
                <SelectValue placeholder="Select Team" />
              </SelectTrigger>
              <SelectContent>
                {teams.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search member..."
              className="pl-9 bg-background"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead rowSpan={2} className="border-r text-center">Member Name</TableHead>
                {columns.map((col, idx) => (
                  <TableHead key={idx} colSpan={2} className="text-center border-r">
                    <div className="font-bold">{col.label} <span className="ml-1 text-muted-foreground">(₹{col.amount?.toLocaleString()})</span></div>
                  </TableHead>
                ))}
                <TableHead rowSpan={2} className="text-center border-r">Total Paid</TableHead>
                <TableHead rowSpan={2} className="text-center">Action</TableHead>
              </TableRow>
              <TableRow>
                {columns.map((_, idx) => (
                  <React.Fragment key={idx}>
                    <TableHead className="text-center border-r">Paid</TableHead>
                    <TableHead className="text-center border-r">Balance</TableHead>
                  </React.Fragment>
                ))}
              </TableRow>
            </TableHeader>
  
            <TableBody>
              {filteredMembers.map((member) => {
                const periods = member.billing?.periods || [];
                return (
                  <TableRow key={member.id}>
                    <TableCell className="font-medium border-r text-center">
                      {member.firstName} {member.lastName}
                    </TableCell>

                    {columns.map((col, idx) => {
                      const p = periods.find(per => per.label === col.label);
                      const paid = p?.paid || 0;
                      const balance = p ? p.balance : col.amount;

                      return (
                        <React.Fragment key={idx}>
                          <TableCell className="text-center border-r">
                            {paid > 0 ? `₹${paid.toLocaleString()}` : "—"}
                          </TableCell>
                          <TableCell className={`text-center border-r ${balance > 0 ? "text-destructive font-bold" : "text-emerald-600"}`}>
                            {balance > 0 ? `₹${balance.toLocaleString()}` : "Settled"}
                          </TableCell>
                        </React.Fragment>
                      );
                    })}

                    <TableCell className="text-right font-bold border-r">
                      ₹{(member.billing?.totalPaid || 0).toLocaleString()}
                    </TableCell>

                    <TableCell className="text-center">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedMember(member);
                          setIsModalOpen(true);
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
      </div>

      <RecordPaymentModal 
        isOpen={isModalOpen}
        onOpenChange={setIsModalOpen}
        onSuccess={handlePaymentSuccess}
        member={selectedMember}
        team={currentTeam}
        getStatusDetail={getStatusDetail}
      />
    </div>
  );
};

export default PaymentRecords;