import { unstable_noStore } from "next/cache";
import PageHero from "@/components/layout/PageHero";
import PageBody from "@/components/layout/PageBody";
import ResourceList from "@/components/shared/ResourceList";

export const metadata = { title: "Events" };
export const dynamic = "force-dynamic";

export default async function EventsPage({
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
        title="Events & Programmes"
        eyebrow="Community calendar"
        subtitle="Health talks, free screenings, community outreach and hospital events — open to patients, staff and the public."
        breadcrumbs={[{ label: "Events" }]}
      />
      <PageBody>
        <ResourceList
          resource="events"
          basePath="/events"
          titleField="title"
          descField="description"
          layout="editorial"
          page={page}
          perPage={10}
        />
      </PageBody>
    </>
  );
}
