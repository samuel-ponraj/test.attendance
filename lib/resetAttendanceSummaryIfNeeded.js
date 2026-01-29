
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { getDateKey } from "@/lib/DateKey";

export const resetAttendanceSummaryIfNeeded = async (teamId) => {
  const todayKey = getDateKey(new Date());
  const teamRef = doc(db, "teams", teamId);
  const snap = await getDoc(teamRef);

  if (!snap.exists()) return;

  const summary = snap.data().attendanceSummary;

  if (!summary || summary.dateKey !== todayKey) {
    await setDoc(
      teamRef,
      {
        attendanceSummary: {
          present: 0,
          absent: 0,
          dateKey: todayKey,
          updatedAt: serverTimestamp(),
        },
      },
      { merge: true }
    );
  }
};
