import { NextResponse } from "next/server";
import { Resend } from "resend";
import { adminDb } from "@/lib/firebase-admin";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req) {
  try {
    const { teamId, userEmail, userId } = await req.json();
    
    // Auth Check
    const teamDoc = await adminDb.collection("teams").doc(teamId).get();
    if (!teamDoc.exists || teamDoc.data()?.admin?.userId !== userId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Save OTP first
    await adminDb.collection("deleteTeamOtps").doc(userId).collection("teams").doc(teamId).set({
      otp,
      attempts: 0,
      expiresAt: Date.now() + 5 * 60 * 1000,
    });

    // Send Email
    const { data, error } = await resend.emails.send({
      from: "Kingz Digital Attendance<noreply@kingzdigitalsolutions.in>",
      to: userEmail,
      subject: "Action Required: Confirm Team Deletion",
      // Adding text version improves deliverability (spam filters like it)
      text: `Your OTP for deleting the team is ${otp}. Valid for 5 minutes.`,
      html: `
        <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee;">
          <h2 style="color: #dc2626;">Confirm Deletion</h2>
          <p>You requested to delete your team. Use the following code to confirm:</p>
          <div style="font-size: 24px; font-weight: bold; letter-spacing: 4px; padding: 10px; background: #f4f4f5; display: inline-block;">
            ${otp}
          </div>
          <p style="color: #666; font-size: 12px; margin-top: 20px;">
            This OTP is valid for 5 minutes. If you did not request this, please secure your account.
          </p>
        </div>
      `,
    });

    if (error) {
      console.error("Resend API Error:", error);
      return NextResponse.json({ success: false, error: "Email provider error" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
  }
}