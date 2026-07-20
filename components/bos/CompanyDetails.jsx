"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, Pencil } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/app/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function CompanyDetails({ companyId }) {
  const { user } = useAuth();
  const [company, setCompany] = useState(null);

  useEffect(() => {
    if (!user) return;
    user.getIdToken()
      .then((token) => fetch(`/api/bos/users/${companyId}`, { headers: { Authorization: `Bearer ${token}` } }))
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Failed to load company");
        setCompany(data.company);
      })
      .catch((error) => toast.error(error.message));
  }, [companyId, user]);

  if (!company) return <div className="flex min-h-64 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <Button asChild variant="ghost" className="-ml-3"><Link href="/bos"><ArrowLeft className="h-4 w-4" />Back</Link></Button>
        <Button asChild><Link href={`/bos/companies/${companyId}/edit`}><Pencil className="h-4 w-4" />Edit</Link></Button>
      </div>
      <DetailCard title="Company Details" items={[
        ["Company Name", company.companyName], ["Business Email", company.businessEmail], ["Company Phone", company.companyPhone],
        ["Address", [company.address, company.city, company.state, company.postalCode, company.country].filter(Boolean).join(", ")], ["GST / Tax Number", company.taxNumber],
      ]} />
      <DetailCard title="Lifetime Licence" items={[
        ["Licence Key", company.licenceKey], ["Status", company.licenceStatus], ["Purchase Date", company.purchaseDate],
        ["Activation Date", company.activationDate], ["Maximum Teams", company.maxTeams], ["Maximum Employees", company.maxEmployees],
        ["Amount Paid", company.amountPaid], ["Payment Method", company.paymentMethod], ["Payment Reference", company.paymentReference], ["Invoice Number", company.invoiceNumber],
      ]} />
      <DetailCard title="Primary Administrator" items={[
        ["Name", `${company.firstName} ${company.lastName}`], ["Email", company.email], ["Phone", company.phone],
      ]} />
    </div>
  );
}

function DetailCard({ title, items }) {
  return (
    <Card>
      <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
      <CardContent className="grid gap-5 md:grid-cols-2">
        {items.map(([label, value]) => <div key={label}><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 font-medium">{value || "—"}</p></div>)}
      </CardContent>
    </Card>
  );
}
