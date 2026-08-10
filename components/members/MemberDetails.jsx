"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { doc, getDoc, serverTimestamp, updateDoc } from "firebase/firestore";
import { toast } from "sonner";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// This is intentionally independent of the admin detail screen. It exposes
// only the manager-allowed member fields and avoids accidentally inheriting
// administrator actions as the two areas evolve.
export default function MemberDetails({ teamId, memberId, currentUserId }) {
  const router = useRouter();
  const [member, setMember] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!teamId || !memberId) return;
    getDoc(doc(db, "teams", teamId, "members", memberId))
      .then((snapshot) => {
        if (!snapshot.exists()) throw new Error("Member not found");
        setMember({ id: snapshot.id, ...snapshot.data() });
      })
      .catch((error) => {
        console.error("Member detail load failed:", error);
        toast.error(error.message || "Failed to load member details");
        router.replace("/member/members?tab=members");
      });
  }, [memberId, router, teamId]);

  const updateField = (field, value) => setMember((current) => ({ ...current, [field]: value }));
  const readOnly = memberId === currentUserId;

  const save = async () => {
    if (!member || readOnly) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, "teams", teamId, "members", memberId), {
        firstName: String(member.firstName || "").trim(),
        lastName: String(member.lastName || "").trim(),
        contact: String(member.contact || "").trim(),
        attendanceMode: member.attendanceMode === "inherit" ? null : member.attendanceMode,
        updatedAt: serverTimestamp(),
      });
      toast.success("Member details saved");
    } catch (error) {
      console.error("Member detail save failed:", error);
      toast.error("Failed to save member details");
    } finally {
      setSaving(false);
    }
  };

  if (!member) return <div className="flex min-h-[50vh] items-center justify-center"><Loader2 className="size-7 animate-spin" /></div>;

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => router.push("/member/members?tab=members")}><ArrowLeft className="size-4" />Back to members</Button>
        {!readOnly && <Button onClick={save} disabled={saving}>{saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}Save changes</Button>}
      </div>
      <Card>
        <CardHeader><CardTitle>Member Details</CardTitle></CardHeader>
        <CardContent className="grid gap-5 md:grid-cols-2">
          <Field label="First name" value={member.firstName} disabled={readOnly} onChange={(value) => updateField("firstName", value)} />
          <Field label="Last name" value={member.lastName} disabled={readOnly} onChange={(value) => updateField("lastName", value)} />
          <Field label="Email" value={member.email} disabled />
          <Field label="Contact" value={member.contact} disabled={readOnly} onChange={(value) => updateField("contact", value)} />
          <div className="space-y-2">
            <Label>Role</Label><Input value={member.role || "member"} disabled />
          </div>
          <div className="space-y-2">
            <Label>Attendance method</Label>
            <Select value={member.attendanceMode || "inherit"} onValueChange={(value) => updateField("attendanceMode", value)} disabled={readOnly}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="inherit">Use team default</SelectItem><SelectItem value="self">Self attendance</SelectItem><SelectItem value="managed">Managed attendance</SelectItem></SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Field({ label, value, disabled, onChange }) {
  return <div className="space-y-2"><Label>{label}</Label><Input value={value || ""} disabled={disabled} onChange={(event) => onChange?.(event.target.value)} /></div>;
}
