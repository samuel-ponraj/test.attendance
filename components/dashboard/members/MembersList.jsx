"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const MembersList = () => {
  const router = useRouter();
  const { slug } = useParams(); // teamId
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  /* ---------------- FETCH TEAM FROM API ---------------- */
  useEffect(() => {
  if (!slug) return;

  const fetchMembers = async () => {
    try {
      setLoading(true);

      const res = await fetch(`/api/teams/${slug}/members`);
      const data = await res.json();

      setMembers(data.members || []);
    } catch (err) {
      console.error("Failed to fetch members:", err);
    } finally {
      setLoading(false);
    }
  };

  fetchMembers();
}, [slug]);


  /* ---------------- DELETE MEMBER (UI ONLY) ---------------- */
  const handleDelete = async (memberId) => {
  if (!confirm("Are you sure you want to delete this member?")) return;

  try {
    const res = await fetch(`/api/teams/${slug}/members`, {
      method: "DELETE",
      body: JSON.stringify({ memberId }),
      headers: { "Content-Type": "application/json" },
    });

    const data = await res.json();

    if (data.success) {
      setMembers((prev) => prev.filter((m) => m.id !== memberId));
    } else {
      alert(data.error || "Failed to delete member");
    }
  } catch (err) {
    console.error(err);
    alert("Failed to delete member");
  }
};


  if (loading) {
    return <div className="p-6">Loading members...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Back */}
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
                <td
                  colSpan={5}
                  className="px-4 py-6 text-center text-muted-foreground"
                >
                  No members found
                </td>
              </tr>
            ) : (
              members.map((member, index) => (
                <tr
                  key={member.id}
                  className="border-t hover:bg-muted/50"
                >
                  <td className="px-4 py-3">{index + 1}</td>
                  <td className="px-4 py-3 font-medium whitespace-nowrap">
                    {member.name}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">{member.email}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{member.contact}</td>
                  <td className="px-4 py-3 text-center relative whitespace-nowrap">
                    <Button
                            variant="ghost"
                            size="icon"
                            className=" sm:static text-muted-foreground hover:text-destructive"
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
    </div>
  );
};

export default MembersList;
