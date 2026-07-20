import CompanyDetails from "@/components/bos/CompanyDetails";

export default async function CompanyPage({ params }) {
  const { id } = await params;
  return <CompanyDetails companyId={id} />;
}
