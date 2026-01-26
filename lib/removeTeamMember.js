import { db } from "@/lib/firebase";
import { doc, deleteDoc, updateDoc, increment } from "firebase/firestore";

export const removeTeamMember = async ({
  teamId,
  memberId,
}) => {
  // delete member
  await deleteDoc(doc(db, "teams", teamId, "members", memberId));

  // update totalMembers (outside attendanceSummary)
  await updateDoc(doc(db, "teams", teamId), {
    totalMembers: increment(-1),
  });
};
