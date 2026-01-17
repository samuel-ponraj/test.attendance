'use client';

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

/* helpers */

const toDate = (timestamp) => {
  if (!timestamp) return null;
  if (timestamp instanceof Date) return timestamp;
  if (timestamp.toDate) return timestamp.toDate();
  return null;
};

const isMemberActive = (members = [], memberId) =>
  members.some(m => m.id === memberId);

const parseDateKey = (dateKey) => {
  const [dd, mm, yyyy] = dateKey.split("-");
  return new Date(Number(yyyy), Number(mm) - 1, Number(dd));
};

const endOfDay = (date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59);

/* build rows */

const buildHistoryRows = ({ attendance, team }) => {
  if (!attendance || !team) return [];

  const rows = [];

  Object.entries(attendance).forEach(([dateKey, members]) => {
    Object.values(members).forEach(record => {
      const active = isMemberActive(team.members, record.member.id);

      rows.push({
        date: dateKey,
        attendanceDate: parseDateKey(dateKey),
        memberId: record.member.id, 
        memberName: record.member.name,
        teamName: team.name,
        attendance: record.status,
        markedAt: toDate(record.markedAt),
        status: active ? "Active" : "Removed",
      });
    });
  });

  return rows.sort((a, b) => b.attendanceDate - a.attendanceDate);
};

/* component */

const HistoryTable = ({ attendance, team, filters = {} }) => {
  const { memberId = "all", fromDate, toDate } = filters;

  let rows = buildHistoryRows({ attendance, team });

  if (memberId !== "all") {
    rows = rows.filter(r => r.memberId === memberId);
  }

  if (fromDate) {
    rows = rows.filter(r => r.attendanceDate >= fromDate);
  }

  if (toDate) {
    rows = rows.filter(r => r.attendanceDate <= endOfDay(toDate));
  }

  /* =======================
     Export PDF
  ======================= */

  const handleExportPDF = () => {
    const doc = new jsPDF({
      orientation: "landscape",
      unit: "pt",
    });

    doc.setFontSize(14);
    doc.text("Attendance History", 40, 30);

    autoTable(doc, {
      startY: 50,
      head: [[
        "Date",
        "Member",
        "Team",
        "Attendance",
        "Marked At",
        "Status",
      ]],
      body: rows.map(row => [
        row.date,
        row.memberName,
        row.teamName,
        row.attendance,
        row.markedAt
          ? format(row.markedAt, "dd MMM yyyy, hh:mm a")
          : "-",
        row.status,
      ]),
      styles: {
        fontSize: 9,
        cellPadding: 6,
        overflow: "linebreak",
      },
      headStyles: {
        fillColor: [240, 240, 240],
        textColor: 20,
        fontStyle: "bold",
      },
    });

    doc.save("attendance-history.pdf");
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Attendance History</CardTitle>

        <Button
          size="sm"
          variant="outline"
          onClick={handleExportPDF}
          disabled={rows.length === 0}
        >
          Export PDF
        </Button>
      </CardHeader>

      <CardContent className="px-3">
        <div className="overflow-x-auto">
          <table className="w-full text-sm border rounded-lg">
            <thead className="bg-muted">
              <tr>
                <th className="p-3 text-left">Date</th>
                <th className="p-3 text-left">Member</th>
                <th className="p-3 text-left">Team</th>
                <th className="p-3 text-left">Attendance</th>
                <th className="p-3 text-left whitespace-nowrap">Marked At</th>
                <th className="p-3 text-left">Status</th>
              </tr>
            </thead>

            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-4 text-center text-muted-foreground">
                    No attendance records found
                  </td>
                </tr>
              )}

              {rows.map((row, index) => (
                <tr key={index} className="border-t">
                  <td className="p-3 whitespace-nowrap">{row.date}</td>
                  <td className="p-3 whitespace-nowrap">{row.memberName}</td>
                  <td className="p-3 whitespace-nowrap">{row.teamName}</td>
                  <td className="p-3 whitespace-nowrap">
                    <span
                      className={cn(
                        "px-2 py-1 rounded text-xs font-medium capitalize",
                        row.attendance === "present"
                          ? "bg-success/10 text-success"
                          : "bg-destructive/10 text-destructive"
                      )}
                    >
                      {row.attendance}
                    </span>
                  </td>
                  <td className="p-3 whitespace-nowrap">
                    {row.markedAt
                      ? format(row.markedAt, "dd MMM yyyy, hh:mm a")
                      : "-"}
                  </td>
                  <td className="p-3 whitespace-nowrap">
                    <span
                      className={cn(
                        "px-2 py-1 rounded text-xs font-medium",
                        row.status === "Active"
                          ? "bg-success/10 text-success"
                          : "bg-destructive/10 text-destructive"
                      )}
                    >
                      {row.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};

export default HistoryTable;
