'use client'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Phone, Mail, Users, Clock, Calendar, User, Camera } from "lucide-react";
import { useMembers } from "../../../app/context/MembersContext";
import { doc, getDoc, updateDoc, onSnapshot } from "firebase/firestore";
import { db, storage } from "@/lib/firebase";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { getAuth, updateProfile } from "firebase/auth";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

const MemberProfileDesktop = () => {
  const auth = getAuth();
  const DAYS_MAP = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const formatWorkingDays = (daysArray) => {
    if (!daysArray || !daysArray.length) return "None";
    return daysArray.map(day => DAYS_MAP[day]).join(", ");
  };

  const { members } = useMembers();
  const [memberTeams, setMemberTeams] = useState([]);
  const [formData, setFormData] = useState({});
  const [customValues, setCustomValues] = useState({});
  const [forms, setForms] = useState([]);
  const [isUpdating, setIsUpdating] = useState(false);

  const fetchCustomForms = async (formIds = []) => {
    if (!formIds.length) {
      setForms([]);
      return;
    }

    const formSnaps = await Promise.all(
      formIds.map((id) => getDoc(doc(db, "customForms", id)))
    );

    setForms(
      formSnaps
        .filter((snap) => snap.exists())
        .map((snap) => ({
          id: snap.id,
          title: snap.data().title || "Custom Form",
          fields: snap.data().customFields || [],
        }))
    );
  };

  // REAL-TIME SYNC
  useEffect(() => {
    if (!members.length) return;

    const unsubs = members.map((member) => {
      if (!member.teamId) return null;
      
      const teamRef = doc(db, "teams", member.teamId);
      return onSnapshot(teamRef, (teamSnap) => {
        if (teamSnap.exists()) {
          const teamData = { id: teamSnap.id, ...teamSnap.data() };
          
          setMemberTeams(prev => {
            const filtered = prev.filter(item => item.member.id !== member.id);
            return [...filtered, { member, team: teamData }];
          });

          // Only initialize form fields if they are currently empty
          if (!formData.firstName) {
            setFormData({
              firstName: member.firstName || "",
              lastName: member.lastName || "",
              contact: member.contact || "",
            });
            setCustomValues(member.customData || {});
          }

          fetchCustomForms(teamData.customForms || []);
        }
      });
    });

    return () => unsubs.forEach(unsub => unsub && unsub());
  }, [members, formData.firstName]);

 
 
  const handleImageUpload = async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  if (!file.type.startsWith("image/")) {
    toast.error("Please upload an image file");
    return;
  }

  try {
    setIsUpdating(true);
    const toastId = toast.loading("Uploading image...");

    const fileExtension = file.name.split(".").pop();

    const user = auth.currentUser;
    const storagePath = `avatars/${member.email.toLowerCase()}_${Date.now()}.${fileExtension}`;
    const storageRef = ref(storage, storagePath);

    const snapshot = await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(snapshot.ref);

    if (user) {
      await updateProfile(user, {
        photoURL: downloadURL,
      });
    }

    const allMemberRef = doc(db, "allMembers", member.email.toLowerCase());
    const allMemberSnap = await getDoc(allMemberRef);
    
    if (allMemberSnap.exists()) {
      const { teamId, memberId } = allMemberSnap.data();
      const memberRef = doc(db, "teams", teamId, "members", memberId);
      
      const updateData = {
        profileURL: downloadURL,
        updatedAt: new Date(),
      };

      await Promise.all([
        updateDoc(memberRef, updateData),
        updateDoc(allMemberRef, updateData) 
      ]);

      setMemberTeams(prev => prev.map(item => 
        item.member.id === member.id 
          ? { ...item, member: { ...item.member, profileURL: downloadURL } }
          : item
      ));
      
      toast.success("Profile picture updated", { id: toastId });
    }
  } catch (error) {
    console.error(error);
    toast.error("Failed to upload image");
  } finally {
    setIsUpdating(false);
  }
};

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleCustomChange = (fieldId, value) => {
    setCustomValues(prev => ({ ...prev, [fieldId]: value }));
  };

  const handleUpdate = async (email) => {
  try {
    setIsUpdating(true);

	const progress = calculateProgress();
    const isProfileComplete = progress === 100;

    const allMemberRef = doc(db, "allMembers", email);
    const allMemberSnap = await getDoc(allMemberRef);

    if (!allMemberSnap.exists()) throw new Error("Member mapping not found");

    const { teamId, memberId } = allMemberSnap.data();
    const memberRef = doc(db, "teams", teamId, "members", memberId);

    const updatePayload = {
      firstName: formData.firstName.trim(),
      lastName: formData.lastName.trim(),
      contact: formData.contact.trim(),
      customData: customValues || {},
      profileCompleted: isProfileComplete,
      profileCompletion: progress,
      updatedAt: new Date(),
    };

    await updateDoc(memberRef, updatePayload);

    await updateDoc(allMemberRef, { 
      profileCompleted: isProfileComplete,
      profileCompletion: progress,
      updatedAt: new Date() 
    });

    const user = auth.currentUser;
    if (user) {
      await updateProfile(user, {
        displayName: `${formData.firstName} ${formData.lastName}`,
      });
    }

    if (isProfileComplete) {
		toast.success("Profile fully updated and completed!");
		} else {
		toast.warning(`Profile saved (${progress}% complete)`);
		}

  } catch (error) {
    console.error(error);
    toast.error("Failed to update profile");
  } finally {
    setIsUpdating(false);
  }
};

  // EXTRACT DATA FOR RENDERING (Prevents Doubling)
  const primaryData = memberTeams[0] || { member: {}, team: {} };
  const { member, team } = primaryData;

      const calculateProgress = () => {
      const basicFields = [
        formData.firstName,
        formData.lastName,
        formData.contact
      ];

      const customFields = forms.flatMap((form) => form.fields || []);

      const totalFields = basicFields.length + customFields.length;
      if (totalFields === 0) return 0;

      let completed = 0;

      // Basic fields
      basicFields.forEach(val => {
        if (val && val.trim() !== "") completed++;
      });

      // Custom fields
      customFields.forEach(field => {
        const val = customValues[field.id];
        if (val && (typeof val === "string" ? val.trim() !== "" : true)) {
          completed++;
        }
      });

      return Math.round((completed / totalFields) * 100);
    } ;

    const progress = calculateProgress();

    const getProgressColor = () => {
      if (progress === 100) return "bg-emerald-500";
      if (progress < 50) return "bg-red-500";
      if (progress < 75) return "bg-orange-500";
      return "bg-indigo-500";
    };

    const getProgressTextColor = () => {
      if (progress === 100) return "text-emerald-500";
      if (progress < 50) return "text-red-500";
      if (progress < 75) return "text-orange-500";
      return "text-indigo-400";
    };

  return (
    <>
      <div className="min-h-screen text-white mx-4">
        <div key={member.id || 'profile'} className="space-y-6">

          {/* NAME CARD */}
          <CardContent className="px-4 sm:px-6 py-4 flex flex-col md:flex-row items-center md:justify-between gap-6 text-center md:text-left">
            <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
              {/* Avatar - stays centered on mobile, shifts left on sm */}
              <div className="flex flex-col items-center md:items-start gap-2">
            <div className="relative group">
              {/* The label now wraps everything to make the whole component an input */}
              <label 
                htmlFor="avatar-upload" 
                className={`relative block cursor-pointer transition-transform active:scale-95 ${isUpdating ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                {/* Avatar Circle */}
                <Avatar className="w-20 h-20  shrink-0 overflow-hidden">
                  <AvatarImage src={member.profileURL || ""} className="object-cover" />
                  <AvatarFallback className="bg-gray-800 text-3xl">👤</AvatarFallback>
                </Avatar>

                {/* Red Camera Button Overlay */}
                <div className="absolute bottom-0 right-0 bg-red-700 p-1.5 rounded-full border-2 shadow-lg group-hover:bg-red-600 transition-colors">
                  <Camera className="w-4 h-4 text-white" />
                </div>

                {/* Hidden Input Field */}
                <input 
                  id="avatar-upload"
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  onChange={handleImageUpload}
                  disabled={isUpdating}
                />
              </label>
            </div>
          </div>

    <div className="flex flex-col items-center md:items-start">
      {/* Name - text size adjusts for smaller screens */}
      <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
        {member.firstName} {member.lastName}
      </h1>

      {/* Contact Info - Col on mobile, Row on sm+ */}
      <div className="flex flex-col sm:flex-row flex-wrap items-center md:items-start gap-3 sm:gap-6 mt-2 text-gray-400 text-sm">
        {member.contact && (
          <span className="flex items-center gap-2">
            <Phone className="w-4 h-4 text-primary shrink-0" />
            <span className="break-all">{member.contact}</span>
          </span>
        )}
        <span className="flex items-center gap-2">
          <Mail className="w-4 h-4 text-primary shrink-0" />
          <span className="break-all">{member.email}</span>
        </span>
      </div>
    </div>
  </div>

  {/* Status Message - centered on mobile, right-aligned on md */}
			<p className={`text-sm font-medium px-3 py-1 rounded-full border transition-colors ${
			progress === 100
				? "text-emerald-500 bg-emerald-500/10 border-emerald-500/20"
				: progress < 50
				? "text-red-500 bg-red-500/10 border-red-500/20"
				: progress < 75
				? "text-orange-500 bg-orange-500/10 border-orange-500/20"
				: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20"
			}`}>
			{progress === 100
				? "Profile complete"
				: `Profile ${progress}% complete`}
			</p>
</CardContent>

        <div className="w-full space-y-2 mb-6">
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-400 font-medium">Profile Completion</span>
            <span className={`${getProgressTextColor()} font-bold`}>
              {progress}%
            </span>
          </div>

          <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden border border-gray-700">
            <div 
              className={`h-full transition-all duration-500 ease-out ${getProgressColor()}`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

          {/* MAIN GRID */}
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Team Details */}
              <Card>
                <CardHeader className="flex flex-row items-center gap-3">
                  <Users className="w-5 h-5 text-blue-400" />
                  <CardTitle className="text-lg font-semibold">Team Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 pt-4 border-t">
                  <div>
                    <p className="text-xs text-gray-500 uppercase">Team Name</p>
                    <p className="font-medium">{team?.name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase">Owner</p>
                    <p className="font-medium">{team?.ownerName}</p>
                  </div>
                </CardContent>
              </Card>

              {/* Shift Details */}
              <Card>
                <CardHeader className="flex flex-row items-center gap-3">
                  <Clock className="w-5 h-5 text-purple-400" />
                  <CardTitle className="text-lg font-semibold">Shift Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 pt-4 border-t">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Start</span>
                    <span className="font-bold">{team?.schedule?.shiftStartTime}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">End</span>
                    <span className="font-bold">{team?.schedule?.shiftEndTime}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Schedule */}
              <Card>
                <CardHeader className="flex flex-row items-center gap-3">
                  <Calendar className="w-5 h-5 text-indigo-400" />
                  <CardTitle className="text-lg font-semibold">Schedule</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 pt-4 border-t text-sm">
                  <p className="text-primary font-medium">{formatWorkingDays(team?.schedule?.workingDays)}</p>
                  <div className="pt-2 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Grace Time</span>
                      <span>{team?.schedule?.graceMinutes}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Break Time</span>
                      <span>{team?.schedule?.breakDurationMinutes}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* PROFILE FORM */}
            <Card className="w-full">
              <CardHeader className="flex justify-between items-center border-b  pb-4">
                <div className="flex items-center gap-3">
                  <User className="w-5 h-5 text-emerald-400" />
                  <CardTitle>Personal Information</CardTitle>
                </div>
                <Button 
                  onClick={() => handleUpdate(member.email?.toLowerCase(), member, team)} 
                  disabled={isUpdating}
                >
                  {isUpdating ? "Updating..." : "Update Profile"}
                </Button>
              </CardHeader>

              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-gray-400">First Name</Label>
                    <Input
                      value={formData.firstName || ""}
                      onChange={(e) => handleChange("firstName", e.target.value)}
                      className="bg-transparent border-gray-700 focus:border-primary"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-400">Last Name</Label>
                    <Input
                      value={formData.lastName || ""}
                      onChange={(e) => handleChange("lastName", e.target.value)}
                      className="bg-transparent border-gray-700 focus:border-primary"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-gray-400">Contact</Label>
                    <Input
                      value={formData.contact || ""}
                      onChange={(e) => handleChange("contact", e.target.value)}
                      className="bg-transparent border-gray-700 focus:border-primary"
                      placeholder="+919876543210"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-400">Email Address</Label>
                    <Input
                      value={member.email || ""}
                      disabled
                      className="bg-gray-100 text-gray-400 border-gray-300 cursor-not-allowed select-none"
                    />
                  </div>
                </div>

              </CardContent>
            </Card>

            {forms.map((form) => (
              <Card key={form.id} className="w-full">
                <CardHeader className="border-b pb-4">
                  <CardTitle>{form.title}</CardTitle>
                </CardHeader>

                <CardContent className="space-y-6">
                  {form.fields.map((field) => {
                    const value = customValues[field.id] || "";

                    return (
                      <div key={field.id} className="space-y-2">
                        <Label className="text-gray-400">
                          {field.name}
                          {field.required && (
                            <span className="ml-1 text-red-500">*</span>
                          )}
                        </Label>

                        {field.type === "textarea" ? (
                          <Textarea
                            value={value}
                            onChange={(e) =>
                              handleCustomChange(field.id, e.target.value)
                            }
                            className="bg-transparent border-gray-700"
                          />
                        ) : field.type === "select" ? (
                          <Select
                            value={value}
                            onValueChange={(val) =>
                              handleCustomChange(field.id, val)
                            }
                          >
                            <SelectTrigger className="w-full bg-transparent border-gray-700">
                              <SelectValue
                                placeholder={`Select ${field.name.toLowerCase()}`}
                              />
                            </SelectTrigger>
                            <SelectContent>
                              {field.options?.map((opt) => (
                                <SelectItem key={opt} value={opt}>
                                  {opt}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : field.type === "radio" ? (
                          <RadioGroup
                            value={value}
                            onValueChange={(val) =>
                              handleCustomChange(field.id, val)
                            }
                            className="flex flex-row flex-wrap gap-4 pt-1"
                          >
                            {field.options?.map((opt) => (
                              <div
                                key={opt}
                                className="flex items-center space-x-2"
                              >
                                <RadioGroupItem
                                  value={opt}
                                  id={`${field.id}-${opt}`}
                                />
                                <Label
                                  htmlFor={`${field.id}-${opt}`}
                                  className="cursor-pointer font-normal"
                                >
                                  {opt}
                                </Label>
                              </div>
                            ))}
                          </RadioGroup>
                        ) : (
                          <Input
                            type={field.type}
                            value={value}
                            onChange={(e) =>
                              handleCustomChange(field.id, e.target.value)
                            }
                            className="bg-transparent border-gray-700"
                          />
                        )}
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </>
  );
};

export default MemberProfileDesktop;
