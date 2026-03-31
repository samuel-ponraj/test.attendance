'use client'
import { createContext, useContext, useEffect, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "./AuthContext";

const MembersContext = createContext();

export const MembersProvider = ({ children }) => {
  const { user } = useAuth();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.email) return;

    const email = user.email.toLowerCase();

    // 🔥 Listen to allMembers mapping first
    const unsubscribeMapping = onSnapshot(
      collection(db, "allMembers"),
      async (snapshot) => {
        const mappings = snapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter(m => m.email === email);

        if (!mappings.length) {
          setMembers([]);
          setLoading(false);
          return;
        }

        const unsubscribers = [];

        const allMembersData = [];

        mappings.forEach(mapping => {
          const memberRef = collection(
            db,
            "teams",
            mapping.teamId,
            "members"
          );

          const unsubscribeMember = onSnapshot(memberRef, (memberSnap) => {
            memberSnap.docs.forEach(doc => {
              if (doc.id === mapping.memberId) {
                allMembersData.push({
                  id: doc.id,
                  teamId: mapping.teamId,
                  ...doc.data(),
                });
              }
            });

            setMembers([...allMembersData]);
            setLoading(false);
          });

          unsubscribers.push(unsubscribeMember);
        });

        return () => {
          unsubscribers.forEach(unsub => unsub());
        };
      }
    );

    return () => unsubscribeMapping();
  }, [user]);

  return (
    <MembersContext.Provider value={{ members, loading }}>
      {children}
    </MembersContext.Provider>
  );
};

export const useMembers = () => useContext(MembersContext);