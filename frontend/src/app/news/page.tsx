import { unstable_noStore } from "next/cache";
import PageHero from "@/components/layout/PageHero";
import PageBody from "@/components/layout/PageBody";
import ResourceList from "@/components/shared/ResourceList";

export const metadata = { title: "News & Updates" };
export const dynamic = "force-dynamic";

export default async function NewsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  unstable_noStore();
  const resolvedParams = await searchParams;
  const page = Math.max(1, Number(resolvedParams?.page) || 1);

  return (
    <>
      <PageHero
        section="/news"
        title="News &"
        accent="Updates"
        eyebrow="From the hospital"
        subtitle="Clinical milestones, new equipment, staff appointments and the stories behind them. Newest first."
        breadcrumbs={[{ label: "News" }]}
      />
      <PageBody>
        <ResourceList
          resource="news"
          basePath="/news"
          titleField="title"
          descField="excerpt"
          layout="editorial"
          page={page}
          perPage={10}
          emptyTitle="News coming soon"
        />
      </PageBody>
    </>
  );
}
