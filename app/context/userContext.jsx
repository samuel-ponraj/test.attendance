'use client'

import  { createContext, useContext, useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { doc, onSnapshot, collection } from "firebase/firestore";

const UserContext = createContext(null);

export const UserProvider = ({ children }) => {
  const [userData, setUserData] = useState(null);
  const [teamData, setTeamData] = useState(null);
  const [membersData, setMembersData] = useState([]); 
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const authUnsubscribe = auth.onAuthStateChanged((user) => {
      if (!user) {
        setUserData(null);
        setTeamData(null);
        setMembersData([]);
        setLoading(false);
        return;
      }

      if (user.email) {
        const memberMapRef = doc(db, "allMembers", user.email);

        const unsubMap = onSnapshot(memberMapRef, (mapSnap) => {
          if (mapSnap.exists()) {
            const { memberId, teamId } = mapSnap.data();

            // 🔹 Member Details (current user)
            const unsubMember = onSnapshot(
              doc(db, "teams", teamId, "members", memberId),
              (mSnap) => {
                if (mSnap.exists()) {
                  setUserData({
                    id: mSnap.id,
                    ...mSnap.data(),
                    memberId,
                    teamId,
                    state: "approved",
                  });
                }
              }
            );

            // 🔹 Team Details
            const unsubTeam = onSnapshot(
              doc(db, "teams", teamId),
              (tSnap) => {
                if (tSnap.exists()) {
                  setTeamData({
                    id: tSnap.id, // ✅ important for fetching members
                    ...tSnap.data(),
                  });
                }
              }
            );

            // 🔹 All Team Members (NEW)
            const unsubMembers = onSnapshot(
              collection(db, "teams", teamId, "members"),
              (snapshot) => {
                const membersList = snapshot.docs.map((doc) => ({
                  id: doc.id,
                  ...doc.data(),
                }));

                setMembersData(membersList);
              }
            );

            setLoading(false);

            return () => {
              unsubMember();
              unsubTeam();
              unsubMembers();
            };
          } else {
            setLoading(false);
          }
        });

        return () => unsubMap();
      }
    });

    return () => authUnsubscribe();
  }, []);

  return (
    <UserContext.Provider
      value={{ userData, teamData, membersData, loading }} // ✅ exposed
    >
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext);