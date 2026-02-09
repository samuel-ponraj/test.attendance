"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ChevronRight, ChevronLeft, Check, AlertCircle } from "lucide-react";
import FormBuilder from "./FormBuilder";

export default function AddTeamModal({ open, onOpenChange, addTeam }) {
  const [step, setStep] = useState("details");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [customFields, setCustomFields] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleComplete = async () => {
    setLoading(true);
    setShowConfirm(false);
    try {
      await addTeam(name.trim(), description.trim(), customFields);
      setName("");
      setDescription("");
      setCustomFields([]);
      setStep("details");
      onOpenChange(false);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange} >
        <DialogContent className="sm:max-w-lg px-3 sm:px-6">
          <DialogHeader>
            <DialogTitle>
              {step === "details" ? "Create New Team" : "Configure Member Fields"}
            </DialogTitle>
          </DialogHeader>

          {step === "details" ? (
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="teamName">Team Name</Label>
                <Input
                  id="teamName"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Engineering"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="teamDescription">Description</Label>
                <Textarea
                  id="teamDescription"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief description of the team"
                  rows={3}
                />
              </div>

              <div className="flex justify-end pt-2">
                <Button
                  type="button"
                  onClick={() => setStep("fields")}
                  disabled={!name.trim()}
                >
                  Next: Custom Fields
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4 mt-2 ">
              <FormBuilder fields={customFields} onChange={setCustomFields} />

              <div className="flex gap-3 justify-between pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep("details")}
                  disabled={loading}
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Back
                </Button>
                
                <Button 
                  type="button" 
                  onClick={() => setShowConfirm(true)} 
                  disabled={loading || !name.trim()}
                >
                  {loading ? "Creating..." : (
                    <>
                      <Check className="w-4 h-4" />
                      Complete & Create Team
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent className="">
          <AlertDialogHeader>
            <div className="flex items-center gap-2 text-amber-600 mb-2">
              <AlertCircle className="w-5 h-5" />
              <AlertDialogTitle>Finalize Team Structure?</AlertDialogTitle>
            </div>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-sm text-muted-foreground">
                <div>
                  Please review your custom fields. To maintain data integrity, 
                  once this team is created:
                </div>
                <ul className="list-disc pl-5 space-y-1 font-medium text-foreground">
                  <li>Existing fields cannot be modified or removed.</li>
                  <li>Field types (e.g., Text, Number) are locked.</li>
                </ul>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Review Fields</AlertDialogCancel>
            <AlertDialogAction 
              onClick={(e) => {
                e.preventDefault();
                handleComplete();
              }}
              className="bg-primary hover:bg-primary/90"
              disabled={loading}
            >
              Confirm & Create
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}