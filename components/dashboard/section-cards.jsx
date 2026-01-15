import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function SectionCards({ teams = [] }) {
  const totalTeams = teams.length;

  const totalMembers = teams.reduce(
    (sum, team) => sum + (team.total || 0),
    0
  );

  const totalPresent = teams.reduce(
    (sum, team) => sum + (team.present || 0),
    0
  );

  const totalAbsent = teams.reduce(
    (sum, team) => sum + (team.absent || 0),
    0
  );

  return (
    <div className="grid grid-cols-1 gap-4 px-4 lg:px-6 sm:grid-cols-2 xl:grid-cols-4">
      <Card>
        <CardHeader>
          <CardDescription>Total Teams</CardDescription>
          <CardTitle className="text-3xl font-semibold">
            {totalTeams}
          </CardTitle>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardDescription>Total Members</CardDescription>
          <CardTitle className="text-3xl font-semibold">
            {totalMembers}
          </CardTitle>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardDescription>Present Today</CardDescription>
          <CardTitle className="text-3xl font-semibold">
            {totalPresent}
          </CardTitle>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardDescription>Absent Today</CardDescription>
          <CardTitle className="text-3xl font-semibold">
            {totalAbsent}
          </CardTitle>
        </CardHeader>
      </Card>
    </div>
  );
}
