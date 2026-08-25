import GalleryDetail from "./GalleryDetail";

export default async function GalleryDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <GalleryDetail slug={slug} />;
}
