"use client";

import { useState, useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { 
  Card, CardContent, CardDescription, CardHeader, CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CreditCard, MessageCircle, Shield, Trash2, Eye, EyeOff, Loader2 } from "lucide-react";
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
import { auth, db, storage } from "@/lib/firebase";
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
import { User, Camera } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { updateProfile } from "firebase/auth";
import {  ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { Switch } from "@/components/ui/switch";

const defaultWhatsappConfig = {
  enabled: false,
  businessAccountId: "",
  phoneNumberId: "",
  accessToken: "",
  hasAccessToken: false,
  templateName: "",
  templateLanguage: "en_US",
};

const defaultRazorpayConfig = {
  enabled: false,
  accountName: "",
  keyId: "",
  keySecret: "",
  hasKeySecret: false,
  webhookAppUrl: "",
  webhookSecret: "",
  hasWebhookSecret: false,
  currency: "INR",
};

const normalizeRazorpayConfig = (config = {}) => ({
  ...defaultRazorpayConfig,
  ...config,
});


const AdminAccount = () => {
  const pathname = usePathname();

  const role = pathname.startsWith("/admin")
  ? "admin"
  : pathname.startsWith("/member")
  ? "member"
  : null;

  const isAdmin = role === "admin";
  const router = useRouter();
  const [user, setUser] = useState(auth.currentUser);
  const [modalOpen, setModalOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const [isResetMode, setIsResetMode] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showWhatsappToken, setShowWhatsappToken] = useState(false);
  const [showRazorpaySecret, setShowRazorpaySecret] = useState(false);
  const [showWebhookSecret, setShowWebhookSecret] = useState(false);
  const [savingWhatsapp, setSavingWhatsapp] = useState(false);
  const [savingRazorpay, setSavingRazorpay] = useState(false);

  const fileInputRef = useRef(null);

const [firstName, setFirstName] = useState("");
const [lastName, setLastName] = useState("");
const [avatar, setAvatar] = useState(null);
const [whatsappConfig, setWhatsappConfig] = useState(defaultWhatsappConfig);
const [razorpayConfig, setRazorpayConfig] = useState(defaultRazorpayConfig);


  // Use useEffect to listen for Auth changes to ensure providerId is caught
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  // Safe check for providerId
  const providerId = user?.providerData[0]?.providerId;

  useEffect(() => {
    const loadIntegrationConfig = async () => {
      if (!isAdmin || !user?.uid) return;

      try {
        const token = await user.getIdToken();
        const res = await fetch("/api/admin/integrations", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Failed to load integration settings");
        }

        setWhatsappConfig({
          ...defaultWhatsappConfig,
          ...(data.whatsappConfig || {}),
        });
        setRazorpayConfig(normalizeRazorpayConfig(data.razorpayConfig));
      } catch (err) {
        console.error("Failed to load integration settings:", err);
        toast.error("Failed to load integration settings");
      }
    };

    loadIntegrationConfig();
  }, [isAdmin, user]);

  const updateWhatsappConfig = (key, value) => {
    setWhatsappConfig((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const updateRazorpayConfig = (key, value) => {
    setRazorpayConfig((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSaveWhatsappIntegration = async () => {
    if (!user?.uid) {
      toast.error("Please sign in again to save integration settings");
      return;
    }

    setSavingWhatsapp(true);

    try {
      const token = await user.getIdToken();
      const cleanWhatsappConfig = {
        enabled: Boolean(whatsappConfig.enabled),
        businessAccountId: whatsappConfig.businessAccountId.trim(),
        phoneNumberId: whatsappConfig.phoneNumberId.trim(),
        accessToken: whatsappConfig.accessToken.trim(),
        templateName: whatsappConfig.templateName.trim(),
        templateLanguage: whatsappConfig.templateLanguage.trim() || "en_US",
      };

      const res = await fetch("/api/admin/integrations", {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "whatsapp",
          config: cleanWhatsappConfig,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to save WhatsApp settings");
      }

      setWhatsappConfig({
        ...defaultWhatsappConfig,
        ...(data.whatsappConfig || {}),
      });

      toast.success("WhatsApp settings saved successfully");
    } catch (err) {
      console.error("WhatsApp settings save error:", err);
      toast.error(err.message || "Failed to save WhatsApp settings");
    } finally {
      setSavingWhatsapp(false);
    }
  };

  const handleSaveRazorpayIntegration = async () => {
    if (!user?.uid) {
      toast.error("Please sign in again to save integration settings");
      return;
    }

    setSavingRazorpay(true);

    try {
      const token = await user.getIdToken();
      const cleanRazorpayConfig = {
        enabled: Boolean(razorpayConfig.enabled),
        accountName: razorpayConfig.accountName.trim(),
        keyId: razorpayConfig.keyId.trim(),
        keySecret: razorpayConfig.keySecret.trim(),
        webhookAppUrl: razorpayConfig.webhookAppUrl.trim(),
        webhookSecret: razorpayConfig.webhookSecret.trim(),
        currency: razorpayConfig.currency.trim() || "INR",
      };

      const res = await fetch("/api/admin/integrations", {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "razorpay",
          config: cleanRazorpayConfig,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to save Razorpay settings");
      }

      setRazorpayConfig(normalizeRazorpayConfig(data.razorpayConfig));

      toast.success("Razorpay settings saved successfully");
    } catch (err) {
      console.error("Razorpay settings save error:", err);
      toast.error(err.message || "Failed to save Razorpay settings");
    } finally {
      setSavingRazorpay(false);
    }
  };

  

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



const handleAvatarChange = async (e) => {
  if (!e.target.files?.[0] || !user) return;

  const file = e.target.files[0];

  if (file.size > 5 * 1024 * 1024) {
    toast.error("Image must be under 5MB");
    return;
  }

  try {

    /* ✅ 1. SHOW LOCAL PREVIEW INSTANTLY */
    const previewURL = URL.createObjectURL(file);
    setAvatar(previewURL);

    toast.loading("Uploading image...");

    /* ✅ 2. UPLOAD TO FIREBASE STORAGE */
    const storageRef = ref(storage, `avatars/${user.uid}`);

    await uploadBytes(storageRef, file);

    /* ✅ 3. GET FINAL IMAGE URL */
    const downloadURL = await getDownloadURL(storageRef);

    /* ✅ 4. UPDATE UI WITH REAL URL */
    setAvatar(downloadURL);

    /* ✅ 5. UPDATE FIREBASE AUTH PROFILE */
    await updateProfile(user, { photoURL: downloadURL });

    /* ✅ 6. UPDATE FIRESTORE */
    await updateDoc(doc(db, "users", user.uid), {
      photoURL: downloadURL,
    });

    toast.dismiss();
    toast.success("Profile image updated ✅");

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

    const photoURLToSave = avatar; 

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
    <div className="flex w-full flex-col gap-4 p-4 py-2 md:px-6">
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

        {isAdmin && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5 text-primary" />
                <CardTitle>WhatsApp Integration</CardTitle>
              </div>
              <CardDescription>
                Configure WhatsApp Cloud API credentials.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-sm font-semibold">WhatsApp Cloud API</h3>
                  <p className="text-xs text-muted-foreground">
                    Used for sending payment links and member notifications.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Label className="text-sm">Enable</Label>
                  <Switch
                    checked={whatsappConfig.enabled}
                    onCheckedChange={(checked) =>
                      updateWhatsappConfig("enabled", checked)
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <div className="space-y-2">
                  <Label>Business Account ID</Label>
                  <Input
                    value={whatsappConfig.businessAccountId}
                    onChange={(e) =>
                      updateWhatsappConfig("businessAccountId", e.target.value)
                    }
                    placeholder="Meta WhatsApp business account ID"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Phone Number ID</Label>
                  <Input
                    value={whatsappConfig.phoneNumberId}
                    onChange={(e) =>
                      updateWhatsappConfig("phoneNumberId", e.target.value)
                    }
                    placeholder="WhatsApp phone number ID"
                  />
                </div>

                <div className="space-y-2 lg:col-span-2">
                  <Label>Access Token</Label>
                  <div className="relative">
                    <Input
                      type={showWhatsappToken ? "text" : "password"}
                      value={whatsappConfig.accessToken}
                      onChange={(e) =>
                        updateWhatsappConfig("accessToken", e.target.value)
                      }
                      placeholder={
                        whatsappConfig.hasAccessToken
                          ? "Saved token. Enter a new token to replace it."
                          : "Permanent access token"
                      }
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowWhatsappToken(!showWhatsappToken)}
                      className="absolute right-3 top-2.5 text-muted-foreground"
                    >
                      {showWhatsappToken ? (
                        <EyeOff size={16} />
                      ) : (
                        <Eye size={16} />
                      )}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Send Payment Link Template Name</Label>
                  <Input
                    value={whatsappConfig.templateName}
                    onChange={(e) =>
                      updateWhatsappConfig("templateName", e.target.value)
                    }
                    placeholder="send_payment_link"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Template Language</Label>
                  <Input
                    value={whatsappConfig.templateLanguage}
                    onChange={(e) =>
                      updateWhatsappConfig("templateLanguage", e.target.value)
                    }
                    placeholder="en_US"
                  />
                </div>
              </div>

              <Button
                onClick={handleSaveWhatsappIntegration}
                disabled={savingWhatsapp || !user?.uid}
                className="w-full sm:w-[170px]"
              >
                {savingWhatsapp ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Save WhatsApp"
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {isAdmin && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-primary" />
                <CardTitle>Razorpay Integration</CardTitle>
              </div>
              <CardDescription>
                Configure Razorpay checkout, payment link, and webhook settings.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-sm font-semibold">Razorpay</h3>
                  <p className="text-xs text-muted-foreground">
                    Used for checkout orders, payment links, and webhooks.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Label className="text-sm">Enable</Label>
                  <Switch
                    checked={razorpayConfig.enabled}
                    onCheckedChange={(checked) =>
                      updateRazorpayConfig("enabled", checked)
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <div className="space-y-2">
                  <Label>Account Name</Label>
                  <Input
                    value={razorpayConfig.accountName}
                    onChange={(e) =>
                      updateRazorpayConfig("accountName", e.target.value)
                    }
                    placeholder="Razorpay account label"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Currency</Label>
                  <Input
                    value={razorpayConfig.currency}
                    onChange={(e) =>
                      updateRazorpayConfig(
                        "currency",
                        e.target.value.toUpperCase(),
                      )
                    }
                    placeholder="INR"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Key ID</Label>
                  <Input
                    value={razorpayConfig.keyId}
                    onChange={(e) =>
                      updateRazorpayConfig("keyId", e.target.value)
                    }
                    placeholder="rzp_live_..."
                  />
                </div>

                <div className="space-y-2">
                  <Label>Key Secret</Label>
                  <div className="relative">
                    <Input
                      type={showRazorpaySecret ? "text" : "password"}
                      value={razorpayConfig.keySecret}
                      onChange={(e) =>
                        updateRazorpayConfig("keySecret", e.target.value)
                      }
                      placeholder={
                        razorpayConfig.hasKeySecret
                          ? "Saved secret. Enter a new secret to replace it."
                          : "Razorpay key secret"
                      }
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setShowRazorpaySecret(!showRazorpaySecret)
                      }
                      className="absolute right-3 top-2.5 text-muted-foreground"
                    >
                      {showRazorpaySecret ? (
                        <EyeOff size={16} />
                      ) : (
                        <Eye size={16} />
                      )}
                    </button>
                  </div>
                </div>

                <div className="space-y-2 lg:col-span-2">
                  <Label>Webhook App URL</Label>
                  <Input
                    value={razorpayConfig.webhookAppUrl}
                    onChange={(e) =>
                      updateRazorpayConfig("webhookAppUrl", e.target.value)
                    }
                    placeholder="https://your-domain.com/api/razorpay/payment-link-webhook"
                  />
                </div>

                <div className="space-y-2 lg:col-span-2">
                  <Label>Webhook Secret</Label>
                  <div className="relative">
                    <Input
                      type={showWebhookSecret ? "text" : "password"}
                      value={razorpayConfig.webhookSecret}
                      onChange={(e) =>
                        updateRazorpayConfig("webhookSecret", e.target.value)
                      }
                      placeholder={
                        razorpayConfig.hasWebhookSecret
                          ? "Saved secret. Enter a new secret to replace it."
                          : "Webhook signing secret"
                      }
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowWebhookSecret(!showWebhookSecret)}
                      className="absolute right-3 top-2.5 text-muted-foreground"
                    >
                      {showWebhookSecret ? (
                        <EyeOff size={16} />
                      ) : (
                        <Eye size={16} />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              <Button
                onClick={handleSaveRazorpayIntegration}
                disabled={savingRazorpay || !user?.uid}
                className="w-full sm:w-[170px]"
              >
                {savingRazorpay ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Save Razorpay"
                )}
              </Button>
            </CardContent>
          </Card>
        )}
        
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

export default AdminAccount;
