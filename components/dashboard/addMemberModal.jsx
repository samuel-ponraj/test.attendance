"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { doc, collection, setDoc, Timestamp, updateDoc, increment, runTransaction } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { nanoid } from "nanoid";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

export default function AddMemberModal({ open, onOpenChange, team, onMemberAdded }) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [contact, setContact] = useState("");
  const [dynamicValues, setDynamicValues] = useState({});
  const [loading, setLoading] = useState(false);

  const fields = team?.customFields || [];

  useEffect(() => {
    if (!open) {
      setFullName(""); setEmail(""); setContact(""); setDynamicValues({});
    }
  }, [open]);

  const handleDynamicChange = (fieldId, value) => {
    setDynamicValues((prev) => ({ ...prev, [fieldId]: value }));
  };

  const validateRequiredFields = () => {
  // Check default fields
  if (!fullName.trim() || !email.trim()) return false;

  // Check custom fields
  for (const field of fields) {
    if (field.required) {
      const value = dynamicValues[field.id];
      if (value === undefined || value === null || (typeof value === "string" && !value.trim())) {
        return false;
      }
    }
  }
  return true;
};

  const handleAdd = async (e) => {
  e.preventDefault();

  if (!validateRequiredFields()) {
    alert("Please fill in all required fields (marked with *)");
    return;
  }

  if (!team?.id || !fullName.trim()) return;

  setLoading(true);

  try {
    const memberId = nanoid();

    const member = {
      id: memberId,
      name: fullName.trim(),
      email: email.trim().toLowerCase(),
      contact: contact.trim(),
      customData: dynamicValues,
      createdAt: Timestamp.now(),
    };

    const teamRef = doc(db, "teams", team.id);
    const memberRef = doc(collection(db, "teams", team.id, "members"), memberId);
    const userRef = doc(db, "users", team.admin.userId); // important

    await runTransaction(db, async (transaction) => {
      // Create member
      transaction.set(memberRef, member);

      // Increment team member count
      transaction.update(teamRef, {
        totalMembers: increment(1),
      });

      // Increment global user member count
      transaction.update(userRef, {
        memberCount: increment(1),
      });
    });

    onOpenChange(false);
    if (onMemberAdded) onMemberAdded();

  } catch (err) {
    console.error("Failed to add member:", err);
  } finally {
    setLoading(false);
  }
};


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[95vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle>Add Member to {team?.name}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleAdd} className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 pt-2 space-y-4 lg:py-3">
            <div className="pb-1">
              <Label className='pb-2' htmlFor="fullName">Full Name</Label>
              <Input id="fullName" placeholder="e.g. John Doe" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
            </div>
            <div className="pb-1">
              <Label className='pb-2' htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="e.g. john@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required/>
            </div>
            <div className="pb-1">
              <Label className='pb-2' htmlFor="contact">Contact</Label>
              <Input id="contact" placeholder="e.g. +91 9876543210" value={contact} onChange={(e) => setContact(e.target.value)} required/>
            </div>

            {fields.length > 0 && (
               <div className="relative py-2">
                  <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
                  <div className="relative flex justify-center text-[10px] uppercase">
                    <span className="bg-background px-2 text-muted-foreground font-medium italic">Custom Details</span>
                  </div>
               </div>
            )}

            {fields.map((field) => (
              <div key={field.id} className=" pb-1">
                <Label className='pb-2' htmlFor={field.id}>{field.name} {field.required}</Label>
                {field.type === "textarea" ? (
                  <Textarea id={field.id} value={dynamicValues[field.id] || ""} onChange={(e) => handleDynamicChange(field.id, e.target.value)} required={field.required} />
                ) : field.type === "select" ? (
                  <Select onValueChange={(val) => handleDynamicChange(field.id, val)} required={field.required} >
                    <SelectTrigger className="w-full"><SelectValue placeholder={`Select ${field.name.toLowerCase()}`} /></SelectTrigger>
                    <SelectContent>{field.options?.map((opt) => (<SelectItem key={opt} value={opt}>{opt}</SelectItem>))}</SelectContent>
                  </Select>
                ) : field.type === "radio" ? (
                  <RadioGroup onValueChange={(val) => handleDynamicChange(field.id, val)} required={field.required} className="flex flex-row flex-wrap gap-4 pt-1">
                    {field.options?.map((opt) => (
                      <div key={opt} className="flex items-center space-x-2">
                        <RadioGroupItem value={opt} id={`${field.id}-${opt}`} />
                        <Label htmlFor={`${field.id}-${opt}`} className="font-normal cursor-pointer">{opt}</Label>
                      </div>
                    ))}
                  </RadioGroup>
                ) : (
                  <Input id={field.id} type={field.type} value={dynamicValues[field.id] || ""} onChange={(e) => handleDynamicChange(field.id, e.target.value)} required={field.required} />
                )}
              </div>
            ))}
          </div>

          <DialogFooter className="p-4 border-t flex-row gap-2 justify-end bg-background">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>Cancel</Button>
            <Button type="submit" disabled={loading}>{loading ? "Adding..." : "Add Member"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}