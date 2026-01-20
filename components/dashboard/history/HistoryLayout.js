'use client';

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useEffect, useState } from "react";
import { useTeams } from '../../../app/context/TeamsContext';
import { Button } from "@/components/ui/button";
import { cn } from '@/lib/utils';
import { CalendarIcon, Clock } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { fetchTeamAttendance } from "../../../lib/FetchAttendance";
import { format } from "date-fns";
import HistoryTable from "./HistoryTable";

const getTeamById = (teamsArray, teamId) =>
  teamsArray.find(team => team.id === teamId);

const HistoryLayout = () => {
  const { teams } = useTeams();

  const teamsArray = Array.isArray(teams)
    ? teams
    : teams
    ? Object.values(teams)
    : [];

  const [selectedTeam, setSelectedTeam] = useState("all");
  const [selectedMember, setSelectedMember] = useState("all");
  const [startDate, setStartDate] = useState();
  const [endDate, setEndDate] = useState();
  const [attendanceData, setAttendanceData] = useState({});

  const selectedTeamData =
    selectedTeam !== "all"
      ? getTeamById(teamsArray, selectedTeam)
      : null;

  const clearFilters = () => {
    setSelectedTeam("all");
    setSelectedMember("all");
    setStartDate(undefined);
    setEndDate(undefined);
    setAttendanceData({});
  };

  useEffect(() => {
    if (selectedTeam === "all") {
      setAttendanceData({});
      return;
    }

    const loadAttendance = async () => {
      const attendance = await fetchTeamAttendance(selectedTeam);
      setAttendanceData(attendance || {});
    };

    loadAttendance();
  }, [selectedTeam]);

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
  <div
    className="
      grid gap-4
      grid-cols-2
      sm:grid-cols-2
      md:flex md:flex-wrap
    "
  >
    {/* Team */}
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
          {teamsArray.map(team => (
            <SelectItem key={team.id} value={team.id}>
              {team.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>

    {/* Member */}
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
          {selectedTeamData?.members?.map(member => (
            <SelectItem key={member.id} value={member.id}>
              {member.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>

    {/* From Date */}
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-muted-foreground">From Date</label>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
                "w-full sm:w-[180px] justify-start text-left font-normal",
                !startDate && "text-muted-foreground"
            )}
            >
            <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
            <span className="truncate whitespace-nowrap">
                {startDate ? format(startDate, "PPP") : "Pick a date"}
            </span>
            </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={startDate}
            onSelect={setStartDate}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    </div>

    {/* To Date */}
    <div className="flex flex-col gap-1.5 ">
      <label className="text-sm font-medium text-muted-foreground">To Date</label>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
                "w-full sm:w-[180px] justify-start text-left font-normal",
                !endDate && "text-muted-foreground"
            )}
            >
            <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
            <span className="truncate whitespace-nowrap">
                {endDate ? format(endDate, "PPP") : "Pick a date"}
            </span>
            </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={endDate}
            onSelect={setEndDate}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    </div>

    {/* Clear Filters */}
    <div
      className="
        col-span-2
        flex justify-center
        md:col-auto md:items-end md:justify-start
      "
    >
      <Button variant="ghost" onClick={clearFilters}>
        Clear Filters
      </Button>
    </div>
  </div>
</CardContent>

      </Card>

      {selectedTeam !== "all" && (
        <HistoryTable
          attendance={attendanceData}
          team={selectedTeamData}
          filters={{
            memberId: selectedMember,
            fromDate: startDate,
            toDate: endDate,
          }}
        />
      )}
    </div>
  );
};

export default HistoryLayout;
