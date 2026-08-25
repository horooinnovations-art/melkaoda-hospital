import EventDetail from "./EventDetail";

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <EventDetail slug={slug} />;
}
