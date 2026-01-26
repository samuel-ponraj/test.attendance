"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
<<<<<<< HEAD
import { doc, collection, setDoc, Timestamp, updateDoc, increment } from "firebase/firestore";
=======
import { doc, updateDoc, arrayUnion, Timestamp, increment } from "firebase/firestore";
>>>>>>> c39aa9d3570ced9499a5f3473f6b937ca0c693a8
import { db } from "@/lib/firebase";
import { nanoid } from "nanoid";

export default function AddMemberModal({ open, onOpenChange, teamId, onMemberAdded }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [contact, setContact] = useState("");
  const [loading, setLoading] = useState(false);

  const handleAdd = async (e) => {
<<<<<<< HEAD
  e.preventDefault();
  if (!name || !email || !contact) return;

  setLoading(true);

  const memberId = nanoid();
  const member = {
    id: memberId,
    name,
    email,
    contact,
    createdAt: Timestamp.now(),
  };

  try {
    // Reference to the members subcollection
    const memberRef = doc(collection(db, "teams", teamId, "members"), memberId);

    await setDoc(memberRef, member); // Add member

    // Increment totalMembers in main team document
    const teamRef = doc(db, "teams", teamId);
    await updateDoc(teamRef, { totalMembers: increment(1) });

    setName("");
    setEmail("");
    setContact("");
    onOpenChange(false);

    if (onMemberAdded) onMemberAdded();
  } catch (err) {
    console.error("Failed to add member:", err);
  } finally {
    setLoading(false);
  }
};


=======
    e.preventDefault();
    if (!name || !email || !contact) return;

    setLoading(true);

    const member = {
      id: nanoid(),
      name,
      email,
      contact,
      createdAt: Timestamp.now(),
    };

    try {
      await updateDoc(doc(db, "teams", teamId), {
        members: arrayUnion(member),
        total: increment(1),
      });

      setName("");
      setEmail("");
      setContact("");
      onOpenChange(false);

      if (onMemberAdded) onMemberAdded();
    } catch (err) {
      console.error("Failed to add member:", err);
    } finally {
      setLoading(false);
    }
  };

>>>>>>> c39aa9d3570ced9499a5f3473f6b937ca0c693a8
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Team Member</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleAdd} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="memberName">Full Name</Label>
            <Input
              id="memberName"
              placeholder="e.g., John Smith"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="e.g., john@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
<<<<<<< HEAD
=======
              required
>>>>>>> c39aa9d3570ced9499a5f3473f6b937ca0c693a8
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="contact">Contact</Label>
            <Input
              id="contact"
              placeholder="e.g., +91 9876543210"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
<<<<<<< HEAD
=======
              required
>>>>>>> c39aa9d3570ced9499a5f3473f6b937ca0c693a8
            />
          </div>

          <DialogFooter className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" variant="default" disabled={loading}>
              {loading ? "Adding..." : "Add Member"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
