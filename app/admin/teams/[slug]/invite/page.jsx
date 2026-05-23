import Invite from "../../../../../components/admin/invite/Invite"
import TeamAccessGate from "@/components/admin/team/TeamAccessGate";


export default async function Page({ params }) {
  const { slug } = await params;

  return (
    <TeamAccessGate teamId={slug}>
      <div className="p-6 px-4 lg:px-6">
        <Invite slug={slug} />
      </div>
    </TeamAccessGate>
  );
}
