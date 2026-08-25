import { unstable_noStore } from "next/cache";
import ResourceDetail from "@/components/shared/ResourceDetail";
import { fetchResourceItem } from "@/lib/api";

export const dynamic = "force-dynamic";

export default async function DepartmentDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  unstable_noStore();
  const { slug } = await params;

  let title = "Department";
  let subtitle = "";
  try {
    const dept = await fetchResourceItem<Record<string, string>>("departments", slug);
    if (dept?.name) title = dept.name;
    if (dept?.short_description) subtitle = dept.short_description;
  } catch {
    // fallback to default
  }

  return (
    <ResourceDetail
      resource="departments"
      slug={slug}
      titleField="name"
      contentField="description"
      backHref="/departments"
      backLabel="All Departments"
      heroTitle={title}
      heroSubtitle={subtitle}
    />
  );
}
