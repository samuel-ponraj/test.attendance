"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Building2, CreditCard, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/app/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const today = new Date().toISOString().slice(0, 10);

const emptyForm = {
  companyName: "",
  businessEmail: "",
  companyPhone: "",
  address: "",
  city: "",
  state: "",
  country: "India",
  postalCode: "",
  taxNumber: "",
  logoUrl: "",
  purchaseDate: today,
  activationDate: today,
  licenceStatus: "active",
  maxTeams: "",
  maxEmployees: "",
  amountPaid: "",
  paymentMethod: "upi",
  paymentReference: "",
  invoiceNumber: "",
  internalNotes: "",
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  password: "",
  confirmPassword: "",
};

export default function CompanySetupForm({ companyId }) {
  const { user } = useAuth();
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [loadingCompany, setLoadingCompany] = useState(Boolean(companyId));

  useEffect(() => {
    if (!companyId || !user) return;
    user.getIdToken()
      .then((token) => fetch(`/api/bos/users/${companyId}`, { headers: { Authorization: `Bearer ${token}` } }))
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Failed to load company");
        setForm({ ...emptyForm, ...data.company, password: "", confirmPassword: "" });
      })
      .catch((error) => toast.error(error.message))
      .finally(() => setLoadingCompany(false));
  }, [companyId, user]);

  const updateField = (event) => {
    setForm({ ...form, [event.target.name]: event.target.value });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (form.password !== form.confirmPassword) return toast.error("Passwords do not match");
    if (form.password && form.password.length < 6) return toast.error("Password must contain at least 6 characters");
    if (!companyId && form.password.length < 6) return toast.error("Password must contain at least 6 characters");
    if (!user) return toast.error("Please sign in again");

    setLoading(true);
    try {
      const token = await user.getIdToken();
      const response = await fetch(companyId ? `/api/bos/users/${companyId}` : "/api/bos/users", {
        method: companyId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to create company");

      if (!companyId) setForm(emptyForm);
      toast.success(companyId ? "Company updated successfully" : `Company created. Licence key: ${data.licenceKey}`);
    } catch (error) {
      toast.error(error.message || "Failed to create company");
    } finally {
      setLoading(false);
    }
  };

  if (loadingCompany) return <div className="flex min-h-64 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <form className="mx-auto max-w-5xl space-y-6" onSubmit={handleSubmit}>
      <Button asChild type="button" variant="ghost" className="-ml-3">
        <Link href={companyId ? `/bos/companies/${companyId}` : "/bos"}><ArrowLeft className="h-4 w-4" />Back</Link>
      </Button>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2"><Building2 className="h-5 w-5 text-primary" /><CardTitle>Company Details</CardTitle></div>
          <CardDescription>Basic business and contact information.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5 md:grid-cols-2">
          <Field label="Company Name" name="companyName" value={form.companyName} onChange={updateField} />
          <Field label="Business Email" name="businessEmail" type="email" value={form.businessEmail} onChange={updateField} />
          <Field label="Company Phone" name="companyPhone" type="tel" value={form.companyPhone} onChange={updateField} />
          <Field label="GST / Tax Number" name="taxNumber" value={form.taxNumber} onChange={updateField} required={false} />
          <Field label="Address" name="address" value={form.address} onChange={updateField} required={false} />
          <Field label="City" name="city" value={form.city} onChange={updateField} required={false} />
          <Field label="State" name="state" value={form.state} onChange={updateField} required={false} />
          <Field label="Country" name="country" value={form.country} onChange={updateField} />
          <Field label="Postal Code" name="postalCode" value={form.postalCode} onChange={updateField} required={false} />
          <Field label="Company Logo URL" name="logoUrl" type="url" value={form.logoUrl} onChange={updateField} required={false} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2"><CreditCard className="h-5 w-5 text-primary" /><CardTitle>Lifetime Licence</CardTitle></div>
          <CardDescription>One-time payment and licence limits. The licence key is generated automatically.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5 md:grid-cols-2">
          <Field label="Purchase Date" name="purchaseDate" type="date" value={form.purchaseDate} onChange={updateField} />
          <Field label="Activation Date" name="activationDate" type="date" value={form.activationDate} onChange={updateField} />
          <SelectField label="Licence Status" name="licenceStatus" value={form.licenceStatus} onChange={updateField} options={["active", "suspended", "revoked"]} />
          <Field label="Maximum Teams" name="maxTeams" type="number" min="1" value={form.maxTeams} onChange={updateField} />
          <Field label="Maximum Employees" name="maxEmployees" type="number" min="1" value={form.maxEmployees} onChange={updateField} />
          <Field label="Amount Paid" name="amountPaid" type="number" min="0" step="0.01" value={form.amountPaid} onChange={updateField} />
          <SelectField label="Payment Method" name="paymentMethod" value={form.paymentMethod} onChange={updateField} options={["upi", "bank transfer", "card", "cash", "other"]} />
          <Field label="Payment Reference" name="paymentReference" value={form.paymentReference} onChange={updateField} required={false} />
          <Field label="Invoice Number" name="invoiceNumber" value={form.invoiceNumber} onChange={updateField} required={false} />
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="internalNotes">Internal Notes</Label>
            <textarea id="internalNotes" name="internalNotes" value={form.internalNotes} onChange={updateField} className="min-h-24 w-full rounded-md border bg-transparent px-3 py-2 text-sm" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-primary" /><CardTitle>Primary Administrator</CardTitle></div>
          <CardDescription>Create the company administrator account.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5 md:grid-cols-2">
          <Field label="First Name" name="firstName" value={form.firstName} onChange={updateField} />
          <Field label="Last Name" name="lastName" value={form.lastName} onChange={updateField} />
          <Field label="Email" name="email" type="email" value={form.email} onChange={updateField} placeholder="admin@company.com" />
          <Field label="Phone Number" name="phone" type="tel" value={form.phone} onChange={updateField} required={false} />
          <Field label={companyId ? "New Password" : "Temporary Password"} name="password" type="password" value={form.password} onChange={updateField} minLength={6} required={!companyId} />
          <Field label="Confirm Password" name="confirmPassword" type="password" value={form.confirmPassword} onChange={updateField} minLength={6} required={!companyId} />
        </CardContent>
      </Card>

      <div className="flex justify-center">
        <Button type="submit" disabled={loading}>
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          {loading ? (companyId ? "Saving..." : "Creating Company...") : (companyId ? "Save Changes" : "Create Company")}
        </Button>
      </div>
    </form>
  );
}

function Field({ label, name, required = true, ...inputProps }) {
  return <div className="space-y-2"><Label htmlFor={name}>{label}{required ? " *" : ""}</Label><Input id={name} name={name} required={required} {...inputProps} /></div>;
}

function SelectField({ label, name, options, ...selectProps }) {
  return <div className="space-y-2"><Label htmlFor={name}>{label} *</Label><select id={name} name={name} required className="h-9 w-full rounded-md border bg-background px-3 text-sm capitalize" {...selectProps}>{options.map((option) => <option key={option} value={option} className="capitalize">{option}</option>)}</select></div>;
}
