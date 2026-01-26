'use client';

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

const HistoryTable = ({ attendance = [], team }) => {
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const rows = attendance;
  
  // Calculate Pagination values
  const totalRows = rows.length;
  const totalPages = Math.ceil(totalRows / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const currentRows = rows.slice(startIndex, endIndex);

  const handleExportPDF = () => {
    const doc = new jsPDF({ orientation: "landscape", unit: "pt" });
    doc.setFontSize(14);
    doc.text("Attendance History", 40, 30);

    autoTable(doc, {
      startY: 50,
      head: [["Date", "Member", "Team", "Attendance", "Marked At", "Status"]],
      body: rows.map(row => [
        row.dateDisplay || "-",
        row.name || "-",
        team?.name || "-",
        row.status || "-",
        row.markedAtDate ? format(row.markedAtDate, "hh:mm a") : "-",
        row.membershipStatus || "-"
      ]),
      styles: { fontSize: 9, cellPadding: 6 },
    });
    doc.save("attendance-history.pdf");
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Attendance History</CardTitle>
        <Button size="sm" variant="outline" onClick={handleExportPDF} disabled={rows.length === 0}>
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
              {currentRows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-4 text-center text-muted-foreground">No records found</td>
                </tr>
              ) : (
                currentRows.map((row, index) => (
                  <tr key={index} className="border-t">
                    <td className="p-3 whitespace-nowrap">{row.dateDisplay || "-"}</td>
                    <td className="p-3 whitespace-nowrap">{row.name || "-"}</td>
                    <td className="p-3 whitespace-nowrap">{team?.name || "-"}</td>
                    <td className="p-3 whitespace-nowrap">
                      <span className={cn(
                        "px-2 py-1 rounded text-xs font-medium capitalize",
                        row.status === "present" ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
                      )}>
                        {row.status || "-"}
                      </span>
                    </td>
                    <td className="p-3 whitespace-nowrap text-muted-foreground">
                      {row.markedAtDate ? format(row.markedAtDate, "hh:mm a") : "-"}
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      <span className={cn(
                        "px-2 py-1 rounded text-xs font-medium",
                        row.membershipStatus === "Active" ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
                      )}>
                        {row.membershipStatus || "-"}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <div className="flex items-center justify-between gap-4 py-4 px-2">
          {/* Hidden on Mobile/Tab (below lg) */}
          <div className="hidden lg:block text-sm text-muted-foreground">
            0 of {totalRows} row(s) selected.
          </div>

          <div className="flex w-full lg:w-auto items-center justify-between lg:justify-end gap-6 lg:gap-8">
            {/* Rows Per Page: Hidden on Mobile/Tab (below lg) */}
            <div className="hidden lg:flex items-center gap-2">
              <p className="text-sm font-medium">Rows per page</p>
              <Select
                value={`${rowsPerPage}`}
                onValueChange={(value) => {
                  setRowsPerPage(Number(value));
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="h-8 w-[70px]">
                  <SelectValue placeholder={rowsPerPage} />
                </SelectTrigger>
                <SelectContent align="end">
                  {[10, 20, 30, 40, 50].map((pageSize) => (
                    <SelectItem key={pageSize} value={`${pageSize}`}>
                      {pageSize}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Page info: Always visible */}
            <div className="flex items-center justify-center text-sm font-medium">
              Page {currentPage} of {totalPages || 1}
            </div>

            {/* Navigation Buttons */}
            <div className="flex items-center gap-2">
              {/* Double Left: Hidden on Mobile/Tab (below lg) */}
              <Button
                variant="outline"
                className="hidden lg:flex h-8 w-8 p-0"
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
              >
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              
              <Button
                variant="outline"
                className="h-8 w-8 p-0"
                onClick={() => setCurrentPage((prev) => prev - 1)}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              <Button
                variant="outline"
                className="h-8 w-8 p-0"
                onClick={() => setCurrentPage((prev) => prev + 1)}
                disabled={currentPage === totalPages || totalPages === 0}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>

              {/* Double Right: Hidden on Mobile/Tab (below lg) */}
              <Button
                variant="outline"
                className="hidden lg:flex h-8 w-8 p-0"
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages || totalPages === 0}
              >
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default HistoryTable;
