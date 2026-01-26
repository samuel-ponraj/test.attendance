import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export const fetchTeamAttendance = async (teamId) => {
  try {
    const teamRef = doc(db, "teams", teamId);
    const teamSnap = await getDoc(teamRef);

    if (!teamSnap.exists()) {
      console.log("Team not found");
      return;
    }

    const teamData = teamSnap.data();

    const attendance = teamData.attendance || {};

    return attendance;
  } catch (error) {
    console.error("Error fetching attendance:", error);
  }
};