"use client";

import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { doc, collection, Timestamp, increment, runTransaction } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { nanoid } from "nanoid";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { getCountries, getCountryCallingCode } from "libphonenumber-js";
import { getFunctions, httpsCallable } from "firebase/functions";
import { useRouter } from "next/navigation";

// Generate country code options
const countryCodeOptions = getCountries().map((iso) => ({
  code: `+${getCountryCallingCode(iso)}`,
  iso,
}));

export default function AddMemberModal({ open, onOpenChange, team, onMemberAdded }) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("member");
  const [selectedIso, setSelectedIso] = useState("IN"); 
  const [phoneNumber, setPhoneNumber] = useState("");
  const [dynamicValues, setDynamicValues] = useState({});
  const [loading, setLoading] = useState(false);
  const router = useRouter()
  const fields = team?.customFields || [];

  const countryCode = useMemo(() => {
    const option = countryCodeOptions.find(c => c.iso === selectedIso);
    return option ? option.code : "+1";
  }, [selectedIso]);

  useEffect(() => {
    if (!open) {
      setFirstName("");
      setLastName("");
      setEmail("");
      setRole("member")
      setSelectedIso("IN"); 
      setPhoneNumber("");
      setDynamicValues({});
    }
  }, [open]);

  const handleDynamicChange = (fieldId, value) => {
    setDynamicValues((prev) => ({ ...prev, [fieldId]: value }));
  };

  const validateRequiredFields = () => {
    if (!firstName.trim() || !lastName.trim() || !email.trim() || !phoneNumber.trim() || !selectedIso) return false;
    for (const field of fields) {
      if (field.required) {
        const value = dynamicValues[field.id];
        if (!value || (typeof value === "string" && !value.trim())) return false;
      }
    }
    return true;
  };


 const handleAdd = async (e) => {
  e.preventDefault();
  if (!validateRequiredFields()) {
    toast.error("Please fill in all required fields");
    return;
  }

  setLoading(true);

  try {
    const functions = getFunctions();
    const createAccount = httpsCallable(functions, 'createMemberAccount');
    
    const emailLower = email.trim().toLowerCase();

    const result = await createAccount({
      email: emailLower,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
    });

    const { uid } = result.data;

    // 2. Prepare Firestore Data
    const combinedContact = `${countryCode} ${phoneNumber.trim()}`;
    const member = {
      id: uid,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: emailLower,
      role,
      contact: combinedContact,
      customData: dynamicValues,
      createdAt: Timestamp.now(),
    };

    const teamRef = doc(db, "teams", team.id);
    const memberRef = doc(db, "teams", team.id, "members", uid);
    const userRef = doc(db, "users", team.admin.userId);
    const allMembersRef = doc(db, "allMembers", emailLower);

    // 3. Run Transaction for Firestore Cleanup
    await runTransaction(db, async (transaction) => {
      transaction.set(memberRef, member);
      transaction.update(teamRef, { totalMembers: increment(1) });
      transaction.update(userRef, { memberCount: increment(1) });
      transaction.set(allMembersRef, {
        teamId: team.id,
        email: emailLower,
        memberId: uid,
      });
    });

    if (onMemberAdded) onMemberAdded();
    toast.success("Member created successfully!");
    setTimeout(() => {
      onOpenChange(false);
      router.push(`/admin/teams/${team.id}/members/${uid}`);
    }, 300);
  } catch (err) {
    console.error("Failed to add member:", err);
    toast.error(err.message || "Failed to add member.");
  } finally {
    setLoading(false);
  }
};

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full sm:max-w-md max-h-[95vh] flex flex-col p-0 overflow-hidden mx-auto my-6 sm:my-auto">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle>Add Member to {team?.name}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleAdd} className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 pt-2 space-y-4 lg:py-3">
            
            {/* Standard Fields */}
            <div className="flex flex-col sm:flex-row sm:space-x-2 space-y-4 sm:space-y-0">
              <div className="flex-1">
                <Label className="pb-2" htmlFor="firstName">First Name</Label>
                <Input id="firstName" placeholder="First Name" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
              </div>
              <div className="flex-1">
                <Label className="pb-2" htmlFor="lastName">Last Name</Label>
                <Input id="lastName" placeholder="Last Name" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
              </div>
            </div>

            <div className="pb-1">
              <Label className="pb-2" htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="e.g. john@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>

            <div className="flex w-full space-x-2">
              <div className="sm:w-1/3">
                <Label className="pb-2" htmlFor="countryCode">Country Code</Label>
                <Select value={selectedIso} onValueChange={setSelectedIso} required>
                  <SelectTrigger className="w-full">
                    <SelectValue>
                       {selectedIso} ({countryCode})
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="max-h-60 overflow-auto">
                    {countryCodeOptions.map((c) => (
                      <SelectItem key={c.iso} value={c.iso}>
                        {c.iso} ({c.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1">
                <Label className="pb-2" htmlFor="phoneNumber">Phone Number</Label>
                <Input id="phoneNumber" type="tel" placeholder="9876543210" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} required />
              </div>
            </div>
                    
           <div className="pb-1">
            <Label className="pb-2" htmlFor="role">Role</Label>         
            <RadioGroup
              value={role}
              onValueChange={(val) => setRole(val)}
              className="flex flex-row flex-wrap gap-4 pt-1"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="member" id="role-member" />
                <Label htmlFor="role-member" className="font-normal cursor-pointer">
                  Member
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <RadioGroupItem value="manager" id="role-manager" />
                <Label htmlFor="role-manager" className="font-normal cursor-pointer">
                  Manager
                </Label>
              </div>
            </RadioGroup>
          </div>
          </div>

          <DialogFooter className="p-4 border-t flex-row gap-2 justify-end bg-background">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>Cancel</Button>
            <Button type="submit" disabled={loading}>{loading ? "Adding..." : "Proceed"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}