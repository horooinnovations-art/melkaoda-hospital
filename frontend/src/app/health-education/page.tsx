import { unstable_noStore } from "next/cache";
import PageHero from "@/components/layout/PageHero";
import PageBody from "@/components/layout/PageBody";
import ResourceList from "@/components/shared/ResourceList";

export const metadata = { title: "Health Education" };
export const dynamic = "force-dynamic";

export default async function HealthEducationPage({
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
        title="Health Education"
        eyebrow="Know your health"
        subtitle="Empowering patients and communities with evidence-based health information, prevention tips, and wellness guides."
        breadcrumbs={[{ label: "Health Education" }]}
      />
      <PageBody>
        <ResourceList
          resource="health-education"
          basePath="/health-education"
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
