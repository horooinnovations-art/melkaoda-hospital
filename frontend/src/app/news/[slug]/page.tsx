import NewsDetail from "./NewsDetail";

export default async function NewsDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <NewsDetail slug={slug} />;
}
