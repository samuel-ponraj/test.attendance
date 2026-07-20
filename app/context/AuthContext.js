'use client'

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { 
  onAuthStateChanged, 
  signOut as firebaseSignOut, 
  signInWithEmailAndPassword, 
} from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";

const AuthContext = createContext({
  user: null,
  userData: null,
  loading: true,
  login: () => Promise.resolve(),
  logout: () => Promise.resolve(),
});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const sessionSyncControllerRef = useRef(null);
  const loggingOutRef = useRef(false);

  const syncSessionCookies = async (firebaseUser, signal) => {
    const token = await firebaseUser.getIdToken();
    const response = await fetch("/api/auth/session", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ token }),
      credentials: "include",
      signal,
    });

    const session = await response.json();

    if (!response.ok) {
      throw new Error(session.error || "Failed to sync session cookies");
    }

    return session;
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true); 
      if (firebaseUser) {
        if (loggingOutRef.current) return;
        setUser(firebaseUser);

        try {
          const controller = new AbortController();
          sessionSyncControllerRef.current = controller;
          const session = await syncSessionCookies(firebaseUser, controller.signal);

          if (loggingOutRef.current || auth.currentUser?.uid !== firebaseUser.uid) {
            return;
          }
          const fullName = firebaseUser.displayName || "";
          const [authFirstName = "", authLastName = ""] = fullName.split(" ");

          if (session.role === "bos") {
            setUserData({
              role: "bos",
              firstName: authFirstName,
              lastName: authLastName,
              email: firebaseUser.email,
            });
            setLoading(false);
            return;
          }

          const adminRef = doc(db, "users", firebaseUser.uid);
          const adminSnap = await getDoc(adminRef);

          if (adminSnap.exists()) {
            const data = adminSnap.data();
            setUserData({ 
              ...adminSnap.data(), 
              role: 'admin', 
              firstName: data.firstName || authFirstName,
              lastName: data.lastName || authLastName });
          } else {
            const memberRef = doc(
              db,
              "allMembers",
              firebaseUser.email?.toLowerCase()
            );
            const memberSnap = await getDoc(memberRef);
            
            if (memberSnap.exists()) {
              const data = memberSnap.data(); 
              setUserData({ 
                ...memberSnap.data(), 
                role: 'member', 
                firstName: data.firstName || authFirstName,
                lastName: data.lastName || authLastName  });
            } else {
              setUserData({ role: 'pending' }); 
            }
          }
        } catch (error) {
          if (loggingOutRef.current) return;
          if (error.name === "AbortError") return;
          console.error("Error fetching user role:", error);
          setUserData({ role: "pending", error: error.message });
        } finally {
          sessionSyncControllerRef.current = null;
        }
      } else {
        setUser(null);
        setUserData(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = (email, password) => {
    return signInWithEmailAndPassword(auth, email, password);
  };

  const logout = async () => {
    loggingOutRef.current = true;
    sessionSyncControllerRef.current?.abort();

    await firebaseSignOut(auth);

    const response = await fetch("/api/auth/session", {
      method: "DELETE",
      credentials: "include",
    });

    if (!response.ok) {
      loggingOutRef.current = false;
      throw new Error("Failed to clear session");
    }

    setUser(null);
    setUserData(null);
    setLoading(false);
    loggingOutRef.current = false;
  };


  return (
    <AuthContext.Provider value={{ 
      user, 
      userData, 
      loading, 
      login, 
      logout,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
