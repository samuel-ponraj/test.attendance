import MembersList from "../../../../../components/dashboard/members/MembersList";

export default async function Page({ params }) {
  const { slug } = await params;

  return (
    <div className="p-6 px-4 lg:px-6">
      <MembersList slug={slug} />
    </div>
  );
}
