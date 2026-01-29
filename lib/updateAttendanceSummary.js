import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { getDateKey } from "@/lib/DateKey";

export const updateAttendanceSummary = async ({
  teamId,
  attendanceMap,
  dateKey,
}) => {
  const todayKey = getDateKey(new Date());


  if (dateKey !== todayKey) {
    return;
  }

  let present = 0;
  let absent = 0;

  Object.values(attendanceMap).forEach((entry) => {
    if (entry.status === "present") present++;
    if (entry.status === "absent") absent++;
  });

  await setDoc(
      doc(db, "teams", teamId),
      {
        attendanceSummary: {
          present,
          absent,
          dateKey: todayKey,
          updatedAt: serverTimestamp(),
        },
      },
      { merge: true }
    );
};
