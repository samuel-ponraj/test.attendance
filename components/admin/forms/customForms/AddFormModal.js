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
import { ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTeams } from "../../../../app/context/TeamsContext";

export default function AddFormModal({ open, onOpenChange }) {
  const [step, setStep] = useState("details");
  const [formTitle, setFormTitle] = useState("");
  const [selectedTeam, setSelectedTeam] = useState("");
  const [customFields, setCustomFields] = useState([]);
  const router = useRouter();
  const { teams } = useTeams();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-5xl px-3 sm:px-6 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {step === "details" ? "Create Custom Form" : "Build Form"}
          </DialogTitle>
        </DialogHeader>

        {step === "details" ? (
          <div className="space-y-5 mt-4">
            <div className="space-y-2">
              <Label htmlFor="formTitle">Form Title</Label>
              <Input
                id="formTitle"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="e.g., Registration Form"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="teamSelect">Assign to Team</Label>

              <select
                id="teamSelect"
                value={selectedTeam}
                onChange={(e) => setSelectedTeam(e.target.value)}
                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Select a team</option>
                {teams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end pt-2">
              <Button
                type="button"
                onClick={() => {
                  const selectedTeamData = teams.find(
                    (team) => team.id === selectedTeam,
                  );

                  const teamsUsed = [
                    {
                      teamId: selectedTeam,
                      teamName: selectedTeamData?.name || "",
                    },
                  ];

                  const params = new URLSearchParams({
                    formTitle,
                    teamsUsed: JSON.stringify(teamsUsed),
                  });

                  router.push(
                    `/admin/custom-forms/create?${params.toString()}`,
                  );
                  onOpenChange(false);
                }}
                disabled={!formTitle.trim() || !selectedTeam}
              >
                Proceed to Build
                <ChevronRight />
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4 mt-2">
            <div className="rounded-md border bg-muted/30 px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <p className="text-sm font-medium">{formTitle}</p>
                <p className="text-xs text-muted-foreground">
                  Assigned to: {selectedTeam}
                </p>
              </div>

              <Button
                type="button"
                variant="outline"
                onClick={() => setStep("details")}
              >
                Edit Details
              </Button>
            </div>

            <FormBuilder fields={customFields} onChange={setCustomFields} />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
