import PaymentRecords from "@/components/admin/billing/PaymentRecords";
import TeamAccessGate from "@/components/admin/team/TeamAccessGate";

export default async function Page({ params }) {
  const { slug } = await params;

  return (
    <TeamAccessGate teamId={slug}>
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:pb-6">
        <PaymentRecords teamId={slug} />
      </div>
    </TeamAccessGate>
  );
}
