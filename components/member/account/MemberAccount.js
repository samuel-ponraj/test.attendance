"use client";

import { useState, useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { 
  Card, CardContent, CardDescription, CardHeader, CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield, Eye, EyeOff, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input"; 
import { toast, Toaster } from "sonner";
import { auth } from "@/lib/firebase";
import {
  EmailAuthProvider,
  GoogleAuthProvider,
  reauthenticateWithCredential,
  reauthenticateWithPopup,
  deleteUser,
  updatePassword,
  onAuthStateChanged, sendPasswordResetEmail
} from "firebase/auth";
import { doc, updateDoc, serverTimestamp, writeBatch, collection , where, getDocs, query } from "firebase/firestore";
import { Label } from "@/components/ui/label";


const MemberAccount = () => {
  const pathname = usePathname();

  const [user, setUser] = useState(auth.currentUser);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const [isResetMode, setIsResetMode] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

 

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);


  const handleChangePassword = async () => {
    if (!user) return;

    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error("All fields are required");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      const credential = EmailAuthProvider.credential(user.email, currentPassword);

      await reauthenticateWithCredential(user, credential);

      await updatePassword(user, newPassword);

      toast.success("Password updated successfully 🔐");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      console.error(err);
      toast.error(err.code === "auth/wrong-password" ? "Current password is incorrect" : err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPasswordEmail = async () => {
      if (!user?.email) return;
      setLoading(true);
      try {
        await sendPasswordResetEmail(auth, user.email);
        toast.success("Reset link sent to your email!");
      } catch (err) {
        console.error(err);
        toast.error("Failed to send reset email.");
      } finally {
        setLoading(false);
      }
    };
   
  return (
    <div className="p-4 flex flex-col w-full md:w-3/4 gap-4 md:px-6 py-2 ">
      <Toaster richColors position="top-center" />

      <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              <CardTitle>{isResetMode ? "Reset Password" : "Change Password"}</CardTitle>
            </div>
            <CardDescription>
              {isResetMode 
                ? "We'll send a recovery link to your registered email address" 
                : "Update your password to keep your account secure"}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {!isResetMode ? (
              <>
                {/* Update Password Fields */}
                <div className="space-y-2">
                  <Label>Current Password</Label>
                  <div className="relative">
                    <Input
                      type={showCurrent ? "text" : "password"}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Enter current password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrent(!showCurrent)}
                      className="absolute right-3 top-2.5 text-muted-foreground"
                    >
                      {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>New Password</Label>
                  <div className="relative">
                    <Input
                      type={showNew ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Minimum 6 characters"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNew(!showNew)}
                      className="absolute right-3 top-2.5 text-muted-foreground"
                    >
                      {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Confirm New Password</Label>
                  <div className="relative">
                    <Input
                      type={showConfirm ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repeat new password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute right-3 top-2.5 text-muted-foreground"
                    >
                      {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <Button 
                  onClick={handleChangePassword} 
                  disabled={loading} 
                  className="w-full sm:w-[150px]"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Update Password"}
                </Button>
              </>
            ) : (
              <>
                {/* Reset Password View */}
                <div className="space-y-2">
                  <Label>Email Address</Label>
                  <Input value={user?.email || ""} disabled className="bg-muted" />
                  <p className="text-xs text-muted-foreground">
                    A password reset link will be sent to the email above.
                  </p>
                </div>
                <Button 
                  onClick={handleResetPasswordEmail} 
                  disabled={loading} 
                  className="w-full sm:w-[180px]"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send Reset Link"}
                </Button>
              </>
            )}

            <div className="pt-2 border-t mt-4">
              <button
                type="button"
                onClick={() => setIsResetMode(!isResetMode)}
                className="text-sm text-primary hover:underline"
              >
                {isResetMode ? "Wait, I know my password (Change)" : "Forgot your password? (Reset via Email)"}
              </button>
            </div>
          </CardContent>
        </Card>
    </div>
  );
};

export default MemberAccount;