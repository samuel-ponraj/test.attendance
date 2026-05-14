import jsPDF from "jspdf";

const logoPath = "/logo/KDA-logo-black.png";

const formatAmount = (value) => `Rs. ${Number(value || 0).toFixed(2)}`;

const formatDate = (value) => {
  if (!value) return "-";

  const date = value?.seconds
    ? new Date(value.seconds * 1000)
    : new Date(value);

  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const getMemberName = (member, slip) =>
  `${member?.firstName || ""} ${member?.lastName || ""}`.trim() ||
  slip?.memberName ||
  "member";

const getFileName = (member, slip) => {
  const name = (member?.firstName || slip?.memberName || "member")
    .split(" ")[0]
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  return `payslip_${name || "member"}.pdf`;
};

const loadImageAsDataUrl = async (path) => {
  const response = await fetch(path);
  const blob = await response.blob();

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

const addPair = (doc, label, value, x, y, width = 76) => {
  doc.setFont("helvetica", "normal");
  doc.setTextColor(90, 90, 90);
  doc.text(label, x, y);

  doc.setFont("helvetica", "bold");
  doc.setTextColor(25, 25, 25);
  doc.text(String(value ?? "-"), x + width, y, { align: "right" });
};

const addSectionTitle = (doc, title, y) => {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(25, 25, 25);
  doc.text(title, 24, y);
};

export const generatePayslip = async ({ team, member, slip }) => {
  const doc = new jsPDF();
  const memberName = getMemberName(member, slip);

  const grossSalary = Number(slip?.grossSalary || 0);
  const deductions = Number(slip?.deductions || 0);
  const netSalary = Number(slip?.netSalary || Math.max(grossSalary - deductions, 0));
  const amountPaid = Math.min(Number(slip?.amountPaid ?? netSalary), netSalary);

  doc.setFillColor(248, 250, 252);
  doc.rect(0, 0, 210, 297, "F");

  doc.setFillColor(255, 255, 255);
  doc.roundedRect(14, 14, 182, 269, 3, 3, "F");

  try {
    const logo = await loadImageAsDataUrl(logoPath);
    doc.addImage(logo, "PNG", 22, 22, 28, 18);
  } catch {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("KDA", 24, 32);
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(20, 20, 20);
  doc.text("Payslip", 190, 31, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(`Payslip No: ${slip?.id || "-"}`, 190, 45, { align: "right" });
  doc.text(`Generated: ${new Date().toLocaleDateString("en-IN")}`, 190, 52, {
    align: "right",
  });

  doc.setDrawColor(230, 230, 230);
  doc.line(22, 62, 188, 62);

  addSectionTitle(doc, "Employee Details", 76);
  doc.setFontSize(10);
  addPair(doc, "Name", memberName, 24, 88);
  addPair(doc, "Team", team?.name || team?.teamName || "KDA Team", 24, 100);
  addPair(doc, "Salary Type", slip?.salaryType || member?.salaryConfig?.salaryType || "-", 24, 112);
  addPair(doc, "Period", slip?.periodLabel || "-", 110, 88, 76);
  addPair(doc, "From", formatDate(slip?.fromDate), 110, 100, 76);
  addPair(doc, "To", formatDate(slip?.toDate), 110, 112, 76);

  doc.setFillColor(245, 247, 250);
  doc.roundedRect(22, 128, 166, 48, 2, 2, "F");

  addSectionTitle(doc, "Attendance", 140);
  doc.setFontSize(10);
  addPair(doc, "Working Days", slip?.totalWorkingDays || 0, 28, 152);
  addPair(doc, "Present", slip?.presentDays || 0, 28, 164);
  addPair(doc, "Half Days", slip?.halfDays || 0, 112, 152, 70);
  addPair(doc, "Absent", slip?.absentDays || 0, 112, 164, 70);

  addSectionTitle(doc, "Payroll Details", 196);
  doc.setFontSize(10);
  addPair(doc, "Basic Pay", formatAmount(slip?.basicPay), 24, 210);
  addPair(doc, "Bonus", formatAmount(slip?.bonus), 24, 222);
  addPair(doc, "Gross Salary", formatAmount(grossSalary), 24, 234);
  addPair(doc, "Deductions", `- ${formatAmount(deductions)}`, 110, 210, 76);
  addPair(doc, "Net Salary", formatAmount(netSalary), 110, 222, 76);
  addPair(doc, "Amount Paid", formatAmount(amountPaid), 110, 234, 76);

  doc.setFillColor(20, 20, 20);
  doc.roundedRect(22, 248, 166, 22, 2, 2, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(255, 255, 255);
  doc.text("Payment Status", 30, 262);
  doc.text(String(slip?.status || "pending").toUpperCase(), 180, 262, {
    align: "right",
  });

  if (slip?.notes) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text(`Notes: ${slip.notes}`, 24, 280, { maxWidth: 160 });
  }

  doc.save(getFileName(member, slip));
};
