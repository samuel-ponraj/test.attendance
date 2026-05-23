import MemberProfile from "../../../../../../components/admin/members/MemberProfile";
import TeamAccessGate from "@/components/admin/team/TeamAccessGate";

export default async function Page({ params }) {
  const resolvedParams = await params

  return (
    <TeamAccessGate teamId={resolvedParams.slug}>
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
        <MemberProfile
          teamId={resolvedParams.slug}
          memberId={resolvedParams.memberId}
        />
      </div>
    </TeamAccessGate>
  )
}
