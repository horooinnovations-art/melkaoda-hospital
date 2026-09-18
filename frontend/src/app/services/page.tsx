import { unstable_noStore } from "next/cache";
import PageHero from "@/components/layout/PageHero";
import PageBody from "@/components/layout/PageBody";
import { Suspense } from "react";
import ResourceList from "@/components/shared/ResourceList";
import ResourceSearchBar from "@/components/shared/ResourceSearchBar";
import { buildFilterOptions, param } from "@/lib/listFilters";

export const metadata = { title: "Services" };
export const dynamic = "force-dynamic";

export default async function ServicesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string; department?: string }>;
}) {
  unstable_noStore();
  const resolvedParams = await searchParams;
  const page = Math.max(1, Number(resolvedParams?.page) || 1);
  const q = param(resolvedParams?.q);
  const department = param(resolvedParams?.department);
  const { options, total } = await buildFilterOptions("services", "department");

  return (
    <>
      <PageHero
        section="/services"
        title="Clinical"
        accent="Services"
        eyebrow="What we treat"
        subtitle="From a first consultation through surgery to follow-up. Each entry sets out what the service covers, which department provides it and how to be referred."
        breadcrumbs={[{ label: "Services" }]}
      />
      <PageBody>
        <Suspense fallback={null}>
          <ResourceSearchBar
            placeholder="Search services by name or what they cover..."
            filterLabel="Department"
            filterParam="department"
            options={options}
            total={total}
          />
        </Suspense>
        <ResourceList
          resource="services"
          basePath="/services"
          titleField="name"
          layout="services"
          page={page}
          perPage={12}
          filters={{ search: q, department_id: department }}
          query={{ q, department }}
          emptyTitle={q || department ? "No services match" : undefined}
          emptyDescription={
            q || department
              ? "Try a shorter search, or choose All to see every service."
              : undefined
          }
        />
      </PageBody>
    </>
  );
}
