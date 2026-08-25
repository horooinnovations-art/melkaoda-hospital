import ResourceDetail from "@/components/shared/ResourceDetail";
import { fetchResourceItem } from "@/lib/api";

export default async function HealthEducationDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  let title = "Health Education";
  let subtitle = "";
  try {
    const item = await fetchResourceItem<Record<string, string>>("health-education", slug);
    if (item?.title) title = item.title;
    if (item?.excerpt || item?.short_description) subtitle = item.excerpt || item.short_description;
  } catch {
    // fallback
  }

  return (
    <ResourceDetail
      resource="health-education"
      slug={slug}
      titleField="title"
      contentField="content"
      backHref="/health-education"
      backLabel="Health Education"
      width="wide"
      heroTitle={title}
      heroSubtitle={subtitle}
    />
  );
}
