'use client'

import { createContext, useContext, useEffect, useState } from "react";
import { 
  onAuthStateChanged, 
  signOut as firebaseSignOut, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithPopup, 
  GoogleAuthProvider,
  updateProfile // Added to save names
} from "firebase/auth";
import { auth } from "@/lib/firebase";

const AuthContext = createContext({
  user: null,
  loading: true,
  login: () => Promise.resolve(),
  signup: () => Promise.resolve(),
  logout: () => Promise.resolve(),
  signInWithGoogle: () => Promise.resolve(),
});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // onAuthStateChanged returns the unsubscribe function directly
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Login existing user
  const login = (email, password) => {
    return signInWithEmailAndPassword(auth, email, password);
  };

  // Create new user & update profile with names
  // src/context/AuthContext.js

const signup = async (email, password, { firstName, lastName } = {}) => {
  const res = await createUserWithEmailAndPassword(auth, email, password);
  
  // Only try to update profile if names were actually provided
  if (firstName && lastName) {
    await updateProfile(res.user, {
      displayName: `${firstName} ${lastName}`
    });
  }
  
  return res;
};

  const logout = () => firebaseSignOut(auth);

  // src/context/AuthContext.js

const signInWithGoogle = async () => {
  const provider = new GoogleAuthProvider();
  try {
    const result = await signInWithPopup(auth, provider);
    // Return the user object specifically
    return result.user; 
  } catch (error) {
    console.error("Google Popup Error:", error);
    throw error;
  }
};

  return (
    <AuthContext.Provider value={{ user, setUser, login, signup, logout, signInWithGoogle, loading }}>
      {/* Optional: Show a blank screen or spinner while loading to prevent UI flicker */}
      {!loading ? children : <div className="min-h-screen bg-black" />}
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