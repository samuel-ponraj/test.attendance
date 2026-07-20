import CompanySetupForm from "@/components/bos/CompanySetupForm";

export default async function EditCompanyPage({ params }) {
  const { id } = await params;
  return <CompanySetupForm companyId={id} />;
}
