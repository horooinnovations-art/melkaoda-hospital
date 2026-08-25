import { unstable_noStore } from "next/cache";
import PageHero from "@/components/layout/PageHero";
import PageBody from "@/components/layout/PageBody";
import ResourceList from "@/components/shared/ResourceList";

export const metadata = { title: "Announcements" };
export const dynamic = "force-dynamic";

export default async function AnnouncementsPage({
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
        title="Announcements"
        eyebrow="Official notices"
        subtitle="Important updates, policy changes, new services and notices from the hospital administration."
        breadcrumbs={[{ label: "Announcements" }]}
      />
      <PageBody>
        <ResourceList
          resource="announcements"
          basePath="/announcements"
          titleField="title"
          descField="excerpt"
          layout="editorial"
          page={page}
          perPage={10}
        />
      </PageBody>
    </>
  );
}
