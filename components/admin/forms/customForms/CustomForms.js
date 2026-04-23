"use client";
import {
  Card,
  CardHeader,
  CardContent,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, Form, Loader2, Plus, Users } from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";
import AddFormModal from "./AddFormModal";
import {
  collection,
  getDocs,
  deleteDoc,
  doc,
  updateDoc,
  arrayRemove,
  arrayUnion,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Eye, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { useTeams } from "../../../../app/context/TeamsContext";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const CustomForms = () => {
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [customForms, setCustomForms] = useState([]);
  const router = useRouter();
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedForm, setSelectedForm] = useState(null);
  const [selectedTeam, setSelectedTeam] = useState("");
  const { teams } = useTeams();

  useEffect(() => {
    const fetchForms = async () => {
      try {
        setLoading(true);
        const formsSnapshot = await getDocs(collection(db, "customForms"));

        const forms = formsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        setCustomForms(forms);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    fetchForms();
  }, []);

  const handleAssignTeam = async () => {
    try {
      if (!selectedForm || !selectedTeam) return;

      const selectedTeamData = teams.find((team) => team.id === selectedTeam);

      const newTeam = {
        teamId: selectedTeam,
        teamName: selectedTeamData?.name || "",
      };

      const alreadyAssigned = selectedForm.teamsUsed?.some(
        (team) => team.teamId === selectedTeam,
      );

      if (alreadyAssigned) {
        toast.error("Team already assigned");
        return;
      }

      await updateDoc(doc(db, "customForms", selectedForm.id), {
        teamsUsed: arrayUnion(newTeam),
        updatedAt: serverTimestamp(),
      });

      await updateDoc(doc(db, "teams", selectedTeam), {
        customForms: arrayUnion(selectedForm.id),
        updatedAt: serverTimestamp(),
      });

      setCustomForms((prev) =>
        prev.map((form) =>
          form.id === selectedForm.id
            ? {
                ...form,
                teamsUsed: [...(form.teamsUsed || []), newTeam],
              }
            : form,
        ),
      );

      toast.success("Team assigned successfully");
      setAssignModalOpen(false);
      setSelectedForm(null);
      setSelectedTeam("");
    } catch (error) {
      console.error(error);
      toast.error("Failed to assign team");
    }
  };

  return (
    <div>
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : customForms.length === 0 ? (
        <Card className="mx-6 py-0 lg:py-2">
          <CardContent className="flex flex-col items-center justify-center p-12 text-center">
            <div className="w-16 h-16 gradient-hero rounded-full flex items-center justify-center mb-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <Users className="h-6 w-6" />
              </div>
            </div>

            <CardTitle className="text-lg font-medium mb-2">
              No forms yet
            </CardTitle>

            <p className="text-muted-foreground mb-6 max-w-sm">
              Create your first custom form for collecting team member details
            </p>

            <Button onClick={() => setModalOpen(true)}>
              <Plus />
              Create Form
            </Button>

            <AddFormModal open={modalOpen} onOpenChange={setModalOpen} />
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-4 px-4 lg:px-6">
          {customForms.map((form) => (
            <Card
              key={form.id}
              className="group bg-card shadow-xs hover:shadow-md transition-all duration-300 gap-4 pb-4"
            >
              <CardHeader className="relative">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Form className="w-5 h-5 text-primary" />
                  </div>
                </div>

                <CardTitle>{form.title}</CardTitle>
              </CardHeader>

              <div className="px-6 pb-2 flex flex-col gap-4">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-success" />
                  <span className="text-sm text-muted-foreground">
                    {form.customFields?.length || 0} Custom Fields
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    Assigned to:
                  </span>
                  {form.teamsUsed?.length ? (
                    form.teamsUsed.map((team) => (
                      <Badge
                        key={team.teamId}
                        variant="secondary"
                        className="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                      >
                        {team.teamName}
                      </Badge>
                    ))
                  ) : (
                    <Badge variant="outline">No Team</Badge>
                  )}
                </div>
              </div>

              <CardFooter className="flex items-center justify-between border-t !px-6 !py-4 !pb-0">
                <Button
                  onClick={() => {
                    setSelectedForm(form);
                    setSelectedTeam(form.teamId || "");
                    setAssignModalOpen(true);
                  }}
                >
                  Assign Team
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    router.push(`/admin/custom-forms/create?formId=${form.id}`)
                  }
                >
                  View Form
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={assignModalOpen} onOpenChange={setAssignModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Team</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
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

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setAssignModalOpen(false);
                  setSelectedForm(null);
                  setSelectedTeam("");
                }}
              >
                Cancel
              </Button>

              <Button onClick={handleAssignTeam} disabled={!selectedTeam}>
                Save Team
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CustomForms;
