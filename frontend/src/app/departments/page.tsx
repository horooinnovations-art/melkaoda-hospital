import { unstable_noStore } from "next/cache";
import PageHero from "@/components/layout/PageHero";
import PageBody from "@/components/layout/PageBody";
import { Suspense } from "react";
import ResourceList from "@/components/shared/ResourceList";
import ResourceSearchBar from "@/components/shared/ResourceSearchBar";
import { buildFilterOptions, param } from "@/lib/listFilters";

export const metadata = { title: "Departments" };

export const dynamic = "force-dynamic";

export default async function DepartmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string; category?: string }>;
}) {
  unstable_noStore();
  const resolvedParams = await searchParams;
  const page = Math.max(1, Number(resolvedParams?.page) || 1);
  const q = param(resolvedParams?.q);
  const category = param(resolvedParams?.category);
  const { options, total } = await buildFilterOptions("departments", "category");

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
        <Suspense fallback={null}>
          <ResourceSearchBar
            placeholder="Search departments by name or what they do..."
            filterLabel="Category"
            filterParam="category"
            options={options}
            total={total}
          />
        </Suspense>
        <ResourceList
          resource="departments"
          basePath="/departments"
          titleField="name"
          layout="departments"
          page={page}
          perPage={12}
          filters={{ search: q, category_id: category }}
          query={{ q, category }}
          emptyTitle={q || category ? "No departments match" : "Departments coming soon"}
          emptyDescription={
            q || category
              ? "Try a shorter search, or choose All to see every department."
              : undefined
          }
        />
      </PageBody>
    </>
  );
}
