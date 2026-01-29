"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { 
  Card, CardContent, CardDescription, CardHeader, CardTitle 
} from "@/components/ui/card";
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input"; // Use your Input component
import { toast, Toaster } from "sonner";
import {
  auth,
  // Ensure auth is imported from your Firebase setup
} from "@/lib/firebase";

import {
  EmailAuthProvider,
  GoogleAuthProvider,
  reauthenticateWithCredential,
  reauthenticateWithPopup,
  deleteUser
} from "firebase/auth";

const MyAccount = () => {
  const router = useRouter();
  const user = auth.currentUser;
  const [modalOpen, setModalOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const providerId = user?.providerData[0]?.providerId;

  const handleDeleteAccount = async () => {
    if (!user) return;

    setLoading(true);

    try {
      // Reauthentication based on provider
      if (providerId === "password") {
        if (!password) throw new Error("Password is required to delete your account.");
        const credential = EmailAuthProvider.credential(user.email, password);
        await reauthenticateWithCredential(user, credential);
      } else if (providerId === "google.com") {
        const provider = new GoogleAuthProvider();
        await reauthenticateWithPopup(user, provider);
      } else {
        throw new Error("Reauthentication for this provider is not supported.");
      }

      // Delete the user
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
    <div className="p-4 md:p-6">
      {/* Toaster: place once in your app */}
      <Toaster richColors position="top-center" />

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
              <Button >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Account
              </Button>
            </AlertDialogTrigger>

            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete your account and remove all your data from our servers.
                </AlertDialogDescription>
              </AlertDialogHeader>

              {/* Show password input only for Email/Password users */}
              {providerId === "password" && (
                <div className="mt-4">
                  <Input
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full"
                  />
                </div>
              )}

              <AlertDialogFooter className="mt-6">
                <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteAccount}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  disabled={loading}
                >
                  {loading ? "Deleting..." : "Yes, delete my account"}
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
