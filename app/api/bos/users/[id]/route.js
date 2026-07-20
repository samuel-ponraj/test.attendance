import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { requireBosAdmin } from "@/lib/bos-admin";

export const runtime = "nodejs";

export async function GET(req, { params }) {
  const bosUser = await requireBosAdmin(req);
  if (bosUser.error) return NextResponse.json({ error: bosUser.error }, { status: bosUser.status });

  const { id } = await params;
  const [userDoc, companyDoc] = await Promise.all([
    adminDb.collection("users").doc(id).get(),
    adminDb.collection("companies").doc(id).get(),
  ]);
  if (!userDoc.exists) return NextResponse.json({ error: "Company not found" }, { status: 404 });

  const user = userDoc.data() || {};
  const company = companyDoc.data() || {};
  const details = companyDoc.exists ? company : user.companyDetails || {};
  const licence = company.licence || user.licence || {};

  return NextResponse.json({
    success: true,
    company: {
      id,
      companyName: details.name || "",
      businessEmail: details.email || "",
      companyPhone: details.phone || "",
      address: details.address || "",
      city: details.city || "",
      state: details.state || "",
      country: details.country || "",
      postalCode: details.postalCode || "",
      taxNumber: details.taxId || "",
      logoUrl: details.logoURL || "",
      purchaseDate: licence.purchaseDate || "",
      activationDate: licence.activationDate || "",
      licenceStatus: licence.status || "active",
      licenceKey: licence.key || "",
      maxTeams: licence.maxTeams || "",
      maxEmployees: licence.maxEmployees || "",
      amountPaid: licence.amountPaid ?? "",
      paymentMethod: licence.paymentMethod || "upi",
      paymentReference: licence.paymentReference || "",
      invoiceNumber: licence.invoiceNumber || "",
      internalNotes: licence.internalNotes || "",
      firstName: user.firstName || "",
      lastName: user.lastName || "",
      email: user.email || "",
      phone: user.phone || "",
    },
  });
}

export async function PATCH(req, { params }) {
  try {
    const bosUser = await requireBosAdmin(req);
    if (bosUser.error) return NextResponse.json({ error: bosUser.error }, { status: bosUser.status });

    const { id } = await params;
    const body = await req.json();
    const userRef = adminDb.collection("users").doc(id);
    const userDoc = await userRef.get();
    if (!userDoc.exists) return NextResponse.json({ error: "Company not found" }, { status: 404 });

    const companyDetails = {
      name: String(body.companyName || "").trim(),
      email: String(body.businessEmail || "").trim().toLowerCase(),
      phone: String(body.companyPhone || "").trim(),
      address: String(body.address || "").trim(),
      city: String(body.city || "").trim(),
      state: String(body.state || "").trim(),
      country: String(body.country || "").trim(),
      postalCode: String(body.postalCode || "").trim(),
      taxId: String(body.taxNumber || "").trim(),
      logoURL: String(body.logoUrl || "").trim(),
    };
    const oldLicence = userDoc.data()?.licence || {};
    const licence = {
      ...oldLicence,
      type: "lifetime",
      status: String(body.licenceStatus || "active"),
      purchaseDate: String(body.purchaseDate || ""),
      activationDate: String(body.activationDate || ""),
      maxTeams: Number(body.maxTeams),
      maxEmployees: Number(body.maxEmployees),
      amountPaid: Number(body.amountPaid),
      paymentMethod: String(body.paymentMethod || ""),
      paymentReference: String(body.paymentReference || "").trim(),
      invoiceNumber: String(body.invoiceNumber || "").trim(),
      internalNotes: String(body.internalNotes || "").trim(),
    };
    if (!companyDetails.name || !companyDetails.email || !companyDetails.phone || !body.firstName || !body.lastName || !body.email) {
      return NextResponse.json({ error: "Complete all required fields" }, { status: 400 });
    }

    const authUpdate = {
      email: String(body.email).trim().toLowerCase(),
      displayName: `${String(body.firstName).trim()} ${String(body.lastName).trim()}`,
    };
    if (body.password) authUpdate.password = String(body.password);
    await adminAuth.updateUser(id, authUpdate);

    const userData = {
      firstName: String(body.firstName).trim(),
      lastName: String(body.lastName).trim(),
      email: authUpdate.email,
      phone: String(body.phone || "").trim(),
      companyDetails,
      licence,
      updatedAt: new Date(),
      updatedBy: bosUser.uid,
    };
    const batch = adminDb.batch();
    batch.update(userRef, userData);
    batch.set(adminDb.collection("companies").doc(id), { ...companyDetails, adminId: id, licence, updatedAt: new Date(), updatedBy: bosUser.uid }, { merge: true });
    await batch.commit();

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Failed to update company" }, { status: 500 });
  }
}
