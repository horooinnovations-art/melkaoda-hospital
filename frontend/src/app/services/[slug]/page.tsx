import ResourceDetail from "@/components/shared/ResourceDetail";
import { fetchResourceItem } from "@/lib/api";

export default async function ServiceDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  let title = "Service";
  let subtitle = "";
  try {
    const item = await fetchResourceItem<Record<string, string>>("services", slug);
    if (item?.name) title = item.name;
    if (item?.short_description) subtitle = item.short_description;
  } catch {
    // fallback
  }

  return (
    <ResourceDetail
      resource="services"
      slug={slug}
      titleField="name"
      contentField="description"
      backHref="/services"
      backLabel="All Services"
      heroTitle={title}
      heroSubtitle={subtitle}
    />
  );
}
