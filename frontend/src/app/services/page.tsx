import { unstable_noStore } from "next/cache";
import PageHero from "@/components/layout/PageHero";
import PageBody from "@/components/layout/PageBody";
import ResourceList from "@/components/shared/ResourceList";

export const metadata = { title: "Services" };
export const dynamic = "force-dynamic";

export default async function ServicesPage({
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
        title="Clinical Services"
        eyebrow="What we offer"
        subtitle="From primary consultations to advanced surgical procedures — comprehensive healthcare services tailored to every patient's needs."
        breadcrumbs={[{ label: "Services" }]}
      />
      <PageBody>
        <ResourceList
          resource="services"
          basePath="/services"
          titleField="name"
          layout="services"
          page={page}
          perPage={12}
        />
      </PageBody>
    </>
  );
}
