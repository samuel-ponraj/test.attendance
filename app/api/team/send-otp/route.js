import { Resend } from "resend";
import { adminDb } from "@/lib/firebase-admin";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req) {
  try {
    const { teamId, userEmail, userId } = await req.json();

    // 1. Check Team/Admin Permissions
    const teamDoc = await adminDb.collection("teams").doc(teamId).get();
    
    if (!teamDoc.exists || teamDoc.data()?.admin?.userId !== userId) {
      return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), { status: 403 });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // 2. Save OTP to Firestore
    await adminDb.collection("deleteTeamOtps").doc(userId).collection("teams").doc(teamId).set({
      otp,
      attempts: 0,
      expiresAt: Date.now() + 5 * 60 * 1000,
    });

    // 3. Send Email via Resend
    try {
      await resend.emails.send({
        from: "Kingz Digital Solutions <noreply@kingzdigitalsolutions.in>",
        to: userEmail,
        subject: "Action Required: Confirm Team Deletion",
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
          </div>`,
      });

      return new Response(JSON.stringify({ success: true }), { status: 200 });
      
    } catch (emailErr) {
      console.error("RESEND_ERROR:", emailErr);
      return new Response(JSON.stringify({ success: false, error: "Failed to send email" }), { status: 500 });
    }

  } catch (err) {
    console.error("OUTER_FUNCTION_ERROR:", {
      message: err.message,
      env_check: {
        hasProjectId: !!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        hasEmail: !!process.env.FIREBASE_CLIENT_EMAIL,
        hasKey: !!process.env.FIREBASE_PRIVATE_KEY,
        hasResend: !!process.env.RESEND_API_KEY
      }
    });
    
    return new Response(JSON.stringify({ success: false, error: "Internal Server Error" }), { status: 500 });
  }
}