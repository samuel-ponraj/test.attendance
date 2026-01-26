"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { cn } from '@/lib/utils';
import { CalendarIcon, Clock } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { format, startOfDay, endOfDay, parse } from "date-fns";
import HistoryTable from "./HistoryTable";
import { useTeams } from '@/app/context/TeamsContext';
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";

const HistoryLayout = () => {
  const { teams } = useTeams();
  const [members, setMembers] = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  
  const [selectedTeam, setSelectedTeam] = useState("all");
  const [selectedMember, setSelectedMember] = useState("all");
  const [startDate, setStartDate] = useState();
  const [endDate, setEndDate] = useState();

  useEffect(() => {
    const fetchTeamData = async () => {
      if (selectedTeam === "all") {
        setMembers([]);
        setAttendanceRecords([]);
        return;
      }

      try {
        const membersSnapshot = await getDocs(collection(db, `teams/${selectedTeam}/members`));
        const membersList = membersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setMembers(membersList);

        const attendanceSnapshot = await getDocs(collection(db, `teams/${selectedTeam}/attendance`));
        const attendanceData = attendanceSnapshot.docs.map(doc => ({
          dateKey: doc.id,
          memberMap: doc.data().members || {}
        }));
        setAttendanceRecords(attendanceData);
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };

    fetchTeamData();
  }, [selectedTeam]);

  const filteredAttendance = useMemo(() => {
    let result = [];
    // Create a Set of current member IDs for fast lookup
    const currentMemberIds = new Set(members.map(m => m.id));

    attendanceRecords.forEach(day => {
      const recordDate = parse(day.dateKey, "dd-MM-yyyy", new Date());
      const isWithinDateRange = (!startDate || recordDate >= startOfDay(startDate)) &&
                                (!endDate || recordDate <= endOfDay(endDate));

      if (isWithinDateRange) {
        Object.values(day.memberMap).forEach(record => {
          if (selectedMember === "all" || record.id === selectedMember) {
            result.push({
              ...record,
              dateDisplay: day.dateKey,
              markedAtDate: record.markedAt?.toDate ? record.markedAt.toDate() : new Date(),
              // Check if member still exists in the members subcollection
              membershipStatus: currentMemberIds.has(record.id) ? "Active" : "Removed"
            });
          }
        });
      }
    });

    return result.sort((a, b) => b.markedAtDate - a.markedAtDate);
  }, [attendanceRecords, selectedMember, startDate, endDate, members]);

  const clearFilters = () => {
    setSelectedTeam("all");
    setSelectedMember("all");
    setStartDate(undefined);
    setEndDate(undefined);
  };

  return (
    <div className="space-y-6 px-4 lg:px-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Filters
          </CardTitle>
        </CardHeader>

        <CardContent>
          <div className="grid gap-4 grid-cols-2 sm:grid-cols-2 md:flex md:flex-wrap">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-muted-foreground">Team</label>
              <Select
                value={selectedTeam}
                onValueChange={(v) => {
                  setSelectedTeam(v);
                  setSelectedMember("all");
                }}
              >
                <SelectTrigger className="w-full md:w-[180px]">
                  <SelectValue placeholder="Select team" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Teams</SelectItem>
                  {teams?.map(team => (
                    <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-muted-foreground">Member</label>
              <Select
                value={selectedMember}
                onValueChange={setSelectedMember}
                disabled={selectedTeam === "all"}
              >
                <SelectTrigger className="w-full md:w-[180px]">
                  <SelectValue placeholder="Select member" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Members</SelectItem>
                  {members.map(m => (
                    <SelectItem key={m.id} value={m.id}>{m.name || m.email || m.id}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-muted-foreground">From Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full sm:w-[180px] justify-start text-left font-normal", !startDate && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={startDate} onSelect={setStartDate} />
                </PopoverContent>
              </Popover>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-muted-foreground">To Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full sm:w-[180px] justify-start text-left font-normal", !endDate && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={endDate} onSelect={setEndDate} />
                </PopoverContent>
              </Popover>
            </div>

            <div className="col-span-2 md:col-auto flex justify-center md:items-end">
              <Button variant="ghost" onClick={clearFilters}>Clear Filters</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <HistoryTable
        attendance={filteredAttendance}
        team={teams?.find(t => t.id === selectedTeam) || { name: "All Teams" }}
      />
    </div>
  );
};

export default HistoryLayout;
