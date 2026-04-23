'use client';

import { useMemo, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { VscFilePdf } from "react-icons/vsc";

const InvoiceTable = ({ attendance = [], team, billingData, members = [], selectedTeam }) => {
  
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [paymentFilter, setPaymentFilter] = useState("all");
  const billingMode = billingData?.billingMode || "daily";

  // Aggregate Data for Monthly View
  const processedRows = useMemo(() => {
    if (selectedTeam === "all" || billingMode !== "monthly") return attendance;

    const summaryMap = {};
    attendance.forEach((record) => {
      const mId = record.id;
      if (!summaryMap[mId]) {
        const memberInfo = members.find(m => m.id === mId);
        summaryMap[mId] = {
          ...record,
          joinedDate: memberInfo?.createdAt || null,
          totalPresent: 0,
          totalAbsent: 0,
          totalHalfday: 0,
          totalWorkingDays: 0,
        };
      }
      summaryMap[mId].totalWorkingDays += 1;
      if (record.status === "present") summaryMap[mId].totalPresent += 1;
      else if (record.status === "absent") summaryMap[mId].totalAbsent += 1;
      else if (record.status === "halfday") summaryMap[mId].totalHalfday += 1;
    });
    return Object.values(summaryMap);
  }, [attendance, billingMode, members, selectedTeam]);

  const filteredRows = useMemo(() => {
  if (paymentFilter === "all") return processedRows;

  return processedRows.filter((row) => {
    const status = (row.paymentStatus || "Pending").toLowerCase();
    return status === paymentFilter;
  });
}, [processedRows, paymentFilter]);

  	const totalRows = filteredRows.length;
	const totalPages = Math.ceil(totalRows / rowsPerPage);

	const currentRows = filteredRows.slice(
	(currentPage - 1) * rowsPerPage,
	currentPage * rowsPerPage
	);

  const handleExportPDF = () => {
    const doc = new jsPDF({ orientation: "landscape" });
    const headers = billingMode === "monthly" 
      ? [["Member", "Joined", "Working Days", "Present", "Absent", "Halfday", "Amount", "Status"]]
      : [["Date", "Member", "Status", "Amount"]];

    const body = currentRows.map(row => billingMode === "monthly" ? [
      `${row.firstName} ${row.lastName}`,
      row.createdAt ? format(row.createdAt.toDate(), "dd-MM-yyyy") : "-",
      row.totalWorkingDays,
      row.totalPresent,
      row.totalAbsent,
      row.totalHalfday,
      billingData?.defaultAmount || "0",
      row.membershipStatus
    ] : [row.dateDisplay, `${row.firstName} ${row.lastName}`, capitalize(row.status), billingData?.defaultAmount]);

    autoTable(doc, { head: headers, body: body });
    doc.save(`invoice-${billingMode}.pdf`);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Invoice Summary</CardTitle>
        <div className="flex items-center gap-3">
    
			<Select value={paymentFilter} onValueChange={setPaymentFilter}>
			<SelectTrigger className="w-[140px]">
				<SelectValue placeholder="Payment" />
			</SelectTrigger>
			<SelectContent>
				<SelectItem value="all">All</SelectItem>
				<SelectItem value="pending">Pending</SelectItem>
				<SelectItem value="paid">Paid</SelectItem>
				<SelectItem value="due">Due</SelectItem>
			</SelectContent>
			</Select>

			<Button
			size="sm"
			onClick={handleExportPDF}
			disabled={processedRows.length === 0}
			>
			<VscFilePdf />
			Generate Invoice
			</Button>

		</div>
      </CardHeader>

      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border">
            <thead className="bg-muted">
              {billingMode === "monthly" ? (
                <tr>
                  <th className="p-3 text-left  whitespace-nowrap">Joined Date</th>
                  <th className="p-3 text-left  whitespace-nowrap ">Member</th>
                  <th className="p-3 text-left  whitespace-nowrap ">Team Name</th>
                  <th className="p-3 text-left  whitespace-nowrap ">Working Days</th>
                  <th className="p-3 text-left  whitespace-nowrap ">Present</th>
                  <th className="p-3 text-left  whitespace-nowrap ">Absent</th>
                  <th className="p-3 text-left  whitespace-nowrap ">Halfday</th>
                    <th className="p-3 text-left  whitespace-nowrap">Amount</th>
                   <th className="p-3 text-left  whitespace-nowrap">To Pay</th>
                   <th className="p-3 text-left  whitespace-nowrap">Pending</th>
                  <th className="p-3 text-left  whitespace-nowrap ">Payment Status</th>
                  <th className="p-3 text-left  whitespace-nowrap ">Status</th>
                </tr>
              ) : (
                <tr>
                   <th className="p-3 text-left  whitespace-nowrap">Date</th>
                   <th className="p-3 text-left  whitespace-nowrap">Member</th>
                   <th className="p-3 text-left  whitespace-nowrap">Team Name</th>
                   <th className="p-3 text-left  whitespace-nowrap">Attendance</th>
                   <th className="p-3 text-left  whitespace-nowrap">Amount</th>
                   <th className="p-3 text-left  whitespace-nowrap">To Pay</th>
                   <th className="p-3 text-left  whitespace-nowrap">Pending</th>
                   <th className="p-3 text-left  whitespace-nowrap">Payment Status</th>
                   <th className="p-3 text-left  whitespace-nowrap">Status</th>
                </tr>
              )}
            </thead>
            <tbody>
              {selectedTeam === "all" ? (
                <tr>
                  <td colSpan={10} className="p-12 text-center text-muted-foreground font-medium italic">
                    Please select a Team to view the data
                  </td>
                </tr>
              ) : currentRows.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-4 text-center text-muted-foreground">No records found</td>
                </tr>
              ) : (
                currentRows.map((row, idx) => (
                  <tr key={idx} className="border-t hover:bg-muted/50 transition-colors">
                    {billingMode === "monthly" ? (
                      <>
                        <td className="p-3">{row.joinedDate?.toDate ? format(row.joinedDate.toDate(), "dd-MM-yyyy") : "-"}</td>
                        <td className="p-3 font-medium">{row.firstName} {row.lastName}</td>
                        <td className="p-3">{team?.name}</td>
                        <td className="p-3 text-center">{row.totalWorkingDays}</td>
						
                        <td className="p-3 text-center">
						<span className="px-2 py-1 text-xs font-medium text-success">
							{row.totalPresent}
						</span>
						</td>

						<td className="p-3 text-center">
						<span className="px-2 py-1 text-xs font-medium text-destructive">
							{row.totalAbsent}
						</span>
						</td>

						<td className="p-3 text-center">
						<span
							className="px-2 py-1  text-xs font-medium"
							style={{color: "#F59E0B"}}
						>
							{row.totalHalfday}
						</span>
						</td>
                        <td className="p-3 ">Rs. {billingData?.defaultAmount || "-"}</td>
                        <td className="p-3 ">Rs. {billingData?.defaultAmount || "-"}</td>
                        <td className="p-3 ">Rs. {billingData?.defaultAmount || "-"}</td>
                        <td className="p-3">Pending</td>
                        <td className="p-3">
                           <span className={cn("px-2 py-1 rounded-xl text-xs font-medium",
                                row.membershipStatus === "Active" ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"

                            )}>
                             {row.membershipStatus || "-"}
                           </span>
						</td>
                      </>
                    ) : (
                      <>
                        <td className="p-3">{format(row.dateDisplay, "dd-MM-yyyy")}</td>
                        <td className="p-3 font-medium">{row.firstName} {row.lastName}</td>
                        <td className="p-3">{team?.name}</td>
                        <td className="p-3">
                           <span className={cn(
                             "px-2 py-1 rounded-xl text-xs font-medium capitalize",
                             row.status === "present" && "bg-success/10 text-success",
                             row.status === "absent" && "bg-destructive/10 text-destructive",
                             row.status === "halfday" && "bg-orange-100 text-orange-600"
                           )}>
                             {row.status || "-"}
                           </span>
                        </td>
                        <td className="p-3 ">Rs. {billingData?.defaultAmount || "-"}</td>
                        <td className="p-3 ">Rs. {billingData?.defaultAmount || "-"}</td>
                        <td className="p-3 ">Rs. {billingData?.defaultAmount || "-"}</td>
                        <td className="p-3">Pending</td>
                        <td className="p-3">
                           <span className={cn("px-2 py-1 rounded-xl text-xs font-medium",
                                row.membershipStatus === "Active" ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"

                            )}>
                             {row.membershipStatus || "-"}
                           </span>
						</td>
                      </>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};

export default InvoiceTable;