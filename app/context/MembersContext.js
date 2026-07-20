'use client'
import { createContext, useContext, useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "./AuthContext";

const MembersContext = createContext();

export const MembersProvider = ({ children }) => {
  const { user } = useAuth();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.email) {
      // Clear data immediately when authentication is removed.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMembers([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    let unsubscribeMember = null;
    const email = user.email.trim().toLowerCase();

    // A member reads one email mapping and then only their own member document.
    const unsubscribeMapping = onSnapshot(
      doc(db, "allMembers", email),
      (mappingSnapshot) => {
        unsubscribeMember?.();

        if (!mappingSnapshot.exists()) {
          setMembers([]);
          setLoading(false);
          return;
        }

        const { teamId, memberId } = mappingSnapshot.data();
        if (!teamId || memberId !== user.uid) {
          setMembers([]);
          setLoading(false);
          return;
        }

        unsubscribeMember = onSnapshot(
          doc(db, "teams", teamId, "members", memberId),
          (memberSnapshot) => {
            setMembers(memberSnapshot.exists() ? [{
              id: memberSnapshot.id,
              teamId,
              ...memberSnapshot.data(),
            }] : []);
            setLoading(false);
          },
          (error) => {
            console.error("Member document could not be loaded:", error);
            setMembers([]);
            setLoading(false);
          }
        );
      },
      (error) => {
        console.error("Member mapping could not be loaded:", error);
        setMembers([]);
        setLoading(false);
      }
    );

    return () => {
      unsubscribeMapping();
      unsubscribeMember?.();
    };
  }, [user]);

  return (
    <MembersContext.Provider value={{ members, loading }}>
      {children}
    </MembersContext.Provider>
  );
};

export const useMembers = () => useContext(MembersContext);
