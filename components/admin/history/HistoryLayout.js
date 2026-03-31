"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { cn } from '@/lib/utils';
import { CalendarIcon, Clock, Loader2 } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { format, eachDayOfInterval } from "date-fns";
import HistoryTable from "./HistoryTable";
import { useTeams } from '@/app/context/TeamsContext';
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";

const HistoryLayout = () => {
  const { teams } = useTeams();
  const [members, setMembers] = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  
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

      setLoading(true);
      try {
        // 1. Fetch Members
        const membersSnap = await getDocs(collection(db, `teams/${selectedTeam}/members`));
        const membersList = membersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setMembers(membersList);

        // 2. Determine which dates to fetch
        // If no date is selected, we might want to fetch last 7 days or just today
        const start = startDate || new Date();
        const end = endDate || new Date();
        
        const dateRange = eachDayOfInterval({ start, end });
        
        // 3. Fetch punches for each date in the range (Direct Path)
        const fetchPromises = dateRange.map(async (date) => {
          const dateKey = format(date, "yyyy-MM-dd");
          const punchesSnap = await getDocs(collection(db, `teams/${selectedTeam}/attendance/${dateKey}/punches`));
          
          if (punchesSnap.empty) return null;

          const memberMap = {};
          punchesSnap.forEach(doc => {
            memberMap[doc.id] = { id: doc.id, ...doc.data() };
          });

          return { dateKey, memberMap };
        });

        const results = await Promise.all(fetchPromises);
        setAttendanceRecords(results.filter(r => r !== null));

      } catch (error) {
        console.error("Error fetching attendance:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchTeamData();
  }, [selectedTeam, startDate, endDate]); 

  const filteredAttendance = useMemo(() => {
    let result = [];
    const currentMemberIds = new Set(members.map(m => m.id));

    attendanceRecords.forEach(day => {
      Object.values(day.memberMap).forEach(record => {
        if (selectedMember === "all" || record.id === selectedMember) {
          const memberMeta = members.find(m => m.id === record.id);
          
          result.push({
            ...record,
            dateDisplay: day.dateKey,

            // ✅ Use snapshot name stored in punches
            firstName: record.firstName || "-",
            lastName: record.lastName || "-",

            markedAtDate: record.markedAt?.toDate
              ? record.markedAt.toDate()
              : new Date(),

            // Membership status can still depend on members collection
            membershipStatus: currentMemberIds.has(record.id)
              ? "Active"
              : "Removed"
          });
        }
      });
    });

    return result.sort((a, b) => b.markedAtDate - a.markedAtDate);
  }, [attendanceRecords, selectedMember, members]);

  const clearFilters = () => {
    setSelectedTeam("all");
    setSelectedMember("all");
    setStartDate(new Date());
    setEndDate(new Date());
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
                    <SelectItem key={m.id} value={m.id}>{m.firstName || m.email || m.id}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-muted-foreground">From Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full sm:w-[180px] justify-start text-left font-normal", !startDate && "text-muted-foreground")}>
                    <CalendarIcon className="h-4 w-4" />
                    {startDate ? format(startDate, "MMMM d, yyyy") : "Pick a date"}
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
                    <CalendarIcon className=" h-4 w-4" />
                    {endDate ? format(endDate, "MMMM d, yyyy") : "Pick a date"}
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

      {loading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <HistoryTable
          attendance={filteredAttendance}
          team={teams?.find(t => t.id === selectedTeam) || { name: "All Teams" }}
        />
      )}
    </div>
  );
};

export default HistoryLayout;