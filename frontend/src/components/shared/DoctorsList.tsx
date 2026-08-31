"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Search, LayoutGrid, List, ArrowRight, Stethoscope, Building2, CheckCircle2, X } from "lucide-react";
import { useGetResourceListQuery } from "@/store/slices/apiSlice";
import { getImageFromItem } from "@/lib/media";
import type { Doctor } from "@/lib/types";
import EmptyState from "@/components/shared/EmptyState";
import { GridSkeleton } from "@/components/shared/Skeleton";
import PageTransition from "@/components/motion/PageTransition";
import NovaReveal from "@/components/nova/NovaReveal";
import SmartImage from "@/components/shared/SmartImage";
import { ClinicianRow } from "@/components/shared/PeopleProfiles";
import PublicPagination from "@/components/shared/PublicPagination";
import { isPublicItemActive, cleanPublicText } from "@/lib/utils";

export default function DoctorsList() {
  const searchParams = useSearchParams();
  const page = Math.max(1, Number(searchParams?.get("page")) || 1);
  const perPage = 12;

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDept, setSelectedDept] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const { data, isLoading, isError } = useGetResourceListQuery({
    resource: "doctors",
    page,
    perPage,
  });

  const rawDoctors = (data?.data ?? []) as Doctor[];
  const activeDoctors = useMemo(() => {
    return rawDoctors.filter((doc) =>
      isPublicItemActive(doc as unknown as Record<string, unknown>)
    );
  }, [rawDoctors]);

  // Extract unique departments for filter bar
  const departments = useMemo(() => {
    const set = new Set<string>();
    activeDoctors.forEach((doc) => {
      if (doc.department?.name) set.add(doc.department.name);
    });
    return Array.from(set).sort();
  }, [activeDoctors]);

  // Filtered doctors list based on search and department
  const filteredDoctors = useMemo(() => {
    return activeDoctors.filter((doc) => {
      const name = `${doc.title || ""} ${doc.first_name || ""} ${doc.last_name || ""}`.toLowerCase();
      const designation = (doc.designation || "").toLowerCase();
      const deptName = (doc.department?.name || "").toLowerCase();
      const query = searchQuery.toLowerCase().trim();

      const matchesSearch = !query || name.includes(query) || designation.includes(query) || deptName.includes(query);
      const matchesDept = selectedDept === "all" || doc.department?.name === selectedDept;

      return matchesSearch && matchesDept;
    });
  }, [activeDoctors, searchQuery, selectedDept]);

  if (isLoading) return <GridSkeleton count={8} />;

  if (isError || activeDoctors.length === 0) {
    return <EmptyState title="Doctor profiles coming soon" />;
  }

  return (
    <PageTransition>
      <div className="space-y-8">
        {/* Top Control Bar: Search + Department Filters + View Switcher */}
        <div className="rounded-2xl border border-[rgba(212,175,55,0.25)] bg-[linear-gradient(135deg,rgba(255,255,255,0.98),rgba(252,249,242,0.99))] p-4 sm:p-6 shadow-lg shadow-[rgba(0,0,0,0.03)] space-y-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-amber-700/60" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by specialist name, title or clinic..."
                className="w-full rounded-xl border border-amber-900/20 bg-white/90 pl-10 pr-9 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:border-amber-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* View Switcher & Counter */}
            <div className="flex items-center justify-between gap-4 md:justify-end">
              <span className="font-mono text-xs uppercase tracking-widest text-amber-900/80 font-semibold">
                {filteredDoctors.length} Specialist{filteredDoctors.length === 1 ? "" : "s"}
              </span>

              <div className="inline-flex rounded-xl border border-amber-900/15 bg-amber-50/50 p-1">
                <button
                  type="button"
                  onClick={() => setViewMode("grid")}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-mono text-xs font-medium transition-all ${
                    viewMode === "grid"
                      ? "bg-amber-700 text-white shadow-md shadow-amber-900/20"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <LayoutGrid className="h-3.5 w-3.5" />
                  Grid
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("list")}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-mono text-xs font-medium transition-all ${
                    viewMode === "list"
                      ? "bg-amber-700 text-white shadow-md shadow-amber-900/20"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <List className="h-3.5 w-3.5" />
                  List
                </button>
              </div>
            </div>
          </div>

          {/* Department Filter Tabs */}
          {departments.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-amber-900/10">
              <span className="text-xs font-mono uppercase tracking-wider text-slate-500 mr-2">Department:</span>
              <button
                type="button"
                onClick={() => setSelectedDept("all")}
                className={`rounded-full px-3.5 py-1.5 text-xs font-mono font-medium transition-all ${
                  selectedDept === "all"
                    ? "bg-amber-900 text-amber-100 shadow-sm"
                    : "bg-white border border-amber-900/15 text-slate-700 hover:border-amber-600 hover:bg-amber-50"
                }`}
              >
                All ({activeDoctors.length})
              </button>
              {departments.map((dept) => {
                const count = activeDoctors.filter((d) => d.department?.name === dept).length;
                return (
                  <button
                    key={dept}
                    type="button"
                    onClick={() => setSelectedDept(dept)}
                    className={`rounded-full px-3.5 py-1.5 text-xs font-mono font-medium transition-all ${
                      selectedDept === dept
                        ? "bg-amber-900 text-amber-100 shadow-sm"
                        : "bg-white border border-amber-900/15 text-slate-700 hover:border-amber-600 hover:bg-amber-50"
                    }`}
                  >
                    {dept} ({count})
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Content Display */}
        {filteredDoctors.length === 0 ? (
          <EmptyState
            title="No matching specialists found"
            description="Try clearing your search query or selecting a different department."
          />
        ) : viewMode === "grid" ? (
          /* Fancy 3-Column Doctor Card Grid */
          <div className="nv-doc-grid">
            {filteredDoctors.map((doc, i) => {
              const image = getImageFromItem(doc as unknown as Record<string, unknown>);
              const name = `${doc.title ? `${doc.title} ` : ""}${doc.first_name} ${doc.last_name}`;
              const cleanName = cleanPublicText(name) || name;
              const department = doc.department?.name;
              const initials = `${doc.first_name?.charAt(0) ?? ""}${doc.last_name?.charAt(0) ?? ""}`.toUpperCase() || "DR";
              const bioSnippet = doc.short_bio || doc.bio;

              return (
                <NovaReveal key={doc.id} from="up" delay={Math.min(i * 0.05, 0.4)} className="h-full w-full">
                  <Link href={`/doctors/${doc.slug}`} className="nv-doc-card group">
                    <div className="nv-doc-card__media">
                      {image ? (
                        <SmartImage
                          src={image}
                          alt=""
                          fill
                          optimizeWidth={600}
                          className="nv-doc-card__img"
                          sizes="(max-width: 640px) 100vw, (max-width: 1080px) 50vw, 33vw"
                        />
                      ) : (
                        <span className="nv-doc-card__fallback">{initials}</span>
                      )}

                      {/* Department Tag Pill */}
                      {department && (
                        <span className="nv-doc-card__dept-pill">
                          <Building2 className="h-3 w-3 text-amber-300" />
                          {department}
                        </span>
                      )}

                      {/* Available Today Indicator */}
                      <span className="nv-doc-card__avail">
                        <span className="nv-doc-card__avail-dot" />
                        Available
                      </span>
                    </div>

                    <div className="nv-doc-card__body">
                      <div>
                        <h3 className="nv-doc-card__name">{cleanName}</h3>
                        {doc.designation && (
                          <p className="nv-doc-card__role">
                            <Stethoscope className="inline-block h-3 w-3 mr-1 text-amber-700" />
                            {doc.designation}
                          </p>
                        )}
                        {bioSnippet && (
                          <p className="nv-doc-card__desc">
                            {cleanPublicText(bioSnippet)}
                          </p>
                        )}
                      </div>

                      <div className="nv-doc-card__foot">
                        <span className="nv-doc-card__cta">
                          View profile
                          <ArrowRight />
                        </span>
                        <span className="text-[10px] font-mono tracking-wider uppercase text-amber-800 font-semibold bg-amber-100/80 px-2 py-0.5 rounded border border-amber-900/10">
                          Consultation
                        </span>
                      </div>
                    </div>
                  </Link>
                </NovaReveal>
              );
            })}
          </div>
        ) : (
          /* Directory List View */
          <ul className="nv-dir__rows">
            {filteredDoctors.map((doc, i) => {
              const image = getImageFromItem(doc as unknown as Record<string, unknown>);
              const name = `${doc.title ? `${doc.title} ` : ""}${doc.first_name} ${doc.last_name}`;
              const department = doc.department?.name;

              return (
                <li key={doc.id}>
                  <ClinicianRow
                    href={`/doctors/${doc.slug}`}
                    name={name}
                    designation={doc.designation || undefined}
                    department={department}
                    image={image}
                    index={i}
                  />
                </li>
              );
            })}
          </ul>
        )}

        {/* Public Pagination Bar */}
        <PublicPagination
          currentPage={page}
          totalItems={activeDoctors.length}
          perPage={perPage}
          basePath="/doctors"
        />
      </div>
    </PageTransition>
  );
}
