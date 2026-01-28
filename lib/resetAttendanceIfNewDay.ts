import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { getDateKey } from "@/lib/DateKey";

export const resetAttendanceIfNewDay = async ({
  teamId,
  userId,
}: {
  teamId: string;
  userId: string;
}) => {
  const todayKey = getDateKey(new Date());
  const teamRef = doc(db, "teams", teamId);
  const snap = await getDoc(teamRef);

  if (!snap.exists()) return;

  const data = snap.data();

  // 🔒 Ensure only admin can reset
  if (data.admin?.userId !== userId) return;

  const summary = data.attendanceSummary;

  if (summary?.lastUpdatedDate !== todayKey) {
    await setDoc(
      teamRef,
      {
        attendanceSummary: {
          present: 0,
          absent: 0,
          lastUpdatedDate: todayKey,
          updatedAt: serverTimestamp(),
        },
      },
      { merge: true }
    );
  }
};
