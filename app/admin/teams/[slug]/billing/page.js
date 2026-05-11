import PaymentRecords from "@/components/admin/billing/PaymentRecords";

export default async function Page({ params }) {
  const { slug } = await params;

  return (
    <div className="flex flex-col gap-4 pb-4 md:gap-6 md:pb-6">
      <PaymentRecords teamId={slug} />
    </div>
  );
}
