import ResourceDetail from "@/components/shared/ResourceDetail";
import { fetchResourceItem } from "@/lib/api";

export default async function EmergencyDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  let title = "Emergency Service";
  let subtitle = "";
  try {
    const item = await fetchResourceItem<Record<string, string>>("emergency-services", slug);
    if (item?.title) title = item.title;
    if (item?.short_description) subtitle = item.short_description;
  } catch {
    // fallback
  }

  return (
    <ResourceDetail
      resource="emergency-services"
      slug={slug}
      titleField="title"
      contentField="description"
      backHref="/emergency"
      backLabel="Emergency Services"
      heroTitle={title}
      heroSubtitle={subtitle}
    />
  );
}
