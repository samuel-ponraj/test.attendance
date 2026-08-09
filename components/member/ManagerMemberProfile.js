"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Spinner } from "@/components/ui/spinner";
import { useMembers } from "@/app/context/MembersContext";
import MemberProfile from "@/components/admin/members/MemberProfile";

export default function ManagerMemberProfile({ memberId }) {
  const router = useRouter();
  const { members, loading } = useMembers();
  const manager = members?.[0];

  useEffect(() => {
    if (!loading && manager?.role !== "manager") router.replace("/member");
  }, [loading, manager, router]);

  if (loading || !manager) {
    return <div className="flex min-h-[60vh] items-center justify-center"><Spinner className="size-8" /></div>;
  }
  if (manager.role !== "manager") return null;

  return <MemberProfile teamId={manager.teamId} memberId={memberId} managerView currentUserId={manager.id} />;
}
