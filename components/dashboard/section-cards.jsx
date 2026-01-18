import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Users,
  UserCheck,
  UserX,
  Layers,
} from "lucide-react";
import useAttendanceCount from '../../lib/AttendanceCount'

export function SectionCards({ teams = [] }) {

  const { present, absent, loading } =
    useAttendanceCount(new Date());

  const totalTeams = teams.length;

  const totalMembers = teams.reduce(
    (sum, team) => sum + (team.total || 0),
    0
  );



  const CardItem = ({ title, value, Icon, color }) => (
    <Card className="py-3 lg:py-6">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-3xl font-semibold mb-2">
            {value}
          </CardTitle>
          <CardDescription >{title}</CardDescription>
        </div>

        {/* Colored icon */}
        <div
          className={`flex h-12 w-12 items-center justify-center rounded-xl ${color.bg}`}
        >
          <Icon className={`h-6 w-6 ${color.icon}`} />
        </div>
      </CardHeader>
    </Card>
  );

  return (
    <div className="grid grid-cols-2 gap-4 px-4 lg:px-6 sm:grid-cols-2  xl:grid-cols-4">
      <CardItem
        title="Total Teams"
        value={totalTeams}
        Icon={Layers}
        color={{
          bg: "bg-indigo-100 dark:bg-indigo-900/30",
          icon: "text-indigo-600 dark:text-indigo-400",
        }}
        
      />

      <CardItem
        title="Total Members"
        value={totalMembers}
        Icon={Users}
        color={{
          bg: "bg-blue-100 dark:bg-blue-900/30",
          icon: "text-blue-600 dark:text-blue-400",
        }}
      />

      <CardItem
        title="Present Today"
        value={present}
        Icon={UserCheck}
        color={{
          bg: "bg-emerald-100 dark:bg-emerald-900/30",
          icon: "text-emerald-600 dark:text-emerald-400",
        }}
      />

      <CardItem
        title="Absent Today"
        value={absent}
        Icon={UserX}
        color={{
          bg: "bg-rose-100 dark:bg-rose-900/30",
          icon: "text-rose-600 dark:text-rose-400",
        }}
      />
    </div>
  );
}
