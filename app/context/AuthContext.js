'use client'

import { createContext, useContext, useEffect, useState } from "react";
import { 
  onAuthStateChanged, 
  signOut as firebaseSignOut, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithPopup, 
  GoogleAuthProvider,
  updateProfile 
} from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";

const AuthContext = createContext({
  user: null,
  userData: null,
  loading: true,
  login: () => Promise.resolve(),
  signup: () => Promise.resolve(),
  logout: () => Promise.resolve(),
  signInWithGoogle: () => Promise.resolve(),
});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  const syncSessionCookies = async (firebaseUser) => {
    const token = await firebaseUser.getIdToken();
    const response = await fetch("/api/auth/session", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ token }),
      credentials: "include",
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
        setUser(firebaseUser);

        try {
          const session = await syncSessionCookies(firebaseUser);
          const fullName = firebaseUser.displayName || "";
          const [authFirstName = "", authLastName = ""] = fullName.split(" ");

          if (session.role === "platform") {
            setUserData({
              role: "platform",
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
          console.error("Error fetching user role:", error);
          setUserData({ role: "pending", error: error.message });
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

  const signup = async (email, password, { firstName, lastName } = {}) => {
    const res = await createUserWithEmailAndPassword(auth, email, password);
    if (firstName && lastName) {
      await updateProfile(res.user, {
        displayName: `${firstName} ${lastName}`
      });
    }
    return res;
  };

  const logout = async () => {
    await fetch("/api/auth/session", {
      method: "DELETE",
      credentials: "include",
    });
    await firebaseSignOut(auth);
  };


  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      return result.user; 
    } catch (error) {
      console.error("Google Popup Error:", error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      userData, 
      loading, 
      login, 
      signup, 
      logout, 
      signInWithGoogle 
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
