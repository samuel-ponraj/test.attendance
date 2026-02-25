"use client";

import { useState, useEffect, useRef } from "react";
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
import { auth, db } from "@/lib/firebase";
import {
  EmailAuthProvider,
  GoogleAuthProvider,
  reauthenticateWithCredential,
  reauthenticateWithPopup,
  deleteUser,
  updatePassword,
  onAuthStateChanged
} from "firebase/auth";
import { doc, updateDoc, serverTimestamp, writeBatch, collection , where, getDocs, query } from "firebase/firestore";
import { Label } from "@/components/ui/label";
import { User, Camera } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { updateProfile } from "firebase/auth";
import SubscriptionCard from "../billing/SubscriptionCard";


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

  const fileInputRef = useRef(null);

const [firstName, setFirstName] = useState("");
const [lastName, setLastName] = useState("");
const [avatar, setAvatar] = useState(null);


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
    // 1. Reauthentication Logic
    if (providerId === "password") {
      if (!password) throw new Error("Password is required to delete your account.");
      const credential = EmailAuthProvider.credential(user.email, password);
      await reauthenticateWithCredential(user, credential);
    } else if (providerId === "google.com") {
      const provider = new GoogleAuthProvider();
      await reauthenticateWithPopup(user, provider);
    }

    // 2. Initialize Batch for Atomic Deletion
    const batch = writeBatch(db);

    // Query for all teams where this user is the admin
    const teamsQuery = query(
      collection(db, "teams"),
      where("admin.userId", "==", user.uid)
    );
    const teamsSnapshot = await getDocs(teamsQuery);

    // Add each specific team document to the batch for deletion
    teamsSnapshot.forEach((teamDoc) => {
      batch.delete(teamDoc.ref);
    });

    // Add the specific user document to the batch
    const userRef = doc(db, "users", user.uid);
    batch.delete(userRef);

    // Commit all deletions at once to maintain database integrity
    await batch.commit();

    // 3. Delete the user from Firebase Auth
    // Note: We do this LAST so the user remains authenticated while deleting Firestore data
    await deleteUser(user);

    toast.success("Account and associated teams deleted successfully.");
    router.push("/");
  } catch (err) {
    console.error("Account Deletion Error:", err);
    toast.error(err.message || "Failed to delete account.");
  } finally {
    setLoading(false);
    setModalOpen(false);
    setPassword("");
  }
};

  // Load user data
      useEffect(() => {
        if (!user) return;

        const names = user.displayName?.split(" ") || [];
        setFirstName(names[0] || "");
        setLastName(names.slice(1).join(" ") || "");
        setAvatar(user.photoURL || null);
      }, [user]);

      const getInitials = () =>
        `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();

      const handleAvatarClick = () => fileInputRef.current?.click();



    const uploadToCloudinarySigned = async (file) => {
  if (!user) throw new Error("User not logged in");

  const res = await fetch(`/api/cloudinary-sign?userId=${user.uid}`);
  if (!res.ok) throw new Error("Failed to get signature");

  const { signature, timestamp, public_id } = await res.json();

  const formData = new FormData();
  formData.append("file", file);
  formData.append("api_key", process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY);
  formData.append("timestamp", timestamp);
  formData.append("signature", signature);
  formData.append("public_id", public_id);
  formData.append("overwrite", "true");

  const uploadRes = await fetch(
    `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`,
    { method: "POST", body: formData }
  );

  if (!uploadRes.ok) throw new Error("Upload failed");

  const data = await uploadRes.json();
  return data.secure_url;
};


const handleAvatarChange = async (e) => {
  if (!e.target.files?.[0] || !user) return;

  const file = e.target.files[0];

  if (file.size > 5 * 1024 * 1024) {
    toast.error("Image must be under 5MB");
    return;
  }

  try {
    toast.loading("Uploading image...");

    // Upload with signed function
    const avatarUrl = await uploadToCloudinarySigned(file);

    // Update state for instant preview
    setAvatar(avatarUrl);

    toast.dismiss();
    toast.success("Image uploaded");

    // Immediately update Firebase Auth & Firestore
    await updateProfile(user, { photoURL: avatarUrl });
    await updateDoc(doc(db, "users", user.uid), { photoURL: avatarUrl });
  } catch (err) {
    toast.dismiss();
    console.error(err);
    toast.error("Failed to upload image");
  }
};






const handleSaveProfile = async () => {
  if (!user) return;

  try {
    const displayName = `${firstName} ${lastName}`.trim();

    // Use the latest avatar URL (not state) in updateProfile
    const photoURLToSave = avatar; // avatar already has latest URL after upload

    await updateProfile(user, {
      displayName,
      photoURL: photoURLToSave || undefined,
    });

    // Update Firestore
    await updateDoc(doc(db, "users", user.uid), {
      firstName,
      lastName,
      photoURL: photoURLToSave || "",
      lastLogin: serverTimestamp(),
    });
    setUser(auth.currentUser);

    toast.success("Profile updated successfully ✅");
  } catch (err) {
    console.error(err);
    toast.error("Failed to update profile");
  }
};





  return (
    <div className="p-4 flex flex-col w-full md:w-3/4 gap-4 md:px-6 py-2 ">
      <Toaster richColors position="top-center" />

      <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              <CardTitle>Profile</CardTitle>
            </div>
            <CardDescription>Update your personal information</CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Avatar */}
            <div className="flex items-center gap-6">
              <div className="relative">
                <Avatar className="h-20 w-20 cursor-pointer" onClick={handleAvatarClick}>
                  <AvatarImage src={avatar || undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary text-lg">
                    {getInitials()}
                  </AvatarFallback>
                </Avatar>

                <button
                  onClick={handleAvatarClick}
                  className="absolute bottom-0 right-0 p-1.5 rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  <Camera className="h-3.5 w-3.5" />
                </button>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="hidden"
                />
              </div>

              <div>
                <p className="text-sm font-medium">Profile Picture</p>
                <p className="text-xs text-muted-foreground">
                  Click to upload. Max size 5MB.
                </p>
              </div>
            </div>

            {/* Name */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>First Name</Label>
                <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Last Name</Label>
                <Input value={lastName} onChange={(e) => setLastName(e.target.value)} />
              </div>
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={user?.email || ""} disabled className="bg-muted" />
            </div>

            <Button onClick={handleSaveProfile}>Save Changes</Button>
          </CardContent>
        </Card>

      <SubscriptionCard />
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
                <Trash2 className="h-4 w-4" />
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