import Invite from "../../../../../components/admin/invite/Invite"


export default async function Page({ params }) {
  const { slug } = await params;

  return (
    <div className="p-6 px-4 lg:px-6">
      <Invite slug={slug} />
    </div>
  );
}
