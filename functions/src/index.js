const { onSchedule } = require("firebase-functions/v2/scheduler");
const admin = require("firebase-admin");

admin.initializeApp();
const db = admin.firestore();

/**
 * Auto cleanup attendance
 * basic → 6 months
 * pro   → 12 months (future)
 */
exports.cleanupOldAttendance = onSchedule(
  {
    schedule: "0 2 * * *", // daily at 2 AM
    timeZone: "Asia/Kolkata",
  },
  async () => {
    const teamsSnap = await db.collection("teams").get();

    if (teamsSnap.empty) {
      console.log("No teams found");
      return;
    }

    const now = new Date();

    for (const teamDoc of teamsSnap.docs) {
      const teamData = teamDoc.data();
      const adminUserId = teamData?.admin?.userId;

      if (!adminUserId) continue;

      const userSnap = await db
        .collection("users")
        .doc(adminUserId)
        .get();

      if (!userSnap.exists) continue;

      const subscription = userSnap.data()?.subscription || "basic";
      const monthsAllowed = subscription === "pro" ? 12 : 6;

      const cutoffDate = new Date(
        now.getFullYear(),
        now.getMonth() - monthsAllowed,
        now.getDate()
      );

      const attendanceSnap = await teamDoc.ref
        .collection("attendance")
        .get();

      if (attendanceSnap.empty) continue;

      let batch = db.batch();
      let opCount = 0;
      let deleted = 0;

      for (const doc of attendanceSnap.docs) {
        const updatedDate = doc.data()?.updatedDate?.toDate?.();
        if (!updatedDate) continue;

        if (updatedDate < cutoffDate) {
          batch.delete(doc.ref);
          opCount++;
          deleted++;

          // 🔥 Firestore batch limit safety
          if (opCount === 450) {
            await batch.commit();
            batch = db.batch();
            opCount = 0;
          }
        }
      }

      if (opCount > 0) {
        await batch.commit();
      }

      if (deleted > 0) {
        console.log(`🧹 Team ${teamDoc.id}: deleted ${deleted} records`);
      }
    }
  }
);
