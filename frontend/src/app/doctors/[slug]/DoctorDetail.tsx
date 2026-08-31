"use client";

import Link from "next/link";
import { Building2, Stethoscope, UserRound, Calendar, ShieldCheck } from "lucide-react";
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
import { cleanPublicText } from "@/lib/utils";

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
  const cleanName = cleanPublicText(name) || name;
  const department = (doc as { department?: { name?: string } }).department?.name;
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
      title={cleanName}
      subtitle={doc.designation}
      badges={badges}
      backHref="/doctors"
      backLabel="All Doctors"
      width="wide"
    >
      <div className="nv-dsplit items-start">
        {/* Prominent Uncropped Doctor Portrait Card */}
        <DetailPanel className="nv-portrait !h-auto self-start border border-[rgba(212,175,55,0.3)] bg-[linear-gradient(145deg,rgba(255,255,255,0.99),rgba(252,249,242,0.98))] shadow-xl transition-all duration-500 hover:border-[rgba(255,215,0,0.65)] hover:shadow-2xl" delay={0.04}>
          <div className="nv-portrait__media relative aspect-[4/5] min-h-[320px] max-h-[440px] w-full overflow-hidden bg-[linear-gradient(135deg,#1b1409_0%,#2f230c_100%)] p-2">
            {image ? (
              <SmartImage
                src={image}
                alt={cleanName}
                fill
                optimizeWidth={720}
                className="object-contain object-top p-1 transition-transform duration-700 ease-out hover:scale-[1.025]"
                sizes="(max-width: 1024px) 100vw, 360px"
                priority
              />
            ) : (
              <div className="nv-portrait__fallback flex items-center justify-center font-display text-4xl font-bold text-amber-200/40">
                {initials}
              </div>
            )}

            {/* Glowing Department Tag Pill */}
            {department && (
              <span className="absolute top-3 left-3 z-10 inline-flex items-center gap-1.5 rounded-full border border-amber-400/40 bg-black/75 px-3 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider text-amber-200 backdrop-blur-md shadow-md">
                <Building2 className="h-3 w-3 text-amber-400" />
                {department}
              </span>
            )}

            {/* Glowing Availability Badge */}
            <span className="absolute top-3 right-3 z-10 inline-flex items-center gap-1.5 rounded-full border border-emerald-400/40 bg-emerald-950/85 px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider text-emerald-300 backdrop-blur-md shadow-md">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#4ade80] animate-pulse" />
              Available
            </span>
          </div>

          <div className="p-5 border-t border-amber-900/10 bg-amber-50/30">
            <p className="font-display text-lg font-bold text-slate-900 leading-tight">{cleanName}</p>
            {doc.designation && (
              <p className="mt-1 font-mono text-xs font-medium uppercase tracking-wider text-amber-800">
                {doc.designation}
              </p>
            )}
            {department && (
              <p className="mt-2 text-xs text-slate-600 flex items-center gap-1.5 font-medium">
                <Building2 className="h-3.5 w-3.5 text-amber-700 shrink-0" />
                {department} Department
              </p>
            )}
          </div>
        </DetailPanel>

        {/* Doctor Information & Biography Stack */}
        <div className="nv-dstack flex-1 space-y-6">
          <DetailPanel delay={0.08}>
            <div className="nv-dpanel__label">
              <span className="nv-dpanel__icon" aria-hidden>
                <UserRound className="h-4 w-4 text-amber-700" />
              </span>
              <div>
                <p className="nv-dpanel__kicker">Clinical specialist</p>
                <h3 className="nv-dpanel__title">Biography & Credentials</h3>
              </div>
            </div>

            {doc.bio ? (
              doc.bio.includes("<") ? (
                <Prose html={doc.bio} />
              ) : (
                <p className="nv-dplain leading-relaxed text-slate-700">{doc.bio}</p>
              )
            ) : (
              <p className="nv-dplain text-slate-500 italic">
                A detailed clinical biography and background qualifications for {cleanName} will be updated shortly.
              </p>
            )}
          </DetailPanel>

          {/* Quick Clinic Information Box */}
          <DetailPanel delay={0.12} className="border border-amber-900/15 bg-amber-50/40 p-6 rounded-2xl space-y-4">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-900 text-amber-100 shadow-md">
                <ShieldCheck className="h-5 w-5" />
              </span>
              <div>
                <h4 className="font-display text-base font-semibold text-slate-900">Hospital Consultation</h4>
                <p className="text-xs text-slate-600">Qualified specialist at Melka Oda General Hospital</p>
              </div>
            </div>

            <div className="pt-2 flex flex-wrap items-center gap-3">
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 rounded-xl bg-amber-800 px-4 py-2.5 font-mono text-xs font-semibold uppercase tracking-wider text-white shadow-md hover:bg-amber-900 transition-all"
              >
                <Calendar className="h-4 w-4" />
                Book Consultation
              </Link>
              <Link
                href="/doctors"
                className="inline-flex items-center gap-2 rounded-xl border border-amber-900/20 bg-white px-4 py-2.5 font-mono text-xs font-semibold uppercase tracking-wider text-slate-800 hover:bg-amber-50 transition-all"
              >
                All Specialists
              </Link>
            </div>
          </DetailPanel>
        </div>
      </div>

      <DetailDivider delay={0.14} />
      <div className="nv-dfooter">
        <DetailLinkChip href="/doctors">Browse all doctors</DetailLinkChip>
      </div>
    </DetailShell>
  );
}
