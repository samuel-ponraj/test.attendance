"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  Card, CardContent, CardDescription, CardHeader, CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield, Trash2, Eye, EyeOff, Loader2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input"; 
import { toast, Toaster } from "sonner";
import { auth, db } from "@/lib/firebase"; // Assuming db is exported for firestore
import {
  EmailAuthProvider,
  GoogleAuthProvider,
  reauthenticateWithCredential,
  reauthenticateWithPopup,
  deleteUser,
  updatePassword,
  onAuthStateChanged
} from "firebase/auth";
import { doc, deleteDoc } from "firebase/firestore";
import { Label } from "@/components/ui/label";

const MyAccount = () => {
  const router = useRouter();
  const [user, setUser] = useState(auth.currentUser);
  const [modalOpen, setModalOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Use useEffect to listen for Auth changes to ensure providerId is caught
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  // Safe check for providerId
  const providerId = user?.providerData[0]?.providerId;

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

      // 🔐 Re-authenticate
      await reauthenticateWithCredential(user, credential);

      // 🔁 Update password in Firebase Auth
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

  const handleDeleteAccount = async () => {
    if (!user) return;
    setLoading(true);

    try {
      // 1. Reauthentication
      if (providerId === "password") {
        if (!password) throw new Error("Password is required to delete your account.");
        const credential = EmailAuthProvider.credential(user.email, password);
        await reauthenticateWithCredential(user, credential);
      } else if (providerId === "google.com") {
        const provider = new GoogleAuthProvider();
        await reauthenticateWithPopup(user, provider);
      }

      // 2. Delete Firestore data (Optional but recommended)
      await deleteDoc(doc(db, "users", user.uid));

      // 3. Delete the user from Auth
      await deleteUser(user);

      toast.success("Your account has been deleted!");
      router.push("/");
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Failed to delete account.");
    } finally {
      setLoading(false);
      setModalOpen(false);
      setPassword("");
    }
  };

  return (
    <div className="p-4 flex flex-col w-full md:w-1/2 gap-4 md:px-6 py-2">
      <Toaster richColors position="top-center" />

      {/* Logic: Only show for Email/Password users */}
      {providerId === "password" && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              <CardTitle>Change Password</CardTitle>
            </div>
            <CardDescription>
              Update your password to keep your account secure
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
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
              className="w-full sm:w-[150px] flex justify-center items-center"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Update Password"
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-destructive" />
            <CardTitle className="text-destructive">Delete Account</CardTitle>
          </div>
          <CardDescription className="mt-2">
            Permanently delete your account and all data
          </CardDescription>
        </CardHeader>

        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Once you delete your account, there is no going back. All your data, teams, and attendance records will be permanently removed.
          </p>

          <AlertDialog open={modalOpen} onOpenChange={setModalOpen}>
            <AlertDialogTrigger asChild>
              <Button>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Account
              </Button>
            </AlertDialogTrigger>

            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. To proceed, please confirm your identity.
                </AlertDialogDescription>
              </AlertDialogHeader>

              {providerId === "password" && (
                <div className="py-2">
                  <Label className="mb-2 block">Confirm Password</Label>
                  <Input
                    type="password"
                    placeholder="Enter your password to confirm"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full"
                  />
                </div>
              )}

              {providerId === "google.com" && (
                <p className="text-sm text-amber-600 bg-amber-50 p-2 rounded">
                  You will be prompted to sign in with Google again to confirm deletion.
                </p>
              )}

              <AlertDialogFooter className="mt-6">
                <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={(e) => {
                    e.preventDefault();
                    handleDeleteAccount();
                  }}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  disabled={loading}
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Yes, delete my account"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  );
};

export default MyAccount;