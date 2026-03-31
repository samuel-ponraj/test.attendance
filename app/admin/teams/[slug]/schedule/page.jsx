import Schedule from "../../../../../components/admin/team/Schedule";

export default async function Page({ params }) {
  const { slug } = await params;

  return (
    <div className="p-6 px-4 lg:px-6">
      <Schedule slug={slug} />
    </div>
  );
}
