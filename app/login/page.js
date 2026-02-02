'use client'
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast, Toaster } from "sonner";
import { useAuth } from "../context/AuthContext";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { auth, db } from "@/lib/firebase";
import { sendPasswordResetEmail } from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const { login, signInWithGoogle } = useAuth();
  const router = useRouter();

 
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await login(email, password);
      toast.success("Welcome back!");
      router.push("/dashboard");
    } catch (err) {
      toast.error(
        err.code === "auth/wrong-password" || err.code === "auth/invalid-credential"
          ? "Invalid email or password"
          : "Login failed"
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Google login
  const handleGoogleLogin = async () => {
  setIsLoading(true);
  try {
    const user = await signInWithGoogle();

    // Now user.uid will exist because we fixed the Context return
    if (!user?.uid) {
      throw new Error("User information could not be retrieved.");
    }

    const userRef = doc(db, "users", user.uid);
    const docSnap = await getDoc(userRef);

    if (!docSnap.exists()) {
      // Create the document if it's a new user
      await setDoc(userRef, {
        id: user.uid,
        firstName: user.displayName?.split(" ")[0] || "User",
        lastName: user.displayName?.split(" ")[1] || "",
        email: user.email,
        provider: "google",
        createdAt: serverTimestamp(),
        lastLogin: serverTimestamp(),
        photoURL: user.photoURL || null,
        subscription: "basic"
      });
    } else {
      // Update last login for existing user
      await setDoc(userRef, { lastLogin: serverTimestamp() }, { merge: true });
    }

    toast.success("Welcome!");
    
    // Use setTimeout to ensure state is settled before navigating
    setTimeout(() => {
      router.push("/dashboard");
    }, 100);

  } catch (err) {
    console.error("Google Login Error:", err);
    toast.error(err.message || "Google sign-in failed");
  } finally {
    setIsLoading(false);
  }
};

  // Handle forgot password
  // Handle forgot password
  const handleForgotPassword = async () => {
    if (!email) {
      toast.error("Please enter your email address first");
      return;
    }

    setIsLoading(true);
    try {
      // Note: For security, Firebase sometimes won't tell you if an email 
      // exists or not to prevent "email enumeration" attacks.
      await sendPasswordResetEmail(auth, email);
      toast.success("Reset link sent! Check your inbox.");
    } catch (err) {
      console.error("Reset Error:", err);
      // Handle specific Firebase Auth errors
      if (err.code === "auth/user-not-found") {
        toast.error("No account found with this email.");
      } else if (err.code === "auth/invalid-email") {
        toast.error("Please enter a valid email address.");
      } else {
        toast.error("Failed to send reset email. Try again later.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="
          min-h-screen bg-black flex
          items-start pt-20
          sm:items-start sm:mt-0
          justify-center p-4
          relative text-white overflow-hidden
        ">
      <Toaster richColors position="top-center" />

      {/* Background Orbs */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-black to-black z-0 pointer-events-none" />
      <div className="absolute top-20 right-10 w-64 h-64 bg-primary/10 rounded-full blur-3xl z-0" />
      <div className="absolute bottom-20 left-10 w-80 h-80 bg-primary/5 rounded-full blur-3xl z-0" />

      <div className="w-full sm:max-w-full md:max-w-sm lg:max-w-[380px] relative z-10">

        <button
          onClick={() => router.push("/")}
          className="flex items-center gap-2 text-gray-400 hover:text-white mb-3 transition-colors text-s"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to home
        </button>

        <div className="bg-gray-900/50 backdrop-blur-xl rounded-2xl shadow-xl p-6 animate-scale-in border border-gray-800">
          <div className="flex justify-center mb-4">
            <Image
              src="/logo/KDA-logo-white.png"
              alt="KDS Logo"
              width={150}
              height={80}
              priority
            />
          </div>

          <h1 className="text-xl font-bold text-center mb-1 text-white">
            Welcome Back
          </h1>
          <p className="text-center text-gray-400 mb-3 text-xs">
            Sign in to manage attendance
          </p>

          <Button
            type="button"
            variant="outline"
            className="w-full h-10 flex gap-2 justify-center mb-4 border-gray-700 bg-gray-800 text-white hover:bg-gray-700 transition-all"
            onClick={handleGoogleLogin}
            disabled={isLoading}
          >
            <img
              src="https://www.svgrepo.com/show/475656/google-color.svg"
              alt="Google"
              className="w-4 h-4"
            />
            Continue with Google
          </Button>

          <div className="relative mb-3">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-gray-700" />
            </div>
            <div className="relative flex justify-center text-[11px] uppercase">
              <span className="bg-[#080C14] px-2 text-gray-500">
                Or continue with email
              </span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-gray-300 text-xs">Email</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email Id"
                required
                className="bg-gray-800/50 text-white border-gray-700 focus:border-primary focus:ring-primary h-10"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-gray-300 text-xs">Password</Label>
              <Input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="bg-gray-800/50 text-white border-gray-700 focus:border-primary focus:ring-primary h-10"
              />

              <div className="flex justify-between items-center text-[11px] mt-1">
                <label className="flex items-center gap-1">
                  <input
                    type="checkbox"
                    checked={showPassword}
                    onChange={() => setShowPassword(!showPassword)}
                    className="w-3 h-3 accent-primary"
                  />
                  Show password
                </label>

                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="hover:underline font-medium"
                >
                  Forgot password?
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full bg-primary text-white hover:opacity-90 h-10 font-semibold transition-all mt-2"
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Sign In"
              )}
            </Button>
          </form>

          <div className="text-center mt-3 text-xs">
            <span className="text-gray-400">Don’t have an account? </span>
            <Link
              href="/signup"
              className="text-primary hover:underline font-semibold transition-colors"
            >
              Sign up
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
