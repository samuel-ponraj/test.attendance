import jsPDF from "jspdf";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

const logoPath = "/logo/KDA-logo-black.png";

const formatAmount = (value) => `Rs. ${Number(value || 0).toFixed(2)}`;

const formatPaymentMode = (value) => {
  if (!value) return "Cash";
  return value.replace("_", " ").replace(/\b\w/g, (char) => char.toUpperCase());
};

const compactValue = (value, maxLength = 34) => {
  const text = String(value || "");

  if (text.length <= maxLength) return text;

  const sideLength = Math.floor((maxLength - 3) / 2);
  return `${text.slice(0, sideLength)}...${text.slice(-sideLength)}`;
};

const getRazorpayRows = (period) => {
  const paymentLink = period?.razorpayPaymentLink || {};
  const rows = [
    ["Gateway", period?.gateway === "razorpay" || period?.paymentMode === "upi" ? "Razorpay" : ""],
    ["Razorpay Payment ID", period?.razorpayPaymentId || paymentLink.paymentId],
    ["Razorpay Order ID", period?.razorpayOrderId],
    ["Payment Link ID", period?.razorpayPaymentLinkId || paymentLink.id],
    [
      "Payment Link Ref",
      period?.razorpayPaymentLinkReferenceId || paymentLink.referenceId,
    ],
  ];

  return rows.filter(([, value]) => value);
};

const loadImageAsDataUrl = async (path) => {
  const response = await fetch(path);
  const blob = await response.blob();

  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });

  const dimensions = await new Promise((resolve) => {
    const image = new Image();
    image.onload = () =>
      resolve({
        width: image.naturalWidth || 1,
        height: image.naturalHeight || 1,
      });
    image.onerror = () => resolve({ width: 44, height: 24 });
    image.src = dataUrl;
  });

  return {
    dataUrl,
    ...dimensions,
  };
};

const getImageFormat = (dataUrl = "") => {
  if (dataUrl.includes("image/jpeg") || dataUrl.includes("image/jpg")) {
    return "JPEG";
  }

  if (dataUrl.includes("image/webp")) {
    return "WEBP";
  }

  return "PNG";
};

const getCompanyDetails = async (team) => {
  if (team?.invoiceCompanyDetails) {
    return team.invoiceCompanyDetails;
  }

  const adminUserId = team?.admin?.userId || team?.adminUserId;

  if (!adminUserId) return {};

  try {
    const adminSnapshot = await getDoc(doc(db, "users", adminUserId));
    return adminSnapshot.data()?.companyDetails || {};
  } catch {
    console.error("Failed to load invoice company details:", err);
    return {};
  }
};

const addReceiptLogo = async (doc, companyDetails) => {
  const logoSource = companyDetails?.logoURL || logoPath;

  try {
    const logo = await loadImageAsDataUrl(logoSource);
    const maxLogoWidth = 54;
    const maxLogoHeight = 28;
    const logoRatio = Math.min(
      maxLogoWidth / logo.width,
      maxLogoHeight / logo.height,
    );
    doc.addImage(
      logo.dataUrl,
      getImageFormat(logo.dataUrl),
      12,
      12,
      logo.width * logoRatio,
      logo.height * logoRatio,
    );
  } catch {
    if (logoSource !== logoPath) {
      await addReceiptLogo(doc, {});
      return;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("KDA", 12, 27);
  }
};

const addRow = (doc, label, value, y, options = {}) => {
  const { x = 12, valueX = 198 } = options;

  doc.setFont("helvetica", "normal");
  doc.setTextColor(90, 90, 90);
  doc.text(label, x, y);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(25, 25, 25);
  doc.text(String(value || "-"), valueX, y, { align: "right" });
};

export const generateReceipt = async ({ team, member, period }) => {
  const doc = new jsPDF();
  const companyDetails = await getCompanyDetails(team);
  const memberName = `${member?.firstName || ""} ${member?.lastName || ""}`.trim();
  const receiptNo = period?.receiptNo || period?.id || "receipt";
  const paidAmount = Number(
    period?.paidAmount ||
      period?.lastPaymentAmount ||
      period?.totalAmount ||
      period?.amount ||
      0,
  );
  const periodAmount = Number(
    period?.periodAmount ||
      period?.lastPaymentBaseAmount ||
      period?.amount ||
      paidAmount ||
      0,
  );
  const previousPaid = Number(
    period?.previousPaid ??
      Math.max(Number(period?.paid || 0) - paidAmount, 0),
  );
  const currentDiscount = Number(
    period?.paymentDiscountAmount ?? period?.currentDiscountAmount ?? period?.discountAmount ?? 0,
  );
  const previousDiscount = Number(period?.previousDiscount || 0);
  const totalDiscount = Number(
    period?.totalDiscountAmount ??
      Math.max(previousDiscount + currentDiscount, currentDiscount),
  );
  const balanceAfterPayment = Number(
    period?.balanceAfterPayment ??
      period?.balance ??
      Math.max(periodAmount - previousPaid - paidAmount - totalDiscount, 0),
  );
  const paymentMode = formatPaymentMode(period?.paymentMode);
  const razorpayRows = getRazorpayRows(period);

  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, 210, 297, "F");

  doc.setDrawColor(230, 230, 230);
  doc.rect(7, 7, 196, 283);

  await addReceiptLogo(doc, companyDetails);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(24);
  doc.setTextColor(20, 20, 20);
  doc.text("Payment Receipt", 198, 21, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(`Receipt No: ${receiptNo}`, 198, 32, { align: "right" });
  doc.text(`Date: ${new Date().toLocaleDateString("en-IN")}`, 198, 39, {
    align: "right",
  });

  doc.setDrawColor(220, 220, 220);
  doc.line(12, 48, 198, 48);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(25, 25, 25);
  doc.text("Bill To", 12, 62);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(90, 90, 90);
  doc.text(memberName || "-", 12, 70);
  doc.text(team?.name || team?.teamName || "KDA Team", 12, 77);

  doc.setFillColor(245, 247, 250);
  doc.roundedRect(12, 90, 186, 49, 2, 2, "F");

  doc.setFontSize(10);
  let rowY = 103;
  addRow(doc, "Period", period?.periodLabel || period?.period || "-", rowY);
  rowY += 9;
  addRow(doc, "Billing Cycle", formatPaymentMode(period?.billingCycle), rowY);
  rowY += 9;
  addRow(doc, "Payment Mode", paymentMode, rowY);
  rowY += 9;
  addRow(doc, "Status", "Paid", rowY);
  rowY += 9;
  addRow(doc, "Billing Amount", formatAmount(periodAmount), rowY);

  const summaryStartY = 162;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(25, 25, 25);
  doc.text("Payment Summary", 12, summaryStartY);

  const summaryRows = [
    ["Billing Amount", formatAmount(periodAmount)],
    ["Previous Paid", formatAmount(previousPaid)],
    ["Previous Discount", formatAmount(previousDiscount)],
    ["Paid Amount", formatAmount(paidAmount)],
    ["Current Discount", formatAmount(currentDiscount)],
    ["Total Discount", formatAmount(totalDiscount)],
    ["Balance Amount To Pay", formatAmount(balanceAfterPayment)],
  ];

  let summaryY = summaryStartY + 11;
  summaryRows.forEach(([label, value]) => {
    addRow(doc, label, value, summaryY);
    summaryY += 9;
  });

  doc.setFillColor(20, 20, 20);
  doc.roundedRect(12, summaryY + 4, 186, 22, 2, 2, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(255, 255, 255);
  doc.text("Paid Amount", 20, summaryY + 18);
  doc.text(formatAmount(paidAmount), 190, summaryY + 18, { align: "right" });

  if (razorpayRows.length > 0) {
    const gatewayStartY = summaryY + 42;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(25, 25, 25);
    doc.text("Gateway Details", 12, gatewayStartY);

    rowY = gatewayStartY + 11;
    razorpayRows.forEach(([label, value]) => {
      addRow(doc, label, compactValue(value), rowY);
      rowY += 8;
    });
  }

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(120, 120, 120);
  doc.text("Thank you for your payment.", 12, 276);
  doc.text("This is a system generated receipt.", 12, 283);

  doc.save(`receipt-${memberName || receiptNo}.pdf`);
};
