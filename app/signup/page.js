'use client'
import { useState, Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Eye, EyeOff, Loader2 } from "lucide-react";
import { toast, Toaster } from "sonner";
import { useAuth } from "../context/AuthContext";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { auth, db } from "@/lib/firebase";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { doc, setDoc, serverTimestamp, getDoc, addDoc, collection } from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";

function SignupForm() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const searchParams = useSearchParams();
  const inviteId = searchParams.get("inviteId");

  const functions = getFunctions();
  const { signInWithGoogle } = useAuth();
  const router = useRouter();

  const signup = async (email, password, { firstName, lastName }) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    if (!user) throw new Error("User creation failed");
    await updateProfile(user, { 
      displayName: `${firstName} ${lastName}`.trim() 
    });
    return user;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const user = await signup(email, password, { firstName, lastName });

      if (inviteId) {
        const memberRef = doc(db, "allMembers", email.toLowerCase());
        const memberSnap = await getDoc(memberRef);

        if (memberSnap.exists()) {
          toast.error("Member already exists. Please login.");
          router.push("/login");
          return;
        }

        const inviteRef = doc(db, "invites", inviteId);
        const inviteSnap = await getDoc(inviteRef);

        if (!inviteSnap.exists()) {
          toast.error("Invalid or expired invite link");
          return;
        }

        const { teamId, teamName } = inviteSnap.data();
        const acceptInvite = httpsCallable(functions, "acceptInvite");
        await acceptInvite({
          inviteId,
          phone: null,
          firstName,
          lastName,
        });

        if (teamId) {
          await addDoc(collection(db, "notifications"), {
            title: "New Member Joined",
            message: `${firstName} ${lastName} joined "${teamName}" via invite link`,
            type: "member_join",
            createdAt: serverTimestamp(),
            teamId,
            read: false
          });
        }

        toast.success("Application submitted for approval!");
        router.push("/application-submitted");
      } else {
        const userRef = doc(db, "users", user.uid);
        await setDoc(userRef, {
          id: user.uid,
          firstName,
          lastName,
          email,
          provider: "email",
          createdAt: serverTimestamp(),
          lastLogin: serverTimestamp(),
          role: "admin", 
          photoURL: user.photoURL || null,
          teamCount: 0,
          memberCount: 0,
          subscription: "basic",
        });

        await addDoc(collection(db, "notifications"), {
          title: "Welcome!",
          message: "Welcome to the platform",
          userId: user.uid,
          createdAt: serverTimestamp(),
          read: false,
          type: "welcome"
        });

        toast.success("Account created successfully!");
        router.push("/admin");
      }
    } catch (err) {
      if (err.code === "auth/email-already-in-use") {
        toast.error("Email already exists. Please log in.");
      } else {
        toast.error(err.message || "Signup failed");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    try {
      const user = await signInWithGoogle();
      const userRef = doc(db, "users", user.uid);
      const docSnap = await getDoc(userRef);

      if (docSnap.exists()) {
        await setDoc(userRef, { lastLogin: serverTimestamp() }, { merge: true });
        router.push("/admin");
        return;
      }

      if (inviteId) {
        // FIX: Use user.email from Google, not the empty state 'email'
        const memberRef = doc(db, "allMembers", user.email.toLowerCase());
        const memberSnap = await getDoc(memberRef);

        if (memberSnap.exists()) {
          toast.error("Member already exists. Please login.");
          router.push("/login");
          return;
        }

        const acceptInvite = httpsCallable(functions, "acceptInvite");
        await acceptInvite({
          inviteId,
          phone: null,
          firstName: user.displayName?.split(" ")[0] || "",
          lastName: user.displayName?.split(" ")[1] || "",
        });
        router.push("/application-submitted");
      } else {
        await setDoc(userRef, {
          id: user.uid,
          firstName: user.displayName?.split(" ")[0] || "",
          lastName: user.displayName?.split(" ")[1] || "",
          email: user.email,
          provider: "google",
          createdAt: serverTimestamp(),
          lastLogin: serverTimestamp(),
          role: "admin", 
          photoURL: user.photoURL || null,
          teamCount: 0,
          memberCount: 0,
          subscription: "basic",
        });
        router.push("/admin");
      }
    } catch (err) {
      toast.error("Google sign-in failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-start pt-20 sm:items-start sm:mt-0 justify-center p-4 relative text-white overflow-hidden">
      <Toaster richColors position="top-center" />

      {/* Decorative Backgrounds */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-black to-black z-0 pointer-events-none" />
      <div className="absolute top-16 right-6 w-56 h-56 bg-primary/10 rounded-full blur-3xl z-0" />
      <div className="absolute bottom-16 left-6 w-80 h-80 bg-primary/5 rounded-full blur-3xl z-0" />

      <div className="w-full sm:max-w-full md:max-w-sm lg:max-w-[400px] relative z-10">
        <button
          onClick={() => router.push("/")}
          className="flex items-center gap-2 text-gray-400 hover:text-white mb-3 transition-colors text-s"
        >
          <ArrowLeft className="w-3 h-3" />
          Back to home
        </button>

        <div className="bg-gray-900/50 backdrop-blur-xl rounded-xl shadow-xl p-6 animate-scale-in border border-gray-800">
          <div className="flex justify-center mb-4">
            <Image src="/logo/KDA-logo-white.png" alt="Logo" width={120} height={80} priority />
          </div>

          <h1 className="text-xl font-bold text-center mb-1 text-white">Create Account</h1>
          <p className="text-center text-gray-400 mb-3 text-xs">Join us to start managing attendance</p>

          <Button
            type="button"
            variant="outline"
            className="w-full h-10 flex gap-2 justify-center mb-4 border-gray-700 bg-gray-800 text-white hover:bg-gray-700 transition-all text-sm"
            onClick={handleGoogleLogin}
            disabled={isLoading}
          >
            <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="w-4 h-4" />
            Continue with Google
          </Button>

          <div className="relative mb-3">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-gray-700" />
            </div>
            <div className="relative flex justify-center text-[10px] uppercase">
              <span className="bg-[#080C14] px-2 text-gray-500">Or continue with email</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-gray-300 text-xs">First Name</Label>
                <Input
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="First name"
                  required
                  className="bg-gray-800/50 text-white border-gray-700 focus:border-primary h-9 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-gray-300 text-xs">Last Name</Label>
                <Input
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Last name"
                  required
                  className="bg-gray-800/50 text-white border-gray-700 focus:border-primary h-9 text-sm"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-gray-300 text-xs">Email</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email Id"
                required
                className="bg-gray-800/50 text-white border-gray-700 focus:border-primary h-9 text-sm"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-gray-300 text-xs">Password</Label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="pr-9 bg-gray-800/50 text-white border-gray-700 focus:border-primary h-9 text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                >
                  {showPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full bg-primary text-white hover:opacity-90 h-10 font-semibold text-sm mt-1 transition-all"
              disabled={isLoading}
            >
              {isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : "Sign Up"}
            </Button>
          </form>

          <div className="text-center mt-3 text-xs">
            <span className="text-gray-400">Already have an account? </span>
            <Link href="/login" className="text-primary hover:underline font-semibold transition-colors text-xs">
              Log in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    }>
      <SignupForm />
    </Suspense>
  );
}