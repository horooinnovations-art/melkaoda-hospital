"use client";

import { Building2, Stethoscope } from "lucide-react";
import { useGetResourceItemQuery } from "@/store/slices/apiSlice";
import Prose from "@/components/shared/Prose";
import EmptyState from "@/components/shared/EmptyState";
import { DetailSkeleton } from "@/components/shared/Skeleton";
import SmartImage from "@/components/shared/SmartImage";
import DetailShell, {
  DetailDivider,
  DetailLinkChip,
  DetailPanel,
  type DetailBadge,
} from "@/components/shared/DetailShell";
import { getImageFromItem } from "@/lib/media";
import type { Doctor } from "@/lib/types";

export default function DoctorDetail({ slug }: { slug: string }) {
  const { data, isLoading, isError } = useGetResourceItemQuery({
    resource: "doctors",
    idOrSlug: slug,
  });

  if (isLoading) {
    return (
      <DetailShell
        title="Loading doctor"
        backHref="/doctors"
        backLabel="All Doctors"
        width="wide"
      >
        <DetailPanel>
          <DetailSkeleton />
        </DetailPanel>
      </DetailShell>
    );
  }

  if (isError || !data) {
    return (
      <DetailShell
        title="Doctor not found"
        backHref="/doctors"
        backLabel="All Doctors"
        width="wide"
      >
        <DetailPanel>
          <EmptyState title="Doctor not found" />
          <div className="mt-6">
            <DetailLinkChip href="/doctors">All Doctors</DetailLinkChip>
          </div>
        </DetailPanel>
      </DetailShell>
    );
  }

  const doc = data as Doctor;
  const image = getImageFromItem(doc as unknown as Record<string, unknown>);
  const name = `${doc.title ? `${doc.title} ` : ""}${doc.first_name} ${doc.last_name}`;
  const department = (doc as { department?: { name?: string } }).department
    ?.name;
  const initials =
    `${doc.first_name?.charAt(0) ?? ""}${doc.last_name?.charAt(0) ?? ""}`.toUpperCase() ||
    "DR";

  const badges: DetailBadge[] = [];
  if (doc.designation)
    badges.push({ icon: Stethoscope, label: doc.designation, tone: "teal" });
  if (department)
    badges.push({ icon: Building2, label: department, tone: "brass" });

  return (
    <DetailShell
      title={name}
      subtitle={doc.designation}
      badges={badges}
      backHref="/doctors"
      backLabel="All Doctors"
      width="wide"
    >
      <article className="g-dossier">
        <header className="g-dossier__identity">
          <div className="group g-dossier__photo relative overflow-hidden rounded-xl border border-slate-200/80 transition-all duration-500 hover:-translate-y-1 hover:border-teal-400/80 hover:shadow-xl hover:shadow-teal-500/20 cursor-pointer isolate">
            {image ? (
              <SmartImage
                src={image}
                alt={name}
                fill
                optimizeWidth={480}
                className="object-contain object-center p-1 transition-transform duration-700 ease-out"
                sizes="140px"
                priority
              />
            ) : (
              <span className="g-dossier__fallback transition-transform duration-500 group-hover:scale-105">{initials}</span>
            )}
          </div>
          <div className="g-dossier__meta">
            <p className="g-dossier__kicker">Clinical staff</p>
            <h2 className="g-dossier__name">{name}</h2>
            {doc.designation ? (
              <p className="g-dossier__role">{doc.designation}</p>
            ) : null}
            {department ? (
              <p className="g-dossier__dept">{department}</p>
            ) : null}
          </div>
        </header>

        <section className="g-dossier__body">
          <h3 className="g-dossier__section">Biography</h3>
          {doc.bio ? (
            doc.bio.includes("<") ? (
              <Prose html={doc.bio} />
            ) : (
              <p className="g-dossier__plain">{doc.bio}</p>
            )
          ) : (
            <p className="g-dossier__plain">
              A full clinical biography will appear here once published.
            </p>
          )}
        </section>
      </article>

      <DetailDivider delay={0.08} />
      <div className="nv-dfooter">
        <DetailLinkChip href="/doctors">Browse all doctors</DetailLinkChip>
      </div>
    </DetailShell>
  );
}
