'use client'

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from "@/components/ui/alert-dialog";
import { toast, Toaster } from "sonner";
import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { EmailAuthProvider, reauthenticateWithCredential, deleteUser } from "firebase/auth";

const MyAccount = () => {
  const [modalOpen, setModalOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleDeleteAccount = async () => {
    if (!auth.currentUser) {
      toast.error("No user is logged in.", { duration: 5000 });
      return;
    }

    try {
      setLoading(true);
      const user = auth.currentUser;

      if (!user.email) throw new Error("User email not found");
      if (!password) throw new Error("Password is required to delete your account.");

      // Reauthenticate user
      const credential = EmailAuthProvider.credential(user.email, password);
      await reauthenticateWithCredential(user, credential);

      // Delete user
      await deleteUser(user);

      toast.success("Your account has been deleted!", { duration: 5000 });

      // Redirect to homepage
      router.push("/");
    } catch (error) {
      toast.error(error.message || "Failed to delete account", { duration: 5000 });
      console.error("Delete account error:", error);
    } finally {
      setLoading(false);
      setModalOpen(false);
      setPassword("");
    }
  };

  return (
    <div className="p-4 md:p-6">
      <Toaster richColors position="top-center" />

      <Card >
        <CardHeader>
          <div className="flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-destructive" />
            <CardTitle className="text-destructive">Delete Account</CardTitle>
          </div>
          <CardDescription className="mt-2">
            Permanently delete your account and all data.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <p className="text-sm text-muted-foreground mb-6">
            Once you delete your account, there is no going back. All your data, teams, and attendance records will be permanently removed.
          </p>

          <AlertDialog open={modalOpen} onOpenChange={setModalOpen}>
            <AlertDialogTrigger asChild>
              <Button disabled={loading}>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Account
              </Button>
            </AlertDialogTrigger>

            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Confirm Account Deletion</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. Please enter your password to confirm account deletion.
                </AlertDialogDescription>
              </AlertDialogHeader>

              <div className="mt-4">
                <input
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-md border px-3 py-2 mt-2"
                />
              </div>

              <AlertDialogFooter className="mt-4">
                <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteAccount}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  disabled={loading || !password}
                >
                  Yes, delete my account
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
