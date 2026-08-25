"use client";

import Link from "next/link";
import { ArrowRight, Phone } from "lucide-react";
import { useGetHomeQuery } from "@/store/slices/apiSlice";
import { SITE_NAME, DEFAULT_TAGLINE } from "@/lib/api";
import type { HomeData } from "@/lib/types";
import { getImageFromItem } from "@/lib/media";
import {
  cleanPublicText,
  formatDate,
  isPublicItemActive,
  truncate,
} from "@/lib/utils";
import Reveal from "@/components/motion/Reveal";
import PageTransition from "@/components/motion/PageTransition";
import EmptyState from "@/components/shared/EmptyState";
import { ClinicianRow } from "@/components/shared/PeopleProfiles";
import HomeHero from "@/components/vitals/HomeHero";
import SectionIntro from "@/components/vitals/SectionIntro";
import {
  DepartmentCard,
  MetricCard,
  ServiceCard,
  PartnerCard,
} from "@/components/vitals/HomeShowcaseCards";
import { getStoredPartners } from "@/lib/partnersData";

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

  const partners = getStoredPartners().slice(0, 6);

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
  const stats = data?.stats;

  const welcomeTitle =
    cleanPublicText(data?.homeFeaturesTitle) || `Welcome to ${name}`;
  const welcomeBody =
    cleanPublicText(data?.homeFeaturesSubtitle) ||
    (about ? cleanPublicText(about) : "");
  const welcomeLead = (() => {
    const parts = welcomeBody
      .split(/(?<=[.!?])\s+/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (parts.length < 2) return { lead: welcomeBody, rest: "" };
    return { lead: parts[0], rest: parts.slice(1).join(" ") };
  })();
  const welcomeTitleParts = (() => {
    const match = welcomeTitle.match(/^(Welcome(?:\s+to)?)\s+(.+)$/i);
    if (match) return { prefix: match[1], name: match[2] };
    return { prefix: "", name: welcomeTitle };
  })();

  const newsPosts = (
    data?.news?.length ? data.news : data?.announcements ?? []
  )
    .filter((item) => isPublicItemActive(item as unknown as Record<string, unknown>))
    .slice(0, 5);

  const metricItems = [
    stats?.total_doctors != null
      ? { value: Number(stats.total_doctors), label: "Doctors" }
      : null,
    stats?.total_departments != null
      ? { value: Number(stats.total_departments), label: "Departments" }
      : null,
    stats?.total_patients != null
      ? { value: Number(stats.total_patients), label: (settings.patients_label as string) || "Catchment Population" }
      : null,
    stats?.years_experience != null && Number(stats.years_experience) > 0
      ? { value: Number(stats.years_experience), label: "Years of service" }
      : null,
  ].filter(Boolean) as Array<{ value: number; label: string }>;

  if (isLoading) {
    return <div className="sgate -mx-[calc((100vw-100%)/2)] w-screen min-h-[70vh]" />;
  }

  return (
    <PageTransition>
      <HomeHero
        data={data}
        name={name}
        tagline={tagline}
        about={about}
        emergency={emergency}
      />

      <div className="g-home">
        <section className="g-section g-section--welcome">
          <div className="mx-auto max-w-7xl px-5 lg:px-8">
            <Reveal fadeOut={false}>
              <div className="g-welcome">
                <div className="g-welcome__copy">
                  <p className="g-welcome__kicker">
                    Hospital
                  </p>

                  <h2 className="g-welcome__title">
                    {welcomeTitleParts.prefix ? (
                      <>
                        <span className="g-welcome__title-prefix">
                          {welcomeTitleParts.prefix}
                        </span>
                        <span className="g-welcome__title-name">
                          {welcomeTitleParts.name}
                        </span>
                      </>
                    ) : (
                      <span className="g-welcome__title-name">
                        {welcomeTitle}
                      </span>
                    )}
                  </h2>

                  {welcomeBody && (
                    <div className="g-welcome__prose">
                      <p className="g-welcome__lede">
                        {welcomeLead.rest ? (
                          <>
                            <span className="g-welcome__lede-lead">
                              {welcomeLead.lead}
                            </span>{" "}
                            <span className="g-welcome__lede-rest">
                              {welcomeLead.rest}
                            </span>
                          </>
                        ) : (
                          welcomeBody
                        )}
                      </p>
                    </div>
                  )}
                </div>

                <div className="g-welcome__aside">
                  <div className="g-welcome__actions">
                    <Link href="/about" className="g-btn g-btn--ink">
                      About us
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                    <Link href="/services" className="g-btn g-btn--ghost">
                      All services
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        {/* Strategic Partnerships Section - Before Services We Offer */}
        <section className="g-section bg-gradient-to-b from-white via-slate-50/50 to-white">
          <div className="mx-auto max-w-7xl px-5 lg:px-8">
            <SectionIntro
              eyebrow="Collaboration"
              title="Our Strategic Partners"
              description="Working together with government bureaus, global foundations, and medical institutions to advance healthcare in Ethiopia."
              action={
                <Link href="/about#partnerships" className="g-btn g-btn--ghost">
                  View all partners
                </Link>
              }
            />
            <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {partners.map((partner, i) => (
                <Reveal key={partner.id} delay={Math.min(i, 5) * 0.07} from="up">
                  <PartnerCard partner={partner} />
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        <section className="g-section g-section--contrast">
          <div className="mx-auto max-w-7xl px-5 lg:px-8">
            <SectionIntro
              eyebrow="Services"
              title="What we offer"
              description="Core clinical services available across outpatient, inpatient, and emergency care."
              action={
                <Link href="/services" className="g-btn g-btn--ghost">
                  View all
                </Link>
              }
            />
            <div className="g-band-stack mt-10">
              {data?.services?.length ? (
                data.services
                  .filter((svc) => isPublicItemActive(svc as unknown as Record<string, unknown>))
                  .slice(0, 6)
                  .map((svc, i) => (
                  <Reveal
                    key={svc.id}
                    delay={Math.min(i, 5) * 0.07}
                    from="left"
                  >
                    <ServiceCard
                      href={`/services/${svc.slug}`}
                      title={svc.name}
                      description={
                        svc.short_description || svc.description || undefined
                      }
                      image={getImageFromItem(
                        svc as unknown as Record<string, unknown>
                      )}
                      index={i}
                    />
                  </Reveal>
                ))
              ) : (
                <EmptyState title="Services coming soon" />
              )}
            </div>
          </div>
        </section>

        <section className="g-section">
          <div className="mx-auto max-w-7xl px-5 lg:px-8">
            <SectionIntro
              eyebrow="Departments"
              title="Clinical units"
              description="Specialty teams working together under one roof."
              action={
                <Link href="/departments" className="g-btn g-btn--ghost">
                  View all
                </Link>
              }
            />

            <div className="g-band-stack mt-7">
              {data?.departments?.length ? (
                data.departments
                  .filter((dept) => isPublicItemActive(dept as unknown as Record<string, unknown>))
                  .slice(0, 6)
                  .map((dept, i) => (
                  <Reveal
                    key={dept.id}
                    delay={Math.min(i, 5) * 0.07}
                    from="left"
                  >
                    <DepartmentCard
                      href={`/departments/${dept.slug}`}
                      title={dept.name}
                      description={
                        dept.short_description || dept.description || undefined
                      }
                      image={getImageFromItem(
                        dept as unknown as Record<string, unknown>
                      )}
                      index={i}
                    />
                  </Reveal>
                ))
              ) : (
                <EmptyState title="Departments coming soon" />
              )}
            </div>
          </div>
        </section>

        {metricItems.length > 0 && (
          <section className="g-section relative overflow-hidden bg-gradient-to-b from-slate-50/80 via-sky-50/20 to-slate-50/80">
            {/* Atmospheric glow backdrop */}
            <div
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_0%,rgba(14,165,233,0.08),transparent_70%)]"
              aria-hidden
            />

            <div className="relative z-10 mx-auto max-w-7xl px-5 lg:px-8">
              <SectionIntro
                eyebrow="At a glance"
                title="Hospital figures"
                description="People, years, and capacity behind everyday clinical care."
              />
              <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
                {metricItems.map((item, i) => (
                  <Reveal key={item.label} delay={i * 0.08} from="up" className="h-full">
                    <MetricCard value={item.value} label={item.label} index={i} />
                  </Reveal>
                ))}
              </div>
            </div>
          </section>
        )}

        <section className="g-section g-section--team">
          <div className="mx-auto max-w-5xl px-5 lg:px-8">
            <SectionIntro
              eyebrow="Clinical staff"
              title="Our doctors"
              description="Specialists providing care across hospital departments."
              action={
                <Link href="/doctors" className="g-btn g-btn--ghost">
                  Full directory
                </Link>
              }
            />
            {data?.doctors?.length ? (
              <ul className="g-clinic-list__rows mt-8">
                {data.doctors
                  .filter((doc) => isPublicItemActive(doc as unknown as Record<string, unknown>))
                  .slice(0, 6)
                  .map((doc, i) => {
                  const fullName = [doc.title, doc.first_name, doc.last_name]
                    .filter(Boolean)
                    .join(" ");
                  return (
                    <li key={doc.id}>
                      <ClinicianRow
                        href={`/doctors/${doc.slug}`}
                        name={fullName}
                        role={doc.designation || undefined}
                        department={doc.department?.name || undefined}
                        photo={getImageFromItem(
                          doc as unknown as Record<string, unknown>
                        )}
                        index={i}
                      />
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="mt-10">
                <EmptyState title="Doctors coming soon" />
              </div>
            )}
          </div>
        </section>

        <section className="g-section g-section--contrast">
          <div className="mx-auto max-w-7xl px-5 lg:px-8">
            <SectionIntro
              eyebrow="Updates"
              title="News & notices"
              description="Campus stories and announcements."
              action={
                <Link href="/news" className="g-btn g-btn--ghost">
                  All updates
                </Link>
              }
            />
            <div className="g-news mt-10">
              {newsPosts.length ? (
                newsPosts.map((post, i) => (
                  <Reveal key={post.id} delay={Math.min(i, 4) * 0.06} from="left">
                    <Link
                      href={
                        "slug" in post && post.slug
                          ? `/news/${post.slug}`
                          : "/announcements"
                      }
                      className="g-news__item group"
                    >
                      <span className="g-news__notch" aria-hidden />
                      <span className="g-news__sheen" aria-hidden />
                      <span className="g-news__index" aria-hidden>
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span className="g-news__date">
                        {formatDate(
                          (post as { published_at?: string }).published_at ||
                            (post as { created_at?: string }).created_at
                        )}
                      </span>
                      <span className="g-news__title">
                        <span className="g-news__title-text">
                          {cleanPublicText(post.title)}
                        </span>
                      </span>
                      {(post as { excerpt?: string }).excerpt && (
                        <p className="g-news__excerpt">
                          {truncate(
                            cleanPublicText(
                              (post as { excerpt?: string }).excerpt || ""
                            ),
                            140
                          )}
                        </p>
                      )}
                      <span className="g-news__go" aria-hidden>
                        <ArrowRight className="h-4 w-4" />
                      </span>
                    </Link>
                  </Reveal>
                ))
              ) : (
                <EmptyState title="No updates yet" />
              )}
            </div>
          </div>
        </section>

        <section className="g-section">
          <div className="mx-auto max-w-7xl px-5 lg:px-8">
            <Reveal from="up">
              <div className="g-visit">
                <div className="g-visit__glow" aria-hidden />
                <div>
                  <p className="g-kicker g-kicker--light">Visit</p>
                  <h2 className="g-visit__title">Need care today?</h2>
                  <p className="g-visit__lede">
                    {about
                      ? truncate(cleanPublicText(about), 160)
                      : "Our teams are ready for emergencies, outpatient visits, and admissions."}
                  </p>
                </div>
                <div className="g-visit__actions">
                  {emergency && (
                    <a href={`tel:${emergency}`} className="g-btn g-btn--signal">
                      <Phone className="h-4 w-4" />
                      {emergency}
                    </a>
                  )}
                  <Link
                    href="/emergency"
                    className="g-btn g-btn--ghost !text-white border-white/30 hover:border-white/60 hover:bg-white/10"
                  >
                    Emergency services
                  </Link>
                  <Link href="/contact" className="g-btn g-btn--sky">
                    Contact & directions
                  </Link>
                </div>
              </div>
            </Reveal>
          </div>
        </section>
      </div>
    </PageTransition>
  );
}
