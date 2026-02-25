"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Eye, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { collection, getDocs, doc, getDoc, runTransaction, increment } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
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

const MembersList = () => {
  const router = useRouter();
  const { slug } = useParams(); // teamId
  const [team, setTeam] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [memberToDelete, setMemberToDelete] = useState(null);
  const { user } = useAuth()
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [search, setSearch] = useState("");

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

    // Update local UI state only after the backend confirms success
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

  // Extract custom field definitions
  const customFields = team?.customFields || [];

  /* ---------------- SEARCH FILTER ---------------- */
  const filteredMembers = members.filter((member) => {
  const query = search.toLowerCase();

  return (
    member.firstName?.toLowerCase().includes(query) ||
    member.lastName?.toLowerCase().includes(query) ||
    member.email?.toLowerCase().includes(query) ||
    member.contact?.toLowerCase().includes(query)
  );
});

  const totalRows = filteredMembers.length;
  const totalPages = Math.ceil(totalRows / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const currentRows = filteredMembers.slice(startIndex, endIndex);

  const handleExportPDF = () => {
  const doc = new jsPDF({ orientation: "landscape", unit: "pt" });

  doc.setFontSize(14);
  doc.text("Members List", 40, 30);

  // Build dynamic headers
  const headers = [
    "S. No",
    "First Name",
    "Last Name",
    "Email",
    "Contact",
    ...customFields.map((field) => field.name),
  ];

  // Build table body
  const body = filteredMembers.map((member, index) => [
    index + 1,
    member.firstName || "-",
    member.lastName || "-",
    member.email || "-",
    member.contact || "-",
    ...customFields.map(
      (field) => member.customData?.[field.id] || "-"
    ),
  ]);

  autoTable(doc, {
    startY: 50,
    head: [headers],
    body: body,
    styles: {
      fontSize: 9,
      cellPadding: 6,
    },
  });

  doc.save("members-list.pdf");
};

  return (
    <div className="space-y-6">
      <button
          onClick={() => router.push(`/dashboard/teams/${slug}`)}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="w-4" />
          Back
        </button>
      <div className="flex flex-col gap-3 mb-3 md:flex-row md:items-center md:justify-between">

  {/* Search */}
  <div className="w-full md:w-[300px]">
    <input
      type="text"
      placeholder="Search by name, email or contact"
      value={search}
      onChange={(e) => setSearch(e.target.value)}
      className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
    />
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
      size="sm"
      variant="outline"
      onClick={handleExportPDF}
      disabled={members.length === 0}
      className="flex-1 md:flex-none h-9"
    >
      Export PDF
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
              <th className="px-4 py-3 text-left">S.No</th>
              <th className="px-4 py-3 text-left">First Name</th>
              <th className="px-4 py-3 text-left">Last Name</th>
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
              currentRows.map((member, index) => (
                <tr key={member.id} className="border-t hover:bg-muted/50">
                <td className="px-4 py-3">
                  <Checkbox
                    checked={selectedMembers.includes(member.id)}
                    onCheckedChange={() => toggleSelectMember(member.id)}
                  />
                </td>
                  <td className="px-4 py-3">{startIndex + index + 1}</td>
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