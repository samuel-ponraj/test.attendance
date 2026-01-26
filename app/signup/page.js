'use client'
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Eye, EyeOff, Loader2 } from "lucide-react";
import { toast, Toaster } from "sonner";
import { useAuth } from "../context/AuthContext";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";

const Signup = () => {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const { signup, signInWithGoogle } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      // Logic: Passing names in the third argument object
      await signup(email, password, { firstName, lastName });
      toast.success("Account created successfully!");
      router.push("/dashboard");
    } catch (err) {
      toast.error(err.message || "Signup failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    try {
      await signInWithGoogle();
      toast.success("Welcome!");
      router.push("/dashboard");
    } catch {
      toast.error("Google sign-in failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4 relative text-white overflow-hidden">
      <Toaster position="top-center" />
      
      <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-black to-black z-0 pointer-events-none" />
      <div className="absolute top-20 right-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl z-0" />
      <div className="absolute bottom-20 left-10 w-96 h-96 bg-primary/5 rounded-full blur-3xl z-0" />

      <div className="w-full max-w-md relative z-10">
        <button
          onClick={() => router.push("/")}
          className="flex items-center gap-2 text-gray-400 hover:text-white mb-4 transition-colors text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to home
        </button>

        <div className="bg-gray-900/50 backdrop-blur-xl rounded-2xl shadow-xl p-8 animate-scale-in border border-gray-800">
          <div className="flex justify-center mb-6">
             <Image src='/logo/KDA-logo-white.png' alt='Logo' width={150} height={100} priority />
          </div>

          <h1 className="text-2xl font-bold text-center mb-2 text-white">Create Account</h1>
          <p className="text-center text-gray-400 mb-4 text-sm">Join us to start managing attendance</p>

          <Button
            type="button"
            variant="outline"
            className="w-full h-11 flex gap-3 justify-center mb-6 border-gray-700 bg-gray-800 text-white hover:bg-gray-700 transition-all"
            onClick={handleGoogleLogin}
            disabled={isLoading}
          >
            <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="w-5 h-5" />
            Continue with Google
          </Button>

          <div className="relative mb-4">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-gray-700" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-[#111] px-2 text-gray-500">Or continue with email</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-gray-300 text-sm">First Name</Label>
                <Input
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="First name"
                  required
                  className="bg-gray-800/50 text-white border-gray-700 focus:border-primary h-11"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-gray-300 text-sm">Last Name</Label>
                <Input
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Last name"
                  required
                  className="bg-gray-800/50 text-white border-gray-700 focus:border-primary h-11"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-gray-300 text-sm">Email</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email Id"
                required
                className="bg-gray-800/50 text-white border-gray-700 focus:border-primary h-11"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-gray-300 text-sm">Password</Label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="pr-10 bg-gray-800/50 text-white border-gray-700 focus:border-primary h-11"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full bg-primary text-white hover:opacity-90 h-11 font-semibold mt-2 transition-all mt-2"
              disabled={isLoading}
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Sign Up"}
            </Button>
          </form>

          <div className="text-center mt-4 text-sm">
            <span className="text-gray-400">Already have an account? </span>
            <Link href="/login" className="text-primary hover:underline font-semibold transition-colors">
              Log in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Signup;