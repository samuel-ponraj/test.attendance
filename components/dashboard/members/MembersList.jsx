"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { removeTeamMember } from "../../../lib/removeTeamMember";
import { toast } from "sonner";
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
import { Spinner } from "@/components/ui/spinner"

const MembersList = () => {
  const router = useRouter();
  const { slug } = useParams(); // teamId
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [memberToDelete, setMemberToDelete] = useState(null);


  /* ---------------- FETCH MEMBERS ---------------- */
  useEffect(() => {
    if (!slug) return;

    const fetchMembers = async () => {
      setLoading(true);
      try {
        const membersCol = collection(db, "teams", slug, "members");
        const snapshot = await getDocs(membersCol);
        const membersList = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setMembers(membersList);
      } catch (err) {
        console.error("Failed to fetch members:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchMembers();
  }, [slug]);

  /* ---------------- DELETE MEMBER ---------------- */
  const handleDelete = (memberId) => {
  setMemberToDelete(memberId);
};

const confirmDeleteMember = async () => {
  if (!memberToDelete) return;

  try {
    await removeTeamMember({
      teamId: slug,
      memberId: memberToDelete,
    });

    setMembers(prev => prev.filter(m => m.id !== memberToDelete));
    toast.success("Member deleted successfully");
  } catch (err) {
    console.error(err);
    toast.error("Failed to delete member");
  } finally {
    setMemberToDelete(null);
  }
};


  if (loading) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Spinner className="size-8" />
    </div>
  );
}

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <div className="flex justify-between">
        <button
          onClick={() => router.push(`/dashboard/teams/${slug}`)}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
      </div>

      {/* Members Table */}
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="px-4 py-3 text-left">S.No</th>
              <th className="px-4 py-3 text-left">Name</th>
              <th className="px-4 py-3 text-left">Email</th>
              <th className="px-4 py-3 text-left">Contact</th>
              <th className="px-4 py-3 text-center">Action</th>
            </tr>
          </thead>

          <tbody>
            {members.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">
                  No members found
                </td>
              </tr>
            ) : (
              members.map((member, index) => (
                <tr key={member.id} className="border-t hover:bg-muted/50">
                  <td className="px-4 py-3">{index + 1}</td>
                  <td className="px-4 py-3 font-medium whitespace-nowrap">{member.name}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{member.email}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{member.contact}</td>
                  <td className="px-4 py-3 text-center relative whitespace-nowrap">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="sm:static text-muted-foreground hover:text-destructive"
                      onClick={() => handleDelete(member.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <AlertDialog
          open={!!memberToDelete}
          onOpenChange={() => setMemberToDelete(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete member?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. The member will be permanently removed.
              </AlertDialogDescription>
            </AlertDialogHeader>

            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDeleteMember}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

    </div>
  );
};

export default MembersList;
