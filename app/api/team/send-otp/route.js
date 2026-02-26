// /pages/api/team/send-otp.ts
import { NextApiRequest, NextApiResponse } from "next";
import { Resend } from "resend";
import { adminDb } from "@/lib/firebase-admin";

// ---------- Resend Init ----------
if (!process.env.RESEND_API_KEY) {
  console.error("RESEND_API_KEY missing!");
  throw new Error("RESEND_API_KEY is missing in environment variables");
}

const resend = new Resend(process.env.RESEND_API_KEY);

// ---------- API Route ----------
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  try {
    const { teamId, userEmail, userId } = req.body;

    if (!teamId || !userEmail || !userId) {
      return res.status(400).json({ success: false, error: "Missing parameters" });
    }

    // Auth Check: make sure the requester is the team admin
    const teamDoc = await adminDb.collection("teams").doc(teamId).get();
    if (!teamDoc.exists || teamDoc.data()?.admin?.userId !== userId) {
      return res.status(403).json({ success: false, error: "Unauthorized" });
    }

    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Save OTP in Firestore
    await adminDb
      .collection("deleteTeamOtps")
      .doc(userId)
      .collection("teams")
      .doc(teamId)
      .set({
        otp,
        attempts: 0,
        expiresAt: Date.now() + 5 * 60 * 1000, // 5 min
      });

    // Send Email
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
          </div>
        `,
      });
    } catch (err) {
      console.error("Resend send error:", err);
      return res.status(500).json({ success: false, error: "Failed to send email" });
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("API error:", err);
    return res.status(500).json({ success: false, error: "Internal server error" });
  }
}