'use client'
import { ArrowLeft } from "lucide-react";
import InviteViaLink from "./InviteViaLink";
import { useRouter } from "next/navigation";

const InviteMembers = () => {

    const router = useRouter()


  return (
    <div className="space-y-6">

        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="w-4" />
          Back
        </button>

    <InviteViaLink />
        
       
    </div>
  );
};

export default InviteMembers;