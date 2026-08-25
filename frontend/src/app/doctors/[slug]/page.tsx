import DoctorDetail from "./DoctorDetail";

export default async function DoctorDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <DoctorDetail slug={slug} />;
}
