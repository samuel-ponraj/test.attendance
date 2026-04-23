import MemberProfile from "../../../../../../components/admin/members/MemberProfile";

export default async function Page({ params }) {
  const resolvedParams = await params

  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
      <MemberProfile
        teamId={resolvedParams.slug}
        memberId={resolvedParams.memberId}
      />
    </div>
  )
}