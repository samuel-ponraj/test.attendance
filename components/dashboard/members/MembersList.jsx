"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Eye, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { collection, getDocs, doc, getDoc, runTransaction, increment } from "firebase/firestore";
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
import { Spinner } from "@/components/ui/spinner";
import { useAuth } from '../../../app/context/AuthContext'

const MembersList = () => {
  const router = useRouter();
  const { slug } = useParams(); // teamId
  const [team, setTeam] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [memberToDelete, setMemberToDelete] = useState(null);
  const { user } = useAuth()

  /* ---------------- FETCH DATA ---------------- */
  useEffect(() => {
    if (!slug) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        // 1. Fetch Team to get Custom Field definitions
        const teamDoc = await getDoc(doc(db, "teams", slug));
        if (teamDoc.exists()) {
          setTeam({ id: teamDoc.id, ...teamDoc.data() });
        }

        // 2. Fetch Members
        const membersCol = collection(db, "teams", slug, "members");
        const snapshot = await getDocs(membersCol);
        const membersList = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setMembers(membersList);
      } catch (err) {
        console.error("Failed to fetch data:", err);
        toast.error("Failed to load members");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [slug]);

  /* ---------------- DELETE MEMBER ---------------- */
  const handleDelete = (memberId) => {
    setMemberToDelete(memberId);
  };

  const confirmDeleteMember = async () => {
  if (!memberToDelete || !user?.uid) return;

  try {
    await runTransaction(db, async (transaction) => {
      const memberRef = doc(db, "teams", slug, "members", memberToDelete);
      const userRef = doc(db, "users", user.uid);
      const teamRef = doc(db, "teams", slug);

      transaction.delete(memberRef);

      transaction.update(teamRef, {
        totalMembers: increment(-1)   
      });
      
      transaction.update(userRef, {
        memberCount: increment(-1)
      });
    });

    setMembers((prev) => prev.filter((m) => m.id !== memberToDelete));
    toast.success("Member deleted successfully");
  } catch (err) {
    console.error("Deletion Error:", err);
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

  // Extract custom field definitions
  const customFields = team?.customFields || [];

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <div className="flex justify-between items-center">
        <button
          onClick={() => router.push(`/dashboard/teams/${slug}`)}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <h1 className="text-xl font-bold">{team?.name} Members</h1>
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
              
              {/* --- DYNAMIC CUSTOM HEADERS --- */}
              {customFields.map((field) => (
                <th
                  key={field.id}
                  className={`px-4 py-3 text-left ${
                    field.name.toLowerCase() === "address"
                      ? "w-64 max-w-64"
                      : "whitespace-nowrap"
                  }`}
                >
                  {field.name}
                </th>
              ))}
              <th className="px-4 py-3 text-center">Action</th>
            </tr>
          </thead>

          <tbody>
            {members.length === 0 ? (
              <tr>
                <td
                  colSpan={5 + customFields.length}
                  className="px-4 py-6 text-center text-muted-foreground"
                >
                  No members found
                </td>
              </tr>
            ) : (
              members.map((member, index) => (
                <tr key={member.id} className="border-t hover:bg-muted/50">
                  <td className="px-4 py-3">{index + 1}</td>
                  <td className="px-4 py-3 font-medium whitespace-nowrap">
                    {member.name}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">{member.email}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {member.contact}
                  </td>

                  {/* --- DYNAMIC CUSTOM DATA --- */}
                  {customFields.map((field) => (
                    <td
                      key={field.id}
                      className={`px-4 py-3 ${
                        field.name.toLowerCase() === "address"
                          ? "w-64 max-w-64 whitespace-normal break-words"
                          : "whitespace-nowrap"
                      }`}
                    >
                      {member.customData?.[field.id] || "-"}
                    </td>
                  ))}
                  <td className="px-4 py-3 text-center flex items-center justify-center gap-1 whitespace-nowrap">
                {/* <Button
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:text-primary"
                  onClick={() => router.push(`/dashboard/teams/${slug}/members/${member.id}`)}
                >
                  <Eye className="w-4 h-4" />
                </Button> */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:text-destructive"
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

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!memberToDelete}
        onOpenChange={() => setMemberToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete member?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The member will be permanently
              removed.
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