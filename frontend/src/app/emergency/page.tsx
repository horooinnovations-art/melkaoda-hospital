import Link from "next/link";
import PageHero from "@/components/layout/PageHero";
import PageBody from "@/components/layout/PageBody";
import ResourceList from "@/components/shared/ResourceList";
import { Phone } from "lucide-react";
import { fetchSettings } from "@/lib/api";

export const metadata = { title: "Emergency Services" };
export const dynamic = "force-dynamic";

export default async function EmergencyPage() {
  // Fetch site settings to get the real emergency phone number
  let emergencyPhone = "";
  try {
    const settings = await fetchSettings();
    emergencyPhone =
      (settings?.emergency_phone as string) ||
      (settings?.phone as string) ||
      "";
  } catch {
    // Settings unavailable — button will still render without a number
  }

  return (
    <>
      <PageHero
        section="/emergency"
        title="Emergency"
        accent="Response"
        eyebrow="Round the clock"
        subtitle="Emergency care does not keep office hours. If this is urgent, call before you travel — the number below reaches the duty team directly."
        badges={[{ label: "Open 24 hours" }, { label: "Call before you travel" }]}
        breadcrumbs={[{ label: "Emergency" }]}
      >
        {/* `nv-btn` rather than the shared Button's "brass" variant, which is
            bg-emerald-700 — the last saturated fill left on a public page. The
            Button primitive is untouched because the admin panel still uses it. */}
        {emergencyPhone ? (
          <a href={`tel:${emergencyPhone}`} className="nv-btn nv-btn--primary nv-btn--lg">
            <Phone className="h-4 w-4" />
            {emergencyPhone}
          </a>
        ) : (
          <Link href="/contact" className="nv-btn nv-btn--primary nv-btn--lg">
            <Phone className="h-4 w-4" />
            Contact emergency
          </Link>
        )}
      </PageHero>
      <PageBody>
        <ResourceList
          resource="emergency-services"
          basePath="/emergency"
          titleField="title"
          descField="short_description"
          layout="services"
        />
      </PageBody>
    </>
  );
}
