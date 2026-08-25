import PageHero from "@/components/layout/PageHero";
import PageBody from "@/components/layout/PageBody";
import DoctorsList from "@/components/shared/DoctorsList";

export const metadata = { title: "Doctors" };

export default function DoctorsPage() {
  return (
    <>
      <PageHero
        title="Our Doctors"
        eyebrow="Medical staff"
        subtitle="Meet our team of experienced specialists dedicated to delivering compassionate, expert care across every discipline."
        breadcrumbs={[{ label: "Doctors" }]}
      />
      <PageBody>
        <DoctorsList />
      </PageBody>
    </>
  );
}
