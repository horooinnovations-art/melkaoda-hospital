"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Expand,
  Images,
  Sparkles,
  X,
  Eye,
  Layers,
} from "lucide-react";
import {
  useGetResourceListQuery,
  useGetSettingsQuery,
} from "@/store/slices/apiSlice";
import PageHero from "@/components/layout/PageHero";
import Reveal from "@/components/motion/Reveal";
import EmptyState from "@/components/shared/EmptyState";
import { GridSkeleton } from "@/components/shared/Skeleton";
import PageTransition from "@/components/motion/PageTransition";
import SmartImage from "@/components/shared/SmartImage";
import SectionIntro from "@/components/vitals/SectionIntro";
import { getImageFromItem } from "@/lib/media";
import { cn, isPublicItemActive, stripHtml } from "@/lib/utils";
import type { GalleryItem } from "@/lib/types";

function galleryHref(item: GalleryItem) {
  return `/gallery/${item.slug || item.id}`;
}

export default function GalleryPage() {
  const [category, setCategory] = useState<string>("all");
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const { data: settings } = useGetSettingsQuery();
  const { data, isLoading, isError } = useGetResourceListQuery({
    resource: "gallery",
    perPage: 48,
  });

  const items = useMemo(
    () =>
      ((data?.data ?? []) as GalleryItem[]).filter(
        (item) =>
          isPublicItemActive(item as unknown as Record<string, unknown>) &&
          Boolean(getImageFromItem(item as unknown as Record<string, unknown>))
      ),
    [data?.data]
  );

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const item of items) {
      if (item.category?.trim()) set.add(item.category.trim());
    }
    return Array.from(set).sort();
  }, [items]);

  const filtered = useMemo(() => {
    if (category === "all") return items;
    return items.filter((item) => item.category?.trim() === category);
  }, [items, category]);

  // Keyboard navigation for Lightbox
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (lightboxIndex === null) return;
      if (e.key === "Escape") setLightboxIndex(null);
      if (e.key === "ArrowLeft")
        setLightboxIndex((prev) => (prev !== null && prev > 0 ? prev - 1 : filtered.length - 1));
      if (e.key === "ArrowRight")
        setLightboxIndex((prev) => (prev !== null && prev < filtered.length - 1 ? prev + 1 : 0));
    },
    [lightboxIndex, filtered.length]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const heroSubtitle =
    (settings?.tagline as string | undefined) ||
    (settings?.about as string | undefined)?.replace(/<[^>]*>/g, "").slice(0, 160);

  const activeLightboxItem = lightboxIndex !== null ? filtered[lightboxIndex] : null;

  return (
    <PageTransition>
      <PageHero
        title="Gallery Showcase"
        eyebrow="Visual Stories & Campus Life"
        subtitle={heroSubtitle || "Explore moments from Gambo General Hospital's medical operations, community care, and clinical excellence."}
        breadcrumbs={[{ label: "Gallery" }]}
      />

      <div className="v-home-light relative -mx-[calc((100vw-100%)/2)] w-screen bg-gradient-to-b from-slate-900 via-[#07131e] to-slate-950 text-white">
        {/* Subtle grid pattern overlay */}
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:4rem_4rem]" aria-hidden />

        <section className="relative mx-auto max-w-7xl px-5 py-16 lg:px-8 lg:py-24">
          {/* Section Heading */}
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-sky-500/25 bg-sky-500/10 px-3.5 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-sky-400 backdrop-blur-md">
                <Sparkles className="h-3.5 w-3.5" />
                Featured Photography
              </div>
              <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
                Hospital Life & Care
              </h2>
              <p className="mt-2 max-w-xl text-base text-slate-400">
                {items.length > 0
                  ? `Showing ${filtered.length} of ${items.length} curated image${items.length === 1 ? "" : "s"} across our departments and community programs.`
                  : "Curated photography capturing everyday healthcare moments."}
              </p>
            </div>

            {/* Total counter badge */}
            <div className="flex items-center gap-2 shrink-0 rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 backdrop-blur-md">
              <Images className="h-5 w-5 text-sky-400" />
              <span className="font-display text-lg font-bold text-white">{filtered.length}</span>
              <span className="text-xs uppercase tracking-wider text-slate-400">Photos</span>
            </div>
          </div>

          {/* Category Filter Pills Bar */}
          {categories.length > 0 && (
            <Reveal delay={0.05} className="mt-8 flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={() => setCategory("all")}
                className={cn(
                  "group relative inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold uppercase tracking-[0.14em] transition-all duration-300",
                  category === "all"
                    ? "bg-gradient-to-r from-sky-500 to-teal-500 text-white shadow-lg shadow-sky-500/25 ring-1 ring-sky-400/40"
                    : "border border-white/10 bg-white/5 text-slate-300 hover:border-sky-400/40 hover:bg-white/10 hover:text-white"
                )}
              >
                <Layers className="h-3.5 w-3.5" />
                All Collection
                <span className={cn(
                  "ml-1 rounded-full px-2 py-0.5 text-[10px]",
                  category === "all" ? "bg-white/20 text-white" : "bg-white/10 text-slate-400"
                )}>
                  {items.length}
                </span>
              </button>

              {categories.map((cat) => {
                const count = items.filter((i) => i.category?.trim() === cat).length;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategory(cat)}
                    className={cn(
                      "inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold uppercase tracking-[0.14em] transition-all duration-300",
                      category === cat
                        ? "bg-gradient-to-r from-sky-500 to-teal-500 text-white shadow-lg shadow-sky-500/25 ring-1 ring-sky-400/40"
                        : "border border-white/10 bg-white/5 text-slate-300 hover:border-sky-400/40 hover:bg-white/10 hover:text-white"
                    )}
                  >
                    {cat}
                    <span className={cn(
                      "ml-1 rounded-full px-2 py-0.5 text-[10px]",
                      category === cat ? "bg-white/20 text-white" : "bg-white/10 text-slate-400"
                    )}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </Reveal>
          )}

          {/* Main Gallery Grid Container */}
          <div className="mt-12">
            {isLoading ? (
              <GridSkeleton count={9} />
            ) : isError ? (
              <EmptyState title="Unable to load gallery" description="Please try again shortly." />
            ) : filtered.length === 0 ? (
              <EmptyState
                title={category === "all" ? "Gallery coming soon" : "No photos in this category"}
                description={
                  category === "all"
                    ? undefined
                    : "Try another category or check back after new uploads."
                }
              />
            ) : (
              <div className="space-y-12">
                {/* Bento Grid Featured Top (only shown when 'all' is selected and >=3 items) */}
                {category === "all" && filtered.length >= 3 && (
                  <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
                    {/* Big Hero Card */}
                    {(() => {
                      const item = filtered[0];
                      const image = getImageFromItem(item as unknown as Record<string, unknown>)!;
                      const excerpt = item.description ? stripHtml(String(item.description)) : "";
                      return (
                        <Reveal key={item.id} className="lg:col-span-8">
                          <div className="group relative h-[28rem] sm:h-[34rem] overflow-hidden rounded-3xl border border-white/15 bg-slate-900 shadow-2xl transition-all duration-500 hover:border-sky-400/40">
                            {/* Ambient Glow */}
                            <SmartImage
                              src={image}
                              alt=""
                              fill
                              optimizeWidth={120}
                              className="object-cover blur-2xl opacity-40 scale-125 pointer-events-none select-none"
                              aria-hidden
                            />
                            {/* Main Image */}
                            <SmartImage
                              src={image}
                              alt={item.title || "Featured photo"}
                              fill
                              optimizeWidth={1200}
                              className="object-cover transition-transform duration-700 group-hover:scale-105"
                              sizes="(max-width: 1024px) 100vw, 66vw"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent opacity-90 transition-opacity duration-300 group-hover:opacity-95" />

                            {/* Category Tag */}
                            {item.category && (
                              <span className="absolute left-6 top-6 rounded-xl border border-white/20 bg-slate-900/80 px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-sky-300 backdrop-blur-md">
                                {item.category}
                              </span>
                            )}

                            {/* Action Buttons */}
                            <div className="absolute right-6 top-6 flex items-center gap-2 opacity-90 transition-opacity duration-300 group-hover:opacity-100">
                              <button
                                type="button"
                                onClick={() => setLightboxIndex(0)}
                                className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/20 bg-slate-900/80 text-white backdrop-blur-md transition-all duration-300 hover:scale-110 hover:bg-sky-500 hover:text-white"
                                title="Expand photo"
                              >
                                <Expand className="h-5 w-5" />
                              </button>
                              <Link
                                href={galleryHref(item)}
                                className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/20 bg-slate-900/80 text-white backdrop-blur-md transition-all duration-300 hover:scale-110 hover:bg-teal-500 hover:text-white"
                                title="Photo details"
                              >
                                <ArrowUpRight className="h-5 w-5" />
                              </Link>
                            </div>

                            {/* Bottom Caption Overlay */}
                            <div className="absolute inset-x-0 bottom-0 p-6 sm:p-8">
                              <span className="mb-2 block h-1 w-12 rounded-full bg-gradient-to-r from-sky-400 to-teal-400" />
                              <h3 className="font-display text-2xl sm:text-3xl font-bold leading-snug text-white drop-shadow-md">
                                {item.title}
                              </h3>
                              {excerpt && (
                                <p className="mt-2 line-clamp-2 max-w-2xl text-sm leading-relaxed text-slate-300">
                                  {excerpt}
                                </p>
                              )}
                              <button
                                type="button"
                                onClick={() => setLightboxIndex(0)}
                                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-wider text-sky-300 backdrop-blur-md border border-white/10 transition-colors duration-200 hover:bg-sky-500 hover:text-white hover:border-sky-400"
                              >
                                <Eye className="h-3.5 w-3.5" />
                                View Fullscreen
                              </button>
                            </div>
                          </div>
                        </Reveal>
                      );
                    })()}

                    {/* 2 Side Stacked Hero Cards */}
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-1 lg:col-span-4">
                      {filtered.slice(1, 3).map((item, idx) => {
                        const actualIdx = idx + 1;
                        const image = getImageFromItem(item as unknown as Record<string, unknown>)!;
                        const excerpt = item.description ? stripHtml(String(item.description)) : "";

                        return (
                          <Reveal key={item.id} delay={actualIdx * 0.08}>
                            <div className="group relative h-[13.5rem] sm:h-[16.2rem] overflow-hidden rounded-3xl border border-white/15 bg-slate-900 shadow-xl transition-all duration-500 hover:border-sky-400/40">
                              <SmartImage
                                src={image}
                                alt={item.title || "Hospital media"}
                                fill
                                optimizeWidth={800}
                                className="object-cover transition-transform duration-700 group-hover:scale-105"
                                sizes="(max-width: 1024px) 50vw, 33vw"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/30 to-transparent opacity-85 transition-opacity duration-300 group-hover:opacity-95" />

                              {item.category && (
                                <span className="absolute left-4 top-4 rounded-lg border border-white/20 bg-slate-900/80 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-sky-300 backdrop-blur-md">
                                  {item.category}
                                </span>
                              )}

                              <div className="absolute right-4 top-4 flex items-center gap-1.5 opacity-90 transition-opacity duration-300 group-hover:opacity-100">
                                <button
                                  type="button"
                                  onClick={() => setLightboxIndex(actualIdx)}
                                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/20 bg-slate-900/80 text-white backdrop-blur-md transition-all duration-300 hover:bg-sky-500 hover:text-white"
                                >
                                  <Expand className="h-4 w-4" />
                                </button>
                              </div>

                              <div className="absolute inset-x-0 bottom-0 p-5">
                                <h4 className="font-display text-lg font-bold leading-snug text-white line-clamp-1">
                                  {item.title}
                                </h4>
                                {excerpt && (
                                  <p className="mt-1 line-clamp-1 text-xs text-slate-300">
                                    {excerpt}
                                  </p>
                                )}
                              </div>
                            </div>
                          </Reveal>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Remaining Items Grid */}
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {(category === "all" && filtered.length >= 3 ? filtered.slice(3) : filtered).map(
                    (item, idx) => {
                      const actualIdx = category === "all" && filtered.length >= 3 ? idx + 3 : idx;
                      const image = getImageFromItem(item as unknown as Record<string, unknown>)!;
                      const excerpt = item.description ? stripHtml(String(item.description)) : "";

                      return (
                        <Reveal key={item.id} delay={(idx % 6) * 0.06} className="h-full">
                          <div className="group relative flex h-full flex-col justify-between overflow-hidden rounded-3xl border border-white/12 bg-slate-900/80 shadow-xl backdrop-blur-sm transition-all duration-500 hover:-translate-y-1.5 hover:border-sky-400/40 hover:shadow-2xl hover:shadow-sky-500/10">
                            {/* Ambient image background glow on hover */}
                            <SmartImage
                              src={image}
                              alt=""
                              fill
                              optimizeWidth={80}
                              className="object-cover blur-2xl opacity-0 transition-opacity duration-500 group-hover:opacity-25 pointer-events-none select-none"
                              aria-hidden
                            />

                            {/* Media image aspect ratio container */}
                            <div className="relative aspect-[4/3] w-full shrink-0 overflow-hidden bg-slate-950">
                              <SmartImage
                                src={image}
                                alt={item.title || "Hospital photo"}
                                fill
                                optimizeWidth={800}
                                className="object-cover transition-transform duration-700 group-hover:scale-108"
                                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-black/20 opacity-60 transition-opacity duration-300 group-hover:opacity-80" />

                              {item.category && (
                                <span className="absolute left-4 top-4 rounded-xl border border-white/20 bg-slate-950/75 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-sky-300 backdrop-blur-md">
                                  {item.category}
                                </span>
                              )}

                              {/* Hover action overlay */}
                              <div className="absolute inset-0 flex items-center justify-center gap-3 bg-slate-950/40 opacity-0 transition-opacity duration-300 backdrop-blur-xs group-hover:opacity-100">
                                <button
                                  type="button"
                                  onClick={() => setLightboxIndex(actualIdx)}
                                  className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/30 bg-slate-900/90 text-white shadow-lg transition-all duration-300 hover:scale-110 hover:bg-sky-500"
                                  title="View full screen"
                                >
                                  <Expand className="h-5 w-5" />
                                </button>
                                <Link
                                  href={galleryHref(item)}
                                  className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/30 bg-slate-900/90 text-white shadow-lg transition-all duration-300 hover:scale-110 hover:bg-teal-500"
                                  title="View details"
                                >
                                  <ArrowUpRight className="h-5 w-5" />
                                </Link>
                              </div>
                            </div>

                            {/* Card Content Body */}
                            <div className="flex flex-1 flex-col justify-between p-6">
                              <div className="flex flex-1 flex-col">
                                <h3 className="font-display text-xl font-bold leading-snug text-white transition-colors duration-200 group-hover:text-sky-300 line-clamp-1">
                                  {item.title}
                                </h3>
                                {excerpt ? (
                                  <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-slate-400">
                                    {excerpt}
                                  </p>
                                ) : (
                                  <p className="mt-2 text-sm leading-relaxed text-transparent select-none aria-hidden">
                                    &nbsp;
                                  </p>
                                )}
                              </div>

                              <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-4">
                                <button
                                  type="button"
                                  onClick={() => setLightboxIndex(actualIdx)}
                                  className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-sky-400 transition-all duration-200 hover:text-sky-300 hover:gap-2"
                                >
                                  <Eye className="h-3.5 w-3.5" />
                                  Quick View
                                </button>
                                <Link
                                  href={galleryHref(item)}
                                  className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-slate-400 transition-colors duration-200 hover:text-white"
                                >
                                  Details
                                  <ArrowUpRight className="h-3.5 w-3.5" />
                                </Link>
                              </div>
                            </div>
                          </div>
                        </Reveal>
                      );
                    }
                  )}
                </div>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Lightbox Fullscreen Modal Viewer */}
      {activeLightboxItem && lightboxIndex !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/95 p-4 backdrop-blur-xl animate-in fade-in duration-300">
          {/* Close button */}
          <button
            type="button"
            onClick={() => setLightboxIndex(null)}
            className="absolute right-6 top-6 z-50 flex h-12 w-12 items-center justify-center rounded-2xl border border-white/20 bg-white/10 text-white backdrop-blur-md transition-transform duration-200 hover:scale-110 hover:bg-rose-500"
            title="Close viewer (Esc)"
          >
            <X className="h-6 w-6" />
          </button>

          {/* Navigation Previous */}
          <button
            type="button"
            onClick={() =>
              setLightboxIndex((prev) => (prev !== null && prev > 0 ? prev - 1 : filtered.length - 1))
            }
            className="absolute left-6 top-1/2 z-50 -translate-y-1/2 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/20 bg-white/10 text-white backdrop-blur-md transition-all duration-200 hover:scale-110 hover:bg-sky-500"
            title="Previous image (Left arrow)"
          >
            <ChevronLeft className="h-7 w-7" />
          </button>

          {/* Navigation Next */}
          <button
            type="button"
            onClick={() =>
              setLightboxIndex((prev) =>
                prev !== null && prev < filtered.length - 1 ? prev + 1 : 0
              )
            }
            className="absolute right-6 top-1/2 z-50 -translate-y-1/2 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/20 bg-white/10 text-white backdrop-blur-md transition-all duration-200 hover:scale-110 hover:bg-sky-500"
            title="Next image (Right arrow)"
          >
            <ChevronRight className="h-7 w-7" />
          </button>

          {/* Modal Container */}
          <div className="relative flex max-h-[90vh] max-w-5xl flex-col overflow-hidden rounded-3xl border border-white/20 bg-slate-900 shadow-2xl">
            <div className="relative h-[65vh] w-full bg-black">
              {(() => {
                const img = getImageFromItem(
                  activeLightboxItem as unknown as Record<string, unknown>
                )!;
                return (
                  <SmartImage
                    src={img}
                    alt={activeLightboxItem.title || "Full image"}
                    fill
                    optimizeWidth={1400}
                    className="object-contain p-2"
                  />
                );
              })()}
            </div>

            {/* Bottom info bar */}
            <div className="flex flex-col justify-between gap-4 border-t border-white/10 bg-slate-900/90 p-6 sm:flex-row sm:items-center">
              <div>
                {activeLightboxItem.category && (
                  <span className="inline-block rounded-lg bg-sky-500/20 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-sky-400 border border-sky-500/30">
                    {activeLightboxItem.category}
                  </span>
                )}
                <h3 className="mt-2 font-display text-2xl font-bold text-white">
                  {activeLightboxItem.title}
                </h3>
                {activeLightboxItem.description && (
                  <p className="mt-1 max-w-2xl text-xs text-slate-300 line-clamp-2">
                    {stripHtml(String(activeLightboxItem.description))}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <span className="text-xs font-bold tracking-widest text-slate-400">
                  {lightboxIndex + 1} / {filtered.length}
                </span>
                <Link
                  href={galleryHref(activeLightboxItem)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-sky-500 to-teal-500 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white shadow-lg transition-transform hover:scale-105"
                >
                  Go to details page
                  <ArrowUpRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </PageTransition>
  );
}
