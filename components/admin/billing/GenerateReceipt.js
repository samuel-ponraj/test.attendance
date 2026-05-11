import jsPDF from "jspdf";

const logoPath = "/logo/KDA-logo-black.png";

const formatAmount = (value) => `Rs. ${Number(value || 0).toFixed(2)}`;

const formatPaymentMode = (value) => {
  if (!value) return "Cash";
  return value.replace("_", " ").replace(/\b\w/g, (char) => char.toUpperCase());
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

const addRow = (doc, label, value, y) => {
  doc.setFont("helvetica", "normal");
  doc.setTextColor(90, 90, 90);
  doc.text(label, 24, y);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(25, 25, 25);
  doc.text(String(value || "-"), 190, y, { align: "right" });
};

export const generateReceipt = async ({ team, member, period }) => {
  const doc = new jsPDF();
  const memberName = `${member?.firstName || ""} ${member?.lastName || ""}`.trim();
  const receiptNo = period?.receiptNo || period?.id || "receipt";
  const amount = Number(period?.lastPaymentAmount || period?.totalAmount || period?.paid || 0);
  const discountAmount = Number(period?.discountAmount || 0);
  const baseAmount = Number(period?.lastPaymentBaseAmount || period?.amount || amount || 0);
  const paymentMode = formatPaymentMode(period?.paymentMode);

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
  doc.text("Receipt", 190, 31, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(`Receipt No: ${receiptNo}`, 190, 45, { align: "right" });
  doc.text(`Date: ${new Date().toLocaleDateString("en-IN")}`, 190, 52, {
    align: "right",
  });

  doc.setDrawColor(230, 230, 230);
  doc.line(22, 62, 188, 62);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(25, 25, 25);
  doc.text("Bill To", 24, 76);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(90, 90, 90);
  doc.text(memberName || "-", 24, 84);
  doc.text(team?.name || team?.teamName || "KDA Team", 24, 91);

  doc.setFillColor(245, 247, 250);
  doc.roundedRect(22, 104, 166, 70, 2, 2, "F");

  doc.setFontSize(10);
  addRow(doc, "Period", period?.periodLabel || period?.period || "-", 118);
  addRow(doc, "Billing Cycle", formatPaymentMode(period?.billingCycle), 130);
  addRow(doc, "Payment Mode", paymentMode, 142);
  addRow(doc, "Status", "Paid", 154);
  addRow(doc, "Base Amount", formatAmount(baseAmount), 166);

  doc.setDrawColor(225, 225, 225);
  doc.line(22, 190, 188, 190);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(90, 90, 90);
  doc.text("Discount", 24, 204);
  doc.text(`- ${formatAmount(discountAmount)}`, 190, 204, { align: "right" });

  doc.setFillColor(20, 20, 20);
  doc.roundedRect(22, 220, 166, 28, 2, 2, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(255, 255, 255);
  doc.text("Total Paid", 30, 238);
  doc.text(formatAmount(amount), 180, 238, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(120, 120, 120);
  doc.text("Thank you for your payment.", 24, 264);
  doc.text("This is a system generated receipt.", 24, 271);

  doc.save(`receipt-${memberName || receiptNo}.pdf`);
};
