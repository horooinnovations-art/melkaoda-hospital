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
        section="/health-education"
        title="Health"
        accent="Education"
        eyebrow="Know your health"
        subtitle="Plain-language guides to prevention, symptoms and living with a long-term condition — written for patients rather than for clinicians."
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
