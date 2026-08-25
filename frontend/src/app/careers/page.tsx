import { unstable_noStore } from "next/cache";
import PageHero from "@/components/layout/PageHero";
import PageBody from "@/components/layout/PageBody";
import ResourceList from "@/components/shared/ResourceList";

export const metadata = { title: "Careers" };
export const dynamic = "force-dynamic";

export default async function CareersPage({
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
        title="Join Our Team"
        eyebrow="Career opportunities"
        subtitle="Build a meaningful career in healthcare. We're looking for passionate professionals who share our commitment to clinical excellence."
        breadcrumbs={[{ label: "Careers" }]}
      />
      <PageBody>
        <ResourceList
          resource="careers"
          basePath="/careers"
          titleField="title"
          descField="description"
          layout="editorial"
          page={page}
          perPage={10}
          emptyTitle="No open positions"
          emptyDescription="We don't have any openings right now, but check back soon."
        />
      </PageBody>
    </>
  );
}
