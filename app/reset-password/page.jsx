'use client';

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { auth } from "@/lib/firebase";
import { confirmPasswordReset, verifyPasswordResetCode } from "firebase/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast, Toaster } from "sonner";
import { Loader2, ShieldCheck } from "lucide-react";

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [newPassword, setNewPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isValidCode, setIsValidCode] = useState(false);
  const [email, setEmail] = useState("");

  const oobCode = searchParams.get("oobCode");

  useEffect(() => {
    if (!oobCode) {
      toast.error("Invalid or expired reset link.");
      router.push("/login");
      return;
    }

    // Verify the code is valid before showing the form
    verifyPasswordResetCode(auth, oobCode)
      .then((userEmail) => {
        setEmail(userEmail);
        setIsValidCode(true);
      })
      .catch(() => {
        toast.error("This link has expired or has already been used.");
        router.push("/login");
      });
  }, [oobCode, router]);

  const handleReset = async (e) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }

    setIsLoading(true);
    try {
      await confirmPasswordReset(auth, oobCode, newPassword);
      toast.success("Password updated! Redirecting to login...");
      setTimeout(() => router.push("/login"), 2000);
    } catch (err) {
      toast.error(err.message || "Failed to reset password.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isValidCode) return <div className="min-h-screen bg-black flex items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>;

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4 text-white">
      <div className="w-full max-w-md bg-gray-900/50 p-8 rounded-2xl border border-gray-800 backdrop-blur-xl">
        <div className="flex justify-center mb-4 text-primary">
            <ShieldCheck size={48} />
        </div>
        <h1 className="text-2xl font-bold text-center mb-2">Reset Your Password</h1>
        <p className="text-gray-400 text-center text-sm mb-6">Resetting password for: <span className="text-white">{email}</span></p>
        
        <form onSubmit={handleReset} className="space-y-4">
          <div className="space-y-2">
            <Label>New Password</Label>
            <Input 
              type="password" 
              placeholder="••••••••" 
              required 
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="bg-gray-800/50 border-gray-700"
            />
          </div>
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? <Loader2 className="animate-spin" /> : "Update Password"}
          </Button>
        </form>
      </div>
    </div>
  );
}