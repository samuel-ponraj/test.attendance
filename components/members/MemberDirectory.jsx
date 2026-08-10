"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Pencil, UserPlus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

// Manager-owned directory; it deliberately does not share the admin list,
// which includes administrator-only delete and notification actions.
export default function MemberDirectory({ members = [], onAddMember }) {
  const [search, setSearch] = useState("");
  const filtered = useMemo(() => members.filter((member) =>
    [member.firstName, member.lastName, member.email, member.contact]
      .filter(Boolean)
      .some((value) => value.toLowerCase().includes(search.toLowerCase())),
  ), [members, search]);

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div><h2 className="text-lg font-semibold">Members List</h2><p className="text-sm text-muted-foreground">{filtered.length} member{filtered.length === 1 ? "" : "s"}</p></div>
        <div className="flex gap-2"><input className="min-w-0 rounded-md border px-3 py-2 text-sm" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search members" /><Button onClick={onAddMember}><UserPlus className="size-4" />Add member</Button></div>
      </div>
      {filtered.length ? <div className="overflow-hidden rounded-md border">
        {filtered.map((member) => {
          const name = `${member.firstName || ""} ${member.lastName || ""}`.trim() || member.email;
          return <div key={member.id} className="flex items-center justify-between gap-4 border-b px-4 py-3 last:border-0"><div className="min-w-0"><p className="font-medium">{name}</p><p className="truncate text-sm text-muted-foreground">{member.email || "No email"} · {member.contact || "No contact"}</p></div><Button asChild variant="outline" size="icon"><Link href={`/member/members/${member.id}`} aria-label={`Edit ${name}`}><Pencil className="size-4" /></Link></Button></div>;
        })}
      </div> : <Card><CardContent className="flex flex-col items-center gap-2 py-12 text-muted-foreground"><Users className="size-8" />No members found</CardContent></Card>}
    </section>
  );
}
