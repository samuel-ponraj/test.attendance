'use client'
import { useState, useEffect } from "react";
import { Check, Copy, Share2, RefreshCw, Loader2, Link, User } from "lucide-react";
import { db } from "@/lib/firebase";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  limit,
  serverTimestamp,
  getDoc,
} from "firebase/firestore";

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent
} from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useParams } from "next/navigation";
import ApprovalTable from "./ApprovalTable";

export default function InviteViaLink() {

    const { slug } = useParams();

    const teamId = slug

  const [loading, setLoading] = useState(false);
  const [inviteId, setInviteId] = useState("");
  const [copied, setCopied] = useState(false);
  const [role, setRole] = useState("member");
  const [teamName, setTeamName] = useState("");

  const inviteUrl = inviteId
    ? `${window.location.origin}/join/${inviteId}`
    : "";

useEffect(() => {
  if (teamId) {
    fetchInvite();
  }
}, [teamId]);



const fetchInvite = async () => {
  setLoading(true);

  try {

    const teamRef = doc(db, "teams", teamId);
    const teamSnap = await getDoc(teamRef);

    if (teamSnap.exists()) {
      setTeamName(teamSnap.data().name);
    }

    const q = query(
      collection(db, "invites"),
      where("teamId", "==", teamId),
      where("active", "==", true),
      limit(1)
    );

    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      setInviteId(snapshot.docs[0].id);
    }

    

  } catch (error) {
    console.error(error);
  } finally {
    setLoading(false);
  }
};

  const generateNewInvite = async () => {
    if (!teamName) {
        toast.error("Team not loaded yet");
        return;
    }
    setLoading(true);
    
    try {

      const q = query(
        collection(db, "invites"),
        where("teamId", "==", teamId),
        where("active", "==", true)
      );

      const existing = await getDocs(q);

      const batchPromises = existing.docs.map(d =>
        updateDoc(doc(db, "invites", d.id), { active: false })
      );

      await Promise.all(batchPromises);

      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);

      const newInvite = await addDoc(collection(db, "invites"), {
        teamId,
        teamName,
        role,
        active: true,
        expiresAt,
        maxUses: null,
        usedCount: 0,
        createdAt: serverTimestamp()
      });

      setInviteId(newInvite.id);
      toast.success("New invite link generated");

    } catch (error) {
      toast.error("Failed to generate link");
    } finally {
      setLoading(false);
    }
  };

  const onCopy = () => {
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    toast.success("Copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  

  return (
    <div className="space-y-6 ">
    <Card>

      <CardHeader>
        <div className="flex items-center gap-2">
			<Link className="h-5 w-5 text-primary" />
			<CardTitle>Invite via Link</CardTitle>
		</div>
        <CardDescription>
          Share this link to invite members. Link expires in 24 hours.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
  <div className="flex flex-col gap-3">
    {/* Top Row: Input with Copy + Generate Button */}
    <div className="flex items-center gap-2">
      <div className="relative flex-1">
        <Input
          value={inviteUrl}
          readOnly
          placeholder="Click 'Generate' to create invite link..."
          className="pr-10 text-muted-foreground font-mono text-xs font-inherit"
        />
        
        {/* Copy Button inside the Input */}
        <button
          onClick={onCopy}
          disabled={!inviteId || loading}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground disabled:opacity-50 transition-colors"
          title="Copy Link"
        >
          {copied ? (
            <Check className="h-4 w-4 text-primary" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
        </button>

        {/* Loading Spinner inside the input (left of copy) */}
        {loading && (
          <Loader2 className="absolute right-10 top-2.5 h-4 w-4 animate-spin text-muted-foreground/50" />
        )}
      </div>

      {/* Generate Button on the Right */}
      <Button
        variant="outline"
        onClick={generateNewInvite}
        disabled={loading}
        className="shrink-0 gap-2 border-dashed"
      >
        <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        <span className="hidden sm:inline">Generate</span>
      </Button>
    </div>

    <div className="flex flex-col lg:flex-row mt-3 gap-6">

					<div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-1">
						<Label>Role</Label>

						<Select value={role} onValueChange={setRole}>
							<SelectTrigger className="w-full lg:max-w-[180px]">
								<SelectValue />
							</SelectTrigger>

							<SelectContent>
								<SelectItem value="member">
									<span className="flex items-center gap-2">
										<User className="h-3.5 w-3.5" />
										Member
									</span>
								</SelectItem>

								<SelectItem value="manager">
									<span className="flex items-center gap-2">
										<User className="h-3.5 w-3.5" />
										Manager
									</span>
								</SelectItem>

							</SelectContent>
						</Select>

					</div>
                    <Button
                    className=""
                    onClick={() => navigator.share?.({ url: inviteUrl })}
                    disabled={!inviteId}
                    >
                    <Share2 className="h-4 w-4" />
                    Share Link
                    </Button>
                    </div>
             </div>

             
            </CardContent>

            </Card>

    <ApprovalTable />
    </div>
  );
}