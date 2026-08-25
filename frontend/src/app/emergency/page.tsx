import Link from "next/link";
import PageHero from "@/components/layout/PageHero";
import PageBody from "@/components/layout/PageBody";
import ResourceList from "@/components/shared/ResourceList";
import { Button } from "@/components/ui/button";
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
        title="Emergency Services"
        eyebrow="24/7 response"
        subtitle="Immediate, expert emergency care around the clock. Our rapid-response teams are always ready when every second counts."
        breadcrumbs={[{ label: "Emergency" }]}
      >
        {emergencyPhone ? (
          <Button variant="brass" size="lg" asChild>
            <a href={`tel:${emergencyPhone}`}>
              <Phone className="h-4 w-4" />
              {emergencyPhone}
            </a>
          </Button>
        ) : (
          <Button variant="brass" size="lg" asChild>
            <Link href="/contact">
              <Phone className="h-4 w-4" />
              Contact Emergency
            </Link>
          </Button>
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
