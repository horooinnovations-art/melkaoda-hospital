"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowUpRight,
  Clock,
  HeartPulse,
  MapPin,
  Phone,
  Siren,
  Sparkles,
  Stethoscope,
  Users,
} from "lucide-react";
import { useGetHomeQuery } from "@/store/slices/apiSlice";
import { SITE_NAME, DEFAULT_TAGLINE } from "@/lib/api";
import type { HomeData, Partner } from "@/lib/types";
import { getImageFromItem } from "@/lib/media";
import {
  cleanPublicText,
  formatDate,
  formatPublicAddress,
  isPublicItemActive,
  truncate,
} from "@/lib/utils";
import { getStoredPartners } from "@/lib/partnersData";
import NovaHero from "@/components/nova/NovaHero";
import NovaSectionHead from "@/components/nova/NovaSectionHead";
import NovaReveal from "@/components/nova/NovaReveal";
import NovaWords from "@/components/nova/NovaWords";
import NovaRail from "@/components/nova/NovaRail";
import NovaDeptIndex, {
  type IndexEntry,
} from "@/components/nova/NovaDeptIndex";
import NovaGalleryStack, {
  type StackSlide,
} from "@/components/nova/NovaGalleryStack";
import NovaTestimonials from "@/components/nova/NovaTestimonials";
import {
  NovaContentCard,
  NovaDoctorCard,
  NovaEmpty,
  NovaFact,
  NovaMetricCard,
  NovaNewsRow,
  NovaPartnerCard,
} from "@/components/nova/NovaCards";



export default function HomeClient({
  initialData = null,
}: {
  initialData?: HomeData | null;
}) {
  const query = useGetHomeQuery(undefined, {
    skip: false,
    refetchOnMountOrArgChange: !initialData,
  });
  const data = query.data ?? initialData ?? undefined;
  const isLoading = !data && query.isLoading;

  // Read after mount so the server and client render the same first paint.
  const [partners, setPartners] = useState<Partner[]>([]);
  useEffect(() => setPartners(getStoredPartners().slice(0, 6)), []);

  const settings = data?.settings ?? {};
  const name =
    (settings.name as string) || (settings.site_name as string) || SITE_NAME;
  const tagline = (settings.tagline as string) || DEFAULT_TAGLINE;
  const about =
    (settings.description as string) ||
    (settings.about as string) ||
    (settings.organization_description as string) ||
    "";
  const emergency =
    (settings.emergency_phone as string) || (settings.phone as string);
  const address = formatPublicAddress(settings.address as string | undefined);
  const phone = settings.phone as string | undefined;
  const stats = data?.stats;

  const welcomeTitle =
    cleanPublicText(data?.homeFeaturesTitle) || `Welcome to ${name}`;
  const welcomeBody =
    cleanPublicText(data?.homeFeaturesSubtitle) ||
    (about ? cleanPublicText(about) : "");

  // Split the intro so the first sentence can carry the serif display treatment.
  const [welcomeLead, welcomeRest] = (() => {
    const parts = welcomeBody
      .split(/(?<=[.!?])\s+/)
      .map((part) => part.trim())
      .filter(Boolean);
    if (parts.length < 2) return [welcomeBody, ""];
    return [parts[0], parts.slice(1).join(" ")];
  })();

  const activeOnly = <T,>(items?: T[]) =>
    (items ?? []).filter((item) =>
      isPublicItemActive(item as unknown as Record<string, unknown>)
    );

  const services = activeOnly(data?.services).slice(0, 6);
  const departments = activeOnly(data?.departments).slice(0, 7);
  const doctors = activeOnly(data?.doctors).slice(0, 10);
  const gallery = activeOnly(data?.gallery).slice(0, 7);
  const testimonials = (data?.testimonials ?? []).slice(0, 5);
  const newsPosts = activeOnly(
    data?.news?.length ? data.news : data?.announcements ?? []
  ).slice(0, 5);

  const metricItems = [
    stats?.total_doctors != null
      ? { value: Number(stats.total_doctors), label: "Doctors" }
      : null,
    stats?.total_departments != null
      ? { value: Number(stats.total_departments), label: "Departments" }
      : null,
    stats?.total_patients != null
      ? {
          value: Number(stats.total_patients),
          label:
            (settings.patients_label as string) || "Catchment population",
        }
      : null,
    stats?.years_experience != null && Number(stats.years_experience) > 0
      ? { value: Number(stats.years_experience), label: "Years of service" }
      : null,
  ].filter(Boolean) as Array<{ value: number; label: string }>;

  const departmentEntries: IndexEntry[] = departments.map((dept) => ({
    key: String(dept.id),
    href: `/departments/${dept.slug}`,
    title: dept.name,
    description: dept.short_description || dept.description || undefined,
    image: getImageFromItem(dept as unknown as Record<string, unknown>),
  }));

  // Cards for the stacked carousel under the hero. Gallery entries first; the
  // hero image list is the fallback for tenants that have not filled a gallery.
  const stackSlides: StackSlide[] = (gallery.length
    ? gallery.map((item) => ({
        key: `gal-${item.id}`,
        href: `/gallery/${item.slug}`,
        title: cleanPublicText(item.title) || item.title,
        description:
          truncate(
            cleanPublicText(item.short_description || item.description || ""),
            120
          ) || undefined,
        label: item.category || "On campus",
        image: getImageFromItem(item as unknown as Record<string, unknown>),
      }))
    : (data?.heroImages ?? []).map((image, i) => ({
        key: `hero-${i}`,
        href: "/gallery",
        title: cleanPublicText(image.title || image.alt || "") || `${name} campus`,
        description: undefined,
        label: "On campus",
        image: getImageFromItem(image as unknown as Record<string, unknown>),
      }))
  ).filter((slide) => Boolean(slide.image));

  // Photographs for the hero backdrop. Priority is the reverse of the carousel's:
  // heroImages are the ones a tenant picked *for* the hero, so they come first
  // and the gallery is the fallback. Same URLs either way, so the browser has
  // them cached by the time the carousel scrolls into view.
  const heroShots: string[] = (
    (data?.heroImages ?? []).length
      ? (data?.heroImages ?? []).map((image) =>
          getImageFromItem(image as unknown as Record<string, unknown>)
        )
      : stackSlides.map((slide) => slide.image)
  ).filter((src): src is string => Boolean(src));

  if (isLoading) {
    return <div className="min-h-[80vh]" />;
  }

  return (
    <>
      <NovaHero
        data={data}
        name={name}
        tagline={tagline}
        about={about}
        emergency={emergency}
        images={heroShots}
      />

      {/* ── Gallery carousel ────────────────────────────────────────────── */}
      {stackSlides.length > 0 && (
        <section className="nv-section nv-section--tight">
          <div className="nv-shell nv-shell--wide">
            <NovaReveal from="up">
              <NovaGalleryStack slides={stackSlides} interval={4200} />
            </NovaReveal>
          </div>
        </section>
      )}

      {/* ── Welcome ─────────────────────────────────────────────────────── */}
      <section className="nv-section">
        <div className="nv-shell nv-shell--wide">
          <div className="nv-welcome">
            <NovaReveal from="up">
              <p className="nv-eyebrow">The hospital</p>

              <h2 className="nv-welcome__title">
                <NovaWords text={welcomeTitle} accentFrom={1} />
              </h2>

              {welcomeLead && (
                <p className="nv-welcome__lead">{welcomeLead}</p>
              )}
              {welcomeRest && (
                <p className="nv-welcome__rest">{welcomeRest}</p>
              )}

              <div className="nv-welcome__actions">
                <Link href="/about" className="nv-btn nv-btn--primary">
                  About us
                  <ArrowUpRight className="h-4 w-4" />
                </Link>
                <Link href="/services" className="nv-btn nv-btn--glass">
                  All services
                  <ArrowUpRight className="h-4 w-4" />
                </Link>
              </div>
            </NovaReveal>


          </div>
        </div>
      </section>



      {/* ── Services ────────────────────────────────────────────────────── */}
      <section className="nv-section">
        <div className="nv-shell nv-shell--wide">
          <NovaSectionHead
            eyebrow="Services"
            title="What we offer"
            accentFrom={2}
            lede="Core clinical services running across outpatient, inpatient, and emergency care — every one staffed by a dedicated team."
            count={`· ${String(services.length).padStart(2, "0")}`}
            action={
              <Link href="/services" className="nv-btn nv-btn--glass">
                View all services
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            }
          />

          <div className="nv-grid-3 mt-12">
            {services.length ? (
              services.map((service, i) => (
                <NovaReveal
                  key={service.id}
                  from="up"
                  delay={Math.min(i, 5) * 0.14}
                >
                  <NovaContentCard
                    href={`/services/${service.slug}`}
                    title={service.name}
                    description={
                      service.short_description || service.description || undefined
                    }
                    image={getImageFromItem(
                      service as unknown as Record<string, unknown>
                    )}
                    kicker="Clinical service"
                  />
                </NovaReveal>
              ))
            ) : (
              <div className="sm:col-span-2 lg:col-span-3">
                <NovaEmpty
                  title="Services coming soon"
                  description="This list fills in as the hospital publishes its service catalogue."
                />
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── Departments index ───────────────────────────────────────────── */}
      <section className="nv-section nv-section--tight">
        <div className="nv-shell nv-shell--wide">
          <NovaSectionHead
            eyebrow="Departments"
            title="Clinical units under one roof"
            accentFrom={2}
            lede="Specialty teams working side by side, so a patient can move from triage to theatre without leaving the campus."
            action={
              <Link href="/departments" className="nv-btn nv-btn--glass">
                View all departments
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            }
          />

          <div className="mt-12">
            {departmentEntries.length ? (
              <NovaDeptIndex entries={departmentEntries} />
            ) : (
              <NovaEmpty title="Departments coming soon" />
            )}
          </div>
        </div>
      </section>

      {/* ── Metrics ─────────────────────────────────────────────────────── */}
      {metricItems.length > 0 && (
        <section className="nv-section nv-section--tight">
          <div className="nv-shell nv-shell--wide">
            <NovaReveal className="nv-metrics" from="up">

              <div className="relative z-10">
                <p className="nv-eyebrow">At a glance</p>
                <h2 className="nv-h2 mt-4">
                  <NovaWords text="Hospital figures" accentFrom={1} />
                </h2>
                <p className="nv-lede mt-3 max-w-[56ch]">
                  People, years, and capacity behind everyday clinical care.
                </p>
              </div>

              <div className="nv-figs">
                {metricItems.map((item) => (
                  <NovaMetricCard
                    key={item.label}
                    value={item.value}
                    label={item.label}
                  />
                ))}
              </div>
            </NovaReveal>
          </div>
        </section>
      )}

      {/* ── Doctors ─────────────────────────────────────────────────────── */}
      <section className="nv-section">
        <div className="nv-shell nv-shell--wide">
          <NovaSectionHead
            eyebrow="Clinical staff"
            title="The people who treat you"
            accentFrom={3}
            lede="Specialists and general practitioners providing care across every hospital department."
            action={
              <Link href="/doctors" className="nv-btn nv-btn--glass">
                Full directory
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            }
          />

          <div className="mt-12">
            {doctors.length ? (
              <NovaRail label="Our doctors">
                {doctors.map((doctor) => {
                  const fullName = [
                    doctor.title,
                    doctor.first_name,
                    doctor.last_name,
                  ]
                    .filter(Boolean)
                    .join(" ");
                  return (
                    <NovaDoctorCard
                      key={doctor.id}
                      href={`/doctors/${doctor.slug}`}
                      name={fullName}
                      role={doctor.designation || undefined}
                      department={doctor.department?.name || undefined}
                      photo={getImageFromItem(
                        doctor as unknown as Record<string, unknown>
                      )}
                    />
                  );
                })}
              </NovaRail>
            ) : (
              <NovaEmpty title="Doctors coming soon" />
            )}
          </div>
        </div>
      </section>

      {/* ── Testimonials ────────────────────────────────────────────────── */}
      {testimonials.length > 0 && (
        <section className="nv-section nv-section--tight">
          <div className="nv-shell nv-shell--wide">
            <NovaSectionHead
              eyebrow="Patient voices"
              title="Words from the people we serve"
              accentFrom={4}
              action={
                <Link href="/testimonials" className="nv-btn nv-btn--glass">
                  All stories
                  <ArrowUpRight className="h-4 w-4" />
                </Link>
              }
            />

            <div className="nv-quote-split mt-12">
              <NovaReveal from="up">
                <NovaTestimonials items={testimonials} />
              </NovaReveal>

              <div className="grid gap-4">
                <NovaReveal from="right" delay={0.1}>
                  <NovaFact
                    icon={HeartPulse}
                    title="Treated with dignity"
                    description="Every ward runs on the same standard of respect, privacy, and clear explanation."
                  />
                </NovaReveal>
                <NovaReveal from="right" delay={0.2}>
                  <NovaFact
                    icon={Sparkles}
                    title="Continuously improving"
                    description="Patient feedback feeds directly into how our departments plan the next quarter."
                  />
                </NovaReveal>
                <NovaReveal from="right" delay={0.3}>
                  <NovaFact
                    icon={Stethoscope}
                    title="Second opinions welcome"
                    description="Ask any clinician for a referral — our specialists review cases together."
                  />
                </NovaReveal>
              </div>
            </div>
          </div>
        </section>
      )}



      {/* ── News & notices ──────────────────────────────────────────────── */}
      <section className="nv-section">
        <div className="nv-shell nv-shell--wide">
          <NovaSectionHead
            eyebrow="Updates"
            title="News & notices"
            accentFrom={1}
            lede="Announcements, service changes, and stories from across the hospital."
            action={
              <Link href="/news" className="nv-btn nv-btn--glass">
                All updates
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            }
          />

          <div className="nv-quote-split mt-12">
            <div className="nv-news-list">
              {newsPosts.length ? (
                newsPosts.map((post, i) => (
                  <NovaReveal
                    key={post.id}
                    from="left"
                    delay={Math.min(i, 4) * 0.12}
                  >
                    <NovaNewsRow
                      href={`/news/${post.slug}`}
                      index={i}
                      date={
                        post.created_at ? formatDate(post.created_at) : undefined
                      }
                      title={cleanPublicText(post.title || post.name || "")}
                      excerpt={truncate(
                        cleanPublicText(
                          post.excerpt || post.short_description || post.content || ""
                        ),
                        130
                      )}
                    />
                  </NovaReveal>
                ))
              ) : (
                <NovaEmpty
                  title="No updates yet"
                  description="Hospital notices and announcements will appear here."
                />
              )}
            </div>

            <div className="grid gap-4">
              <NovaReveal from="right" delay={0.1}>
                <NovaFact
                  icon={Siren}
                  title="Emergency line"
                  description={
                    emergency
                      ? `Call ${emergency} — the emergency desk answers day and night.`
                      : "Our emergency desk answers day and night, every day of the year."
                  }
                />
              </NovaReveal>
              <NovaReveal from="right" delay={0.2}>
                <NovaFact
                  icon={MapPin}
                  title="Find the campus"
                  description={
                    address ||
                    "Siraro District, West Arsi Zone, Oromia Region, Ethiopia."
                  }
                />
              </NovaReveal>
            </div>
          </div>
        </div>
      </section>

      {/* ── Partners ────────────────────────────────────────────────────── */}
      {partners.length > 0 && (
        <section className="nv-section nv-section--tight">
          <div className="nv-shell nv-shell--wide">
            <NovaSectionHead
              eyebrow="Collaboration"
              title="Our strategic partners"
              accentFrom={2}
              lede="Institutions and organisations that help us reach further into the district."
              action={
                <Link href="/partnerships" className="nv-btn nv-btn--glass">
                  All partners
                  <ArrowUpRight className="h-4 w-4" />
                </Link>
              }
            />

            <div className="nv-grid-3 mt-12">
              {partners.map((partner, i) => (
                <NovaReveal
                  key={partner.id}
                  from="up"
                  delay={Math.min(i, 5) * 0.14}
                >
                  <NovaPartnerCard partner={partner} />
                </NovaReveal>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Visit / CTA ─────────────────────────────────────────────────── */}
      <section className="nv-section">
        <div className="nv-shell nv-shell--wide">
          <NovaReveal className="nv-visit" from="up">

            <div className="nv-visit__grid">
              <div>
                <p className="nv-eyebrow">Plan your visit</p>
                <h2 className="nv-visit__title">
                  <NovaWords text="We are open, and ready for you" accentFrom={4} />
                </h2>
                <p className="nv-visit__lede">
                  Walk in for outpatient care, call ahead for referrals, or reach
                  the emergency desk at any hour of the day.
                </p>
              </div>

              <div className="nv-visit__actions">
                {emergency ? (
                  <a
                    href={`tel:${emergency}`}
                    className="nv-btn nv-btn--primary nv-btn--lg"
                  >
                    <Phone className="h-4 w-4" />
                    Call {emergency}
                  </a>
                ) : (
                  <Link
                    href="/emergency"
                    className="nv-btn nv-btn--primary nv-btn--lg"
                  >
                    <Siren className="h-4 w-4" />
                    Emergency services
                  </Link>
                )}

                <Link href="/emergency" className="nv-btn nv-btn--glass nv-btn--lg">
                  <Siren className="h-4 w-4" />
                  Emergency services
                </Link>

                <Link href="/contact" className="nv-btn nv-btn--ghost">
                  Contact & directions
                  <ArrowUpRight className="h-4 w-4" />
                </Link>
              </div>
            </div>

            <div className="nv-visit__meta">
              <div className="nv-visit__meta-item">
                <span className="nv-visit__meta-ico" aria-hidden>
                  <MapPin />
                </span>
                <span>
                  <span className="nv-visit__meta-label block">Address</span>
                  <span className="nv-visit__meta-value block">
                    {address || "Siraro District, West Arsi, Oromia, Ethiopia"}
                  </span>
                </span>
              </div>

              <div className="nv-visit__meta-item">
                <span className="nv-visit__meta-ico" aria-hidden>
                  <Phone />
                </span>
                <span>
                  <span className="nv-visit__meta-label block">Reception</span>
                  <span className="nv-visit__meta-value block">
                    {phone || emergency || "Available on request"}
                  </span>
                </span>
              </div>

              <div className="nv-visit__meta-item">
                <span className="nv-visit__meta-ico" aria-hidden>
                  <Clock />
                </span>
                <span>
                  <span className="nv-visit__meta-label block">Emergency</span>
                  <span className="nv-visit__meta-value block">
                    Open 24 hours · 365 days
                  </span>
                </span>
              </div>
            </div>
          </NovaReveal>
        </div>
      </section>
    </>
  );
}






