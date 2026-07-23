import Schedule from "../../../../../components/admin/team/Schedule";
import TeamAccessGate from "@/components/admin/team/TeamAccessGate";

export default async function Page({ params }) {
  const { slug } = await params;

  return (
    <TeamAccessGate teamId={slug}>
      <div>
        <Schedule slug={slug} />
      </div>
    </TeamAccessGate>
  );
}
