import ResourceDetail from "@/components/shared/ResourceDetail";
import { fetchResourceItem } from "@/lib/api";

export default async function AnnouncementDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  let title = "Announcement";
  let subtitle = "";
  try {
    const item = await fetchResourceItem<Record<string, string>>("announcements", slug);
    if (item?.title) title = item.title;
    if (item?.excerpt) subtitle = item.excerpt;
  } catch {
    // fallback
  }

  return (
    <ResourceDetail
      resource="announcements"
      slug={slug}
      titleField="title"
      contentField="content"
      backHref="/announcements"
      backLabel="All Announcements"
      width="wide"
      heroTitle={title}
      heroSubtitle={subtitle}
    />
  );
}
