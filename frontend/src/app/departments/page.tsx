import { unstable_noStore } from "next/cache";
import PageHero from "@/components/layout/PageHero";
import PageBody from "@/components/layout/PageBody";
import ResourceList from "@/components/shared/ResourceList";

export const metadata = { title: "Departments" };

export const dynamic = "force-dynamic";

export default async function DepartmentsPage({
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
        section="/departments"
        title="Clinical"
        accent="Departments"
        eyebrow="Care, organised"
        subtitle="Every unit in the hospital, with the consultants, equipment and referral routes that belong to it. Start here when you already know which team you need."
        breadcrumbs={[{ label: "Departments" }]}
      />
      <PageBody>
        <ResourceList
          resource="departments"
          basePath="/departments"
          titleField="name"
          layout="departments"
          page={page}
          perPage={12}
          emptyTitle="Departments coming soon"
        />
      </PageBody>
    </>
  );
}
