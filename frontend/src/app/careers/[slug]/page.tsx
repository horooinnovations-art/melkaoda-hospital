import CareerDetail from "./CareerDetail";

// Careers are loaded client-side from the API; skip build-time slug fetch
// so Render deploys don't fail when the API is cold/unreachable.
export const dynamic = "force-dynamic";
export const dynamicParams = true;

export function generateStaticParams() {
  return [];
}

export default async function CareerDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <CareerDetail slug={slug} />;
}
