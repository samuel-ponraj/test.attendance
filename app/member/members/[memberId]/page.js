import ManagerMemberProfile from "@/components/member/ManagerMemberProfile";

export default async function ManagerMemberProfilePage({ params }) {
  const { memberId } = await params;
  return <ManagerMemberProfile memberId={memberId} />;
}
