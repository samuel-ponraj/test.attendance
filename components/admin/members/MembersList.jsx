"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  Bell,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Edit,
  UserPlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  addDoc,
  collection,
  getDocs,
  doc,
  getDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getFunctions, httpsCallable } from "firebase/functions";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const MembersList = ({setModalOpen}) => {
  const { slug } = useParams(); 
  const [team, setTeam] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [memberToDelete, setMemberToDelete] = useState(null);
  const { user } = useAuth()
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [search, setSearch] = useState("");
  const [profileStatusFilter, setProfileStatusFilter] = useState("all");
  const [customFormFields, setCustomFormFields] = useState([]);

  /* ---------------- FETCH DATA ---------------- */
  useEffect(() => {
    if (!slug) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const teamDoc = await getDoc(doc(db, "teams", slug));
        if (teamDoc.exists()) {
          const teamData = { id: teamDoc.id, ...teamDoc.data() };
          setTeam(teamData);

          const formIds = teamData.customForms || [];
          if (formIds.length) {
            const formSnaps = await Promise.all(
              formIds.map((id) => getDoc(doc(db, "customForms", id)))
            );

            setCustomFormFields(
              formSnaps
                .filter((snap) => snap.exists())
                .flatMap((snap) => snap.data().customFields || [])
            );
          } else {
            setCustomFormFields([]);
          }
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


  const toggleSelectMember = (memberId) => {
  setSelectedMembers((prev) =>
    prev.includes(memberId)
      ? prev.filter((id) => id !== memberId)
      : [...prev, memberId]
  );
};

const toggleSelectAll = () => {
  if (selectedMembers.length === members.length) {
    setSelectedMembers([]);
  } else {
    setSelectedMembers(members.map((m) => m.id));
  }
};

const getProfileCompletion = (member) => {
  const basicFields = [member.firstName, member.lastName, member.contact];
  const totalFields = basicFields.length + customFormFields.length;

  if (totalFields === 0) return 0;

  const completedBasic = basicFields.filter(
    (value) => value && String(value).trim() !== ""
  ).length;

  const completedCustom = customFormFields.filter((field) => {
    const value = member.customData?.[field.id];
    return value && (typeof value === "string" ? value.trim() !== "" : true);
  }).length;

  return Math.round(((completedBasic + completedCustom) / totalFields) * 100);
};

const isProfileComplete = (member) => getProfileCompletion(member) === 100;

const notifyProfileCompletion = async (member) => {
  try {
    await addDoc(
      collection(db, "teams", slug, "members", member.id, "notifications"),
      {
        title: "Complete your profile",
        message:
          "Please update your profile details and complete all required profile form fields.",
        type: "profile_update_required",
        createdAt: serverTimestamp(),
        read: false,
      }
    );

    toast.success("Profile completion notification sent");
  } catch (error) {
    console.error("Failed to notify member:", error);
    toast.error("Failed to send notification");
  }
};


  /* ---------------- DELETE MEMBER ---------------- */
  const handleDelete = (memberIds) => {
  if (!memberIds || memberIds.length === 0) return;

  // If single ID passed, convert to array
  const idsArray = Array.isArray(memberIds)
    ? memberIds
    : [memberIds];

  setMemberToDelete(idsArray);
};

const confirmDeleteMember = async () => {
  if (!memberToDelete?.length || !user?.uid) return;

  const functions = getFunctions();
  const removeMembersCall = httpsCallable(functions, 'removeMembers');

  // Show a loading toast or state if you have one
  const loadingToast = toast.loading("Removing members...");

  try {
    // Call the Cloud Function
    await removeMembersCall({ 
      teamId: slug, 
      memberIds: memberToDelete 
    });

    setMembers((prev) =>
      prev.filter((m) => !memberToDelete.includes(m.id))
    );

    setSelectedMembers([]);
    toast.success("Member(s) removed successfully", { id: loadingToast });
  } catch (err) {
    console.error("Deletion Error:", err);
    toast.error("Failed to delete member(s) from Auth/Database", { id: loadingToast });
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


  /* ---------------- SEARCH FILTER ---------------- */
const filteredMembers = members.filter((member) => {
  const query = search.toLowerCase();

  const matchesSearch =
    member.firstName?.toLowerCase().includes(query) ||
    member.lastName?.toLowerCase().includes(query) ||
    member.email?.toLowerCase().includes(query) ||
    member.contact?.toLowerCase().includes(query);

  if (!matchesSearch) return false;

  if (profileStatusFilter === "all") return true;

  const complete = isProfileComplete(member);
  return profileStatusFilter === "complete" ? complete : !complete;
});

  const totalRows = filteredMembers.length;
  const totalPages = Math.ceil(totalRows / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const currentRows = filteredMembers.slice(startIndex, endIndex);

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">Members List</h2>
      <div className="flex flex-col gap-3 mb-3 md:flex-row md:items-center md:justify-between">

  {/* Search */}
  <div className="flex w-full flex-col gap-2 md:w-auto md:flex-row">
  <div className="w-full md:w-[300px]">
    <input
      type="text"
      placeholder="Search by name, email or contact"
      value={search}
      onChange={(e) => {
        setSearch(e.target.value);
        setCurrentPage(1);
      }}
      className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
    />
  </div>

  <Select
    value={profileStatusFilter}
    onValueChange={(value) => {
      setProfileStatusFilter(value);
      setCurrentPage(1);
    }}
  >
    <SelectTrigger className="w-full md:w-48">
      <SelectValue placeholder="Profile Status" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="all">All Profiles</SelectItem>
      <SelectItem value="complete">Complete</SelectItem>
      <SelectItem value="incomplete">Incomplete</SelectItem>
    </SelectContent>
  </Select>
  </div>

  {/* Buttons */}
  <div className="flex w-full gap-2 md:w-auto md:gap-3">

    {selectedMembers.length > 0 && (
      <Button
        onClick={() => handleDelete(selectedMembers)}
        className="flex-1 md:flex-none"
      >
        Delete selected ({selectedMembers.length})
      </Button>
    )}

        <Button
          onClick={() => {
            setModalOpen(true);
          }}
        >
          <UserPlus /> Add Member
          </Button>

  </div>

</div>



      {/* Members Table */}
      <div className="overflow-x-auto rounded-lg border mb-0">
        <table className="w-full text-sm ">
          <thead className="bg-muted">
            <tr>
            <th className="px-4 py-3">
                <Checkbox
                  checked={
                    members.length > 0 &&
                    selectedMembers.length === members.length
                  }
                  onCheckedChange={toggleSelectAll}
                />
              </th>
              <th className="px-4 py-3 text-left">First Name</th>
              <th className="px-4 py-3 text-left">Last Name</th>
              <th className="px-4 py-3 text-left">Email</th>
              <th className="px-4 py-3 text-left">Contact</th>
              <th className="px-4 py-3 text-left">Profile Status</th>
              <th className="px-4 py-3 text-left">Action</th>
            </tr>
          </thead>

          <tbody>
            {members.length === 0 ? (
              <tr>
              
                <td
                  colSpan={7}
                  className="px-4 py-6 text-center text-muted-foreground"
                >
                  No members found
                </td>
              </tr>
            ) : (
              currentRows.map((member) => (
                <tr key={member.id} className="border-t hover:bg-muted/50">
                <td className="px-4 py-3">
                  <Checkbox
                    checked={selectedMembers.includes(member.id)}
                    onCheckedChange={() => toggleSelectMember(member.id)}
                  />
                </td>
                  <td className="px-4 py-3 font-medium whitespace-nowrap">
                    {member.firstName}
                  </td>
                  <td className="px-4 py-3 font-medium whitespace-nowrap">
                    {member.lastName}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">{member.email}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {member.contact}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <Badge
                      variant="outline"
                      className={cn(
                        isProfileComplete(member)
                          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600"
                          : "border-orange-500/30 bg-orange-500/10 text-orange-600"
                      )}
                    >
                      {isProfileComplete(member) ? "Complete" : "Incomplete"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                    <Link href={`/admin/teams/${team.id}/members/${member.id}`}>
                      <Button variant="outline" size="icon">
                        <Edit className="h-4 w-4" />
                      </Button>
                    </Link>

                    {!isProfileComplete(member) && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => notifyProfileCompletion(member)}
                        className="gap-2"
                      >
                        <Bell className="h-4 w-4" />
                        Notify
                      </Button>
                    )}
                    </div>
                  </td>
                </tr>

              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between gap-4 py-4 px-2">
          {/* Hidden on Mobile/Tab (below lg) */}
          <div className="hidden lg:block text-sm text-muted-foreground">
            0 of {totalRows} row(s) selected
          </div>

          <div className="flex w-full lg:w-auto items-center justify-between lg:justify-end gap-6 lg:gap-8">
            {/* Rows Per Page: Hidden on Mobile/Tab (below lg) */}
            <div className="hidden lg:flex items-center gap-2">
              <p className="text-sm font-medium">Rows per page</p>
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
                  {[10, 20, 30, 40, 50].map((pageSize) => (
                    <SelectItem key={pageSize} value={`${pageSize}`}>
                      {pageSize}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Page info: Always visible */}
            <div className="flex items-center justify-center text-sm font-medium">
              Page {currentPage} of {totalPages || 1}
            </div>

            {/* Navigation Buttons */}
            <div className="flex items-center gap-2">
              {/* Double Left: Hidden on Mobile/Tab (below lg) */}
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

              {/* Double Right: Hidden on Mobile/Tab (below lg) */}
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
