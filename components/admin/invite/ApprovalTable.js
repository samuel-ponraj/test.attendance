"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardTitle,
} from "@/components/ui/card";
import { Users, Trash2, Check } from "lucide-react";
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
import { getDocs, collection, doc, runTransaction, increment, deleteDoc, addDoc, serverTimestamp } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight} from "lucide-react";
  import { getFunctions, httpsCallable } from "firebase/functions";
import { useAuth } from "../../../app/context/AuthContext";
import { toast } from "sonner";

const ApprovalTable = () => {
  const [pendingMembers, setPendingMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState(null);
  const { user } = useAuth()
  const [teams, setTeams] = useState([]);
  const [selectedMember, setSelectedMember] = useState(null);
  const [selectedTeam, setSelectedTeam] = useState("");
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [selectedMembers, setSelectedMembers] = useState([]);

  // Fetch pending members
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const querySnapshot = await getDocs(collection(db, "pendingMembers"));
        const members = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }));
        setPendingMembers(members);
      } catch (err) {
        console.error("Failed to fetch data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Fetch team names
  useEffect(() => {
    const fetchTeams = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "teams"));
        const teamList = [];
        for (const docSnap of querySnapshot.docs) {
          const data = docSnap.data();
          teamList.push({ id: docSnap.id, name: data.name });
        }
        setTeams(teamList);
      } catch (err) {
        console.error("Failed to fetch teams:", err);
      }
    };
    fetchTeams();
  }, []);
/* ---------------- DELETE MEMBER ---------------- */
const handleDelete = (memberIds) => {
  if (!memberIds || memberIds.length === 0) return;

  // Ensure array
  const idsArray = Array.isArray(memberIds) ? memberIds : [memberIds];

  setMemberToDelete(idsArray);
};

const confirmDeleteMember = async () => {
  if (!memberToDelete?.length || !user?.uid) return;

  const targetId = memberToDelete[0]; // for single deletion
  const memberData = pendingMembers.find((m) => m.id === targetId);

  if (!memberData) {
    toast.error("Member data not found");
    return;
  }

  const functions = getFunctions();
  const removeMembersCall = httpsCallable(functions, 'removeMembers');

  const loadingToast = toast.loading("Removing member...");

  try {
    // 1️⃣ Call Cloud Function to remove from Auth + team + allMembers
    await removeMembersCall({ 
      teamId: memberData.teamId, 
      memberIds: memberToDelete 
    });

    // 2️⃣ Delete from pendingMembers collection manually
    await deleteDoc(doc(db, "pendingMembers", targetId));

    // 3️⃣ Update local UI state
    setPendingMembers(prev =>
      prev.filter((m) => m.id !== targetId)
    );

    toast.success("Member removed successfully", { id: loadingToast });

  } catch (err) {
    console.error("Deletion Error:", err);
    toast.error("Failed to delete member(s) from Auth/Database", { id: loadingToast });
  } finally {
    setMemberToDelete(null);
  }
};
    
  const handleApprove = (member) => {
    setSelectedMember(member);
    setConfirmDialogOpen(true);
  };

  const confirmAssignTeam  = async () => {

   if (!selectedMember) return;
  const adminId = auth.currentUser.uid;
  const memberId = selectedMember.id;
  const teamId = selectedMember.teamId;
  const email = selectedMember.email;

  if (!adminId || !memberId || !teamId || !email) {
    console.error("Missing required data", {
      adminId,
      memberId,
      teamId,
      email
    });
    return;
  }

  const teamRef = doc(db, "teams", teamId);
  const memberRef = doc(db, "teams", teamId, "members", memberId);
  const pendingRef = doc(db, "pendingMembers", memberId);
  const adminRef = doc(db, "users", adminId);
  const allMembersRef = doc(db, "allMembers", email);

  try {
    await runTransaction(db, async (transaction) => {
      transaction.set(memberRef, {
        ...selectedMember,
        profileCompleted: false
      });

      transaction.set(allMembersRef, {
        email: email,
        teamId: teamId,
        memberId: memberId,
      });

      // 2. Increment counts
      transaction.update(adminRef, {
        memberCount: increment(1),
      });

      transaction.update(teamRef, {
        totalMembers: increment(1),
      });

      // 3. Remove from pendingMembers
      transaction.delete(pendingRef);
    });

    setPendingMembers(prev =>
      prev.filter(member => member.id !== memberId)
    );

    const notificationsRef = collection(db, "teams", teamId, "members", memberId, "notifications");

    // 1. Welcome Notification
    await addDoc(notificationsRef, {
      title: "Welcome to the team!",
      message: `Welcome ${selectedMember.firstName}! Your application has been approved.`,
      type: "welcome",
      createdAt: serverTimestamp(),
      read: false,
    });

    await addDoc(notificationsRef, {
      title: "Complete your profile",
      message: "Please update your profile details to complete your onboarding.",
      type: "profile_update_required",
      createdAt: serverTimestamp(),
      read: false,
    });

    // 5. Cleanup UI state
    setConfirmDialogOpen(false);
    setSelectedMember(null);
    setSelectedTeam("");

  } catch (error) {
    console.error("Assignment failed:", error);
  }
};

const getRoleStyle = (status) => {
  switch (status) {
    case "member":
      return "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400";
    case "manager":
      return "bg-warning/10 text-warning";
    case "admin":
      return "bg-destructive/10 text-destructive";
    default:
      return "bg-warning/10 text-warning";
  }
};



/* ---------------- PAGINATION LOGIC ---------------- */
  const totalRows = pendingMembers.length;
  const totalPages = Math.ceil(totalRows / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const currentRows = pendingMembers.slice(startIndex, startIndex + rowsPerPage);

  return (
    <div className="space-y-6 ">
      {pendingMembers.length === 0 ? (
        <Card className="">
          <CardContent className="flex flex-col items-center justify-center p-12 text-center">
            <div className="w-16 h-16 gradient-hero rounded-full flex items-center justify-center mb-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <Users className="h-6 w-6" />
              </div>
            </div>

            <CardTitle className="text-lg font-medium mb-2">
              No Applications yet
            </CardTitle>

            <p className="text-muted-foreground mb-6 max-w-sm">
              Assign members to the Teams
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
      <div>
      <h2 className="mb-4">Pending Approvals</h2>
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="px-4 py-3 text-left">S.No</th>
                <th className="px-4 py-3 text-left">First Name</th>
                <th className="px-4 py-3 text-left">Last Name</th>
                <th className="px-4 py-3 text-left">Email</th>
                <th className="px-4 py-3 text-left">Role</th>
                <th className="px-4 py-3 text-left">Team Name</th>
                <th className="px-4 py-3 text-center">Action</th>
              </tr>
            </thead>

            <tbody>
              {pendingMembers.map((member, index) => (
                <tr key={member.id} className="border-t hover:bg-muted/50">
                  <td className="px-4 py-3">{startIndex + index + 1}</td>
                  <td className="px-4 py-3 font-medium whitespace-nowrap">{member.firstName}</td>
                  <td className="px-4 py-3 font-medium whitespace-nowrap">{member.lastName}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{member.email}</td>
                  <td className="px-4 py-3">
                      <Badge variant="outline" className={`capitalize ml-2 text-[12px] ${getRoleStyle(member.role)}`}>
                      {member.role}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">{member.teamName || '--'}</td>
                  <td className="px-4 py-3 text-center flex items-center justify-center gap-1 whitespace-nowrap">
                  <Button
                      variant='outline'
                      size="sm"
                      onClick={() => handleApprove(member)}
                      // className='bg-success/90 hover:bg-success w-20 cursor-pointer'
                      className='text-foreground hover:text-success cursor-pointer mr-2'
                    >
                      <Check />
                    </Button>
                    <Button
                      variant='outline'
                      size="sm"
                      onClick={() => handleDelete(member.id)}
                      // className='bg-destructive/90 hover:bg-destructive w-20 cursor-pointer'
                      className='text-foreground hover:text-destructive cursor-pointer'
                    >
                      <Trash2 />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Delete Confirmation */}
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

          {/* Assign Team Confirmation */}
          <AlertDialog
            open={confirmDialogOpen}
            onOpenChange={() => setConfirmDialogOpen(false)}
          >
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Approve Member?</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to approve
                  <strong>"{selectedMember?.firstName} {selectedMember?.lastName}"</strong> to the team <strong>"{selectedMember?.teamName}"</strong>?
                </AlertDialogDescription>
              </AlertDialogHeader>

              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={confirmAssignTeam}>
                  Approve
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
    </div>
    <div className="flex items-center justify-between gap-4 py-2 px-2">
          <div className="hidden lg:block text-sm text-muted-foreground">
            Showing {startIndex + 1} to {Math.min(startIndex + rowsPerPage, totalRows)} of {totalRows} Approvals
          </div>

          <div className="flex w-full lg:w-auto items-center justify-between lg:justify-end gap-6 lg:gap-8">
            <div className="hidden lg:flex items-center gap-2">
              <p className="text-sm font-medium">Rows</p>
              <Select
                value={`${rowsPerPage}`}
                onValueChange={(value) => {
                  setRowsPerPage(Number(value));
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="h-8 w-[70px]">
                  <SelectValue placeholder={rowsPerPage} />
                </SelectTrigger>
                <SelectContent align="end">
                  {[10, 20, 50].map((pageSize) => (
                    <SelectItem key={pageSize} value={`${pageSize}`}>
                      {pageSize}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-center text-sm font-medium">
              Page {currentPage} of {totalPages || 1}
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                className="hidden lg:flex h-8 w-8 p-0"
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
              >
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                className="h-8 w-8 p-0"
                onClick={() => setCurrentPage((prev) => prev - 1)}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                className="h-8 w-8 p-0"
                onClick={() => setCurrentPage((prev) => prev + 1)}
                disabled={currentPage === totalPages || totalPages === 0}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                className="hidden lg:flex h-8 w-8 p-0"
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages || totalPages === 0}
              >
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
        </>
      )}
    </div>
  );
};

export default ApprovalTable;
