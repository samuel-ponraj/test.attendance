"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";

export default function AddTeamModal({ open, onOpenChange, addTeam }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [ownerName, setOwnerName] = useState("");

  const [loading, setLoading] = useState(false);

  const handleComplete = async () => {
    if (!name.trim()) return;

    setLoading(true);

    try {
      await addTeam({
        name: name.trim(),
        description: description.trim(),
        ownerName: ownerName.trim(),
      });

      setName("");
      setDescription("");
      setOwnerName("");

      onOpenChange(false);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg px-3 sm:px-6">
        <DialogHeader>
          <DialogTitle>Create New Team</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-4">

          {/* Team Name */}
          <div className="space-y-2">
            <Label>Team Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter team name"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description"
            />
          </div>

          {/* Owner */}
          <div className="space-y-2">
            <Label>Owner Name</Label>
            <Input
              value={ownerName}
              onChange={(e) => setOwnerName(e.target.value)}
              placeholder="Owner name"
            />
          </div>

          {/* SUBMIT */}
          <div className="flex justify-end pt-4 border-t">
            <Button
              onClick={handleComplete}
              disabled={loading || !name.trim()}
            >
              {loading ? "Creating..." : "Create Team"}
            </Button>
          </div>

        </div>
      </DialogContent>
    </Dialog>
  );
}