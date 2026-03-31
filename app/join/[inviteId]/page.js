"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

export default function JoinInvite() {
  const { inviteId } = useParams();
  const router = useRouter();

  useEffect(() => {
    if (inviteId) {
      router.replace(`/signup?inviteId=${inviteId}`);
    }
  }, [inviteId, router]);

  return (
    <div style={{ 
      display: "flex", 
      justifyContent: "center", 
      alignItems: "center", 
      height: "100vh" 
    }}>
      <p>Redirecting...</p>
    </div>
  );
}