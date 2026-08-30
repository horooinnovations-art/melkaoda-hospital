import PageHero from "@/components/layout/PageHero";
import PageBody from "@/components/layout/PageBody";
import DoctorsList from "@/components/shared/DoctorsList";

export const metadata = { title: "Doctors" };

export default function DoctorsPage() {
  return (
    <>
      <PageHero
        section="/doctors"
        title="Our"
        accent="Doctors"
        eyebrow="Find a specialist"
        subtitle="The consultants, medical officers and specialists who see patients here — each listed with the department they work in, so you can find the right clinic before you travel."
        breadcrumbs={[{ label: "Doctors" }]}
      />
      <PageBody>
        <DoctorsList />
      </PageBody>
    </>
  );
}
