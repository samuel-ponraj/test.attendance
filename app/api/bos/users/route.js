import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { requireBosAdmin } from "@/lib/bos-admin";

export const runtime = "nodejs";

const timestampToMillis = (value) => {
  if (!value) return 0;
  if (typeof value.toMillis === "function") return value.toMillis();
  if (value.seconds) return value.seconds * 1000;
  if (value instanceof Date) return value.getTime();
  return 0;
};

export async function POST(req) {
  let createdUser = null;

  try {
    const bosUser = await requireBosAdmin(req);
    if (bosUser.error) {
      return NextResponse.json({ error: bosUser.error }, { status: bosUser.status });
    }

    const body = await req.json();
    const firstName = String(body.firstName || "").trim();
    const lastName = String(body.lastName || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const phone = String(body.phone || "").trim();
    const password = String(body.password || "");
    const companyName = String(body.companyName || "").trim();
    const businessEmail = String(body.businessEmail || "").trim().toLowerCase();
    const companyPhone = String(body.companyPhone || "").trim();
    const purchaseDate = String(body.purchaseDate || "");
    const activationDate = String(body.activationDate || "");
    const licenceStatus = String(body.licenceStatus || "active").toLowerCase();
    const maxTeams = Number(body.maxTeams);
    const maxEmployees = Number(body.maxEmployees);
    const amountPaid = Number(body.amountPaid);

    if (!companyName || !businessEmail || !companyPhone || !purchaseDate || !activationDate || !firstName || !lastName || !email || !password) {
      return NextResponse.json({ error: "Complete all required company, licence and administrator fields" }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: "Password must contain at least 6 characters" }, { status: 400 });
    }

    if (!Number.isInteger(maxTeams) || maxTeams < 1 || !Number.isInteger(maxEmployees) || maxEmployees < 1 || !Number.isFinite(amountPaid) || amountPaid < 0) {
      return NextResponse.json({ error: "Enter valid licence limits and payment amount" }, { status: 400 });
    }

    if (!["active", "suspended", "revoked"].includes(licenceStatus)) {
      return NextResponse.json({ error: "Invalid licence status" }, { status: 400 });
    }

    createdUser = await adminAuth.createUser({
      email,
      password,
      displayName: `${firstName} ${lastName}`,
    });

    const licenceKey = `KDA-${randomUUID().replaceAll("-", "").slice(0, 16).toUpperCase()}`;
    const companyDetails = {
      name: companyName,
      email: businessEmail,
      phone: companyPhone,
      address: String(body.address || "").trim(),
      city: String(body.city || "").trim(),
      state: String(body.state || "").trim(),
      country: String(body.country || "").trim(),
      postalCode: String(body.postalCode || "").trim(),
      taxId: String(body.taxNumber || "").trim(),
      logoURL: String(body.logoUrl || "").trim(),
    };
    const licence = {
      type: "lifetime",
      key: licenceKey,
      status: licenceStatus,
      purchaseDate,
      activationDate,
      maxTeams,
      maxEmployees,
      amountPaid,
      paymentMethod: String(body.paymentMethod || "").trim(),
      paymentReference: String(body.paymentReference || "").trim(),
      invoiceNumber: String(body.invoiceNumber || "").trim(),
      internalNotes: String(body.internalNotes || "").trim(),
    };
    const batch = adminDb.batch();

    batch.set(adminDb.collection("users").doc(createdUser.uid), {
      firstName,
      lastName,
      email,
      phone,
      role: "admin",
      companyDetails,
      licence,
      createdAt: new Date(),
      createdBy: bosUser.uid,
    });

    batch.set(adminDb.collection("companies").doc(createdUser.uid), {
      ...companyDetails,
      adminId: createdUser.uid,
      licence,
      createdAt: new Date(),
      createdBy: bosUser.uid,
    });

    await batch.commit();

    return NextResponse.json({
      success: true,
      licenceKey,
      user: { uid: createdUser.uid, email, firstName, lastName },
    }, { status: 201 });
  } catch (error) {
    if (createdUser) await adminAuth.deleteUser(createdUser.uid).catch(() => {});

    const duplicateEmail = error.code === "auth/email-already-exists";
    return NextResponse.json(
      { error: duplicateEmail ? "A user with this email already exists" : error.message || "Failed to create user" },
      { status: duplicateEmail ? 409 : 500 }
    );
  }
}

export async function GET(req) {
  try {
    const bosUser = await requireBosAdmin(req);
    if (bosUser.error) {
      return NextResponse.json({ error: bosUser.error }, { status: bosUser.status });
    }
    const [usersSnap, teamsSnap] = await Promise.all([
      adminDb.collection("users").limit(200).get(),
      adminDb.collection("teams").limit(1000).get(),
    ]);
    const teamStats = teamsSnap.docs.reduce((stats, teamDoc) => {
      const data = teamDoc.data() || {};
      const ownerId = data.admin?.userId;
      if (!ownerId) return stats;
      stats[ownerId] ||= { teamCount: 0, memberCount: 0 };
      stats[ownerId].teamCount += 1;
      stats[ownerId].memberCount += Number(data.totalMembers || 0);
      return stats;
    }, {});
    const users = usersSnap.docs.map((userDoc) => {
      const data = userDoc.data() || {};
      return {
        id: userDoc.id,
        name: [data.firstName, data.lastName].filter(Boolean).join(" ") || data.displayName || data.name || "Unnamed user",
        email: data.email || "",
        createdAt: timestampToMillis(data.createdAt || data.lastLogin),
        teamCount: teamStats[userDoc.id]?.teamCount || data.teamCount || 0,
        memberCount: teamStats[userDoc.id]?.memberCount || 0,
      };
    });
    return NextResponse.json({ success: true, users });
  } catch (error) {
    console.error("Back office users load error:", error);
    return NextResponse.json({ error: error.message || "Failed to load back office users" }, { status: 500 });
  }
}
