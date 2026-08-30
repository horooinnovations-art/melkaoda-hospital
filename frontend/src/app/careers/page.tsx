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
        section="/careers"
        title="Build a Career"
        accent="Here"
        eyebrow="Work with us"
        subtitle="Openings across clinical, nursing, laboratory and administrative teams. Each listing sets out the requirements, the closing date and how to apply."
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
