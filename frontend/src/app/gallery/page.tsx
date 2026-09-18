"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Expand,
  Images,
  X,
  Eye,
  Layers,
} from "lucide-react";
import {
  useGetResourceListQuery,
  useGetSettingsQuery,
} from "@/store/slices/apiSlice";
import PageHero from "@/components/layout/PageHero";
import PageBody from "@/components/layout/PageBody";
import NovaReveal from "@/components/nova/NovaReveal";
import EmptyState from "@/components/shared/EmptyState";
import { GridSkeleton } from "@/components/shared/Skeleton";
import PageTransition from "@/components/motion/PageTransition";
import SmartImage from "@/components/shared/SmartImage";
import { getImageFromItem } from "@/lib/media";
import { cn, isPublicItemActive, stripHtml } from "@/lib/utils";
import type { GalleryItem } from "@/lib/types";
import { SITE_NAME } from "@/lib/api";

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

  const collectionCount = Math.max(1, categories.length);

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
        section="/gallery"
        title="The Hospital in"
        accent="Pictures"
        eyebrow="Campus and care"
        subtitle={
          heroSubtitle ||
          `Wards, theatres, outreach days and the people who staff them — photographed at ${SITE_NAME}.`
        }
        stats={
          items.length
            ? [
                { value: String(items.length), label: "Photographs" },
                // An untagged library has no categories at all, which still
                // means one collection rather than zero — so the count and the
                // label have to be derived from the same number.
                ...(collectionCount
                  ? [
                      {
                        value: String(collectionCount),
                        label: collectionCount === 1 ? "Collection" : "Collections",
                      },
                    ]
                  : []),
              ]
            : undefined
        }
        breadcrumbs={[{ label: "Gallery" }]}
      />

      <PageBody>
          <div className="nv-toolbar">
            <div>
              <p className="nv-toolbar__kicker">Featured photography</p>
              <p className="nv-toolbar__note">
                {items.length > 0
                  ? `Showing ${filtered.length} of ${items.length} curated image${
                      items.length === 1 ? "" : "s"
                    } across our departments and community programmes.`
                  : "Curated photography capturing everyday healthcare moments."}
              </p>
            </div>

            <span className="nv-pill">
              <Images aria-hidden />
              {filtered.length} photos
            </span>
          </div>

          {categories.length > 0 && (
            <NovaReveal from="up" delay={0.05} className="nv-filters mb-10">
              <button
                type="button"
                onClick={() => setCategory("all")}
                className={cn(
                  "nv-filter",
                  category === "all" && "nv-filter--on"
                )}
              >
                <Layers aria-hidden />
                All collection
                <span className="nv-filter__count">{items.length}</span>
              </button>

              {categories.map((cat) => {
                const count = items.filter((i) => i.category?.trim() === cat).length;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategory(cat)}
                    className={cn("nv-filter", category === cat && "nv-filter--on")}
                  >
                    {cat}
                    <span className="nv-filter__count">{count}</span>
                  </button>
                );
              })}
            </NovaReveal>
          )}

          {isLoading ? (
            <GridSkeleton count={9} />
          ) : isError ? (
            <EmptyState
              title="Unable to load gallery"
              description="Please try again shortly."
            />
          ) : filtered.length === 0 ? (
            <EmptyState
              title={
                category === "all"
                  ? "Gallery coming soon"
                  : "No photos in this category"
              }
              description={
                category === "all"
                  ? undefined
                  : "Try another category or check back after new uploads."
              }
            />
          ) : (
            <div className="nv-grid-3">
              {filtered.map((item, idx) => {
                const image = getImageFromItem(
                  item as unknown as Record<string, unknown>
                );

                return (
                  <NovaReveal
                    key={item.id}
                    from="up"
                    delay={Math.min(Math.floor(idx / 3), 5) * 0.1}
                    className="h-full w-full"
                  >
                    <div className="nv-gtile group h-full w-full flex flex-col justify-between">
                      <div className="nv-gtile__frame">
                        {image ? (
                          <SmartImage
                            src={image}
                            alt=""
                            fill
                            optimizeWidth={800}
                            className="nv-gtile__img"
                            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                          />
                        ) : (
                          <span className="nv-gtile__fallback" aria-hidden>
                            {(item.title || "?").charAt(0)}
                          </span>
                        )}
                      </div>

                      {item.category && (
                        <span className="nv-gtile__tag">{item.category}</span>
                      )}

                      <div className="nv-gtile__acts">
                        <button
                          type="button"
                          onClick={() => setLightboxIndex(idx)}
                          className="nv-gtile__act"
                          title="View full screen"
                        >
                          <Expand aria-hidden />
                        </button>
                        <Link
                          href={galleryHref(item)}
                          className="nv-gtile__act"
                          title="View details"
                        >
                          <ArrowUpRight aria-hidden />
                        </Link>
                      </div>

                      <div className="nv-gtile__cap">
                        <h3 className="nv-gtile__title">{item.title}</h3>
                        <span className="nv-gtile__meta">
                          <Eye aria-hidden />
                          View fullscreen
                        </span>
                      </div>
                    </div>
                  </NovaReveal>
                );
              })}
            </div>
          )}
      </PageBody>

      {/* Fullscreen viewer. Esc, left and right are wired up in the effect
          above, so the on-screen controls are a second route rather than the
          only one. */}
      {activeLightboxItem && lightboxIndex !== null && (
        <div className="nv-lb" role="dialog" aria-modal="true">
          <button
            type="button"
            onClick={() => setLightboxIndex(null)}
            className="nv-lb__ctl nv-lb__ctl--close"
            title="Close viewer (Esc)"
            aria-label="Close viewer"
          >
            <X aria-hidden />
          </button>

          <button
            type="button"
            onClick={() =>
              setLightboxIndex((prev) =>
                prev !== null && prev > 0 ? prev - 1 : filtered.length - 1
              )
            }
            className="nv-lb__ctl nv-lb__ctl--prev"
            title="Previous image (Left arrow)"
            aria-label="Previous image"
          >
            <ChevronLeft aria-hidden />
          </button>

          <button
            type="button"
            onClick={() =>
              setLightboxIndex((prev) =>
                prev !== null && prev < filtered.length - 1 ? prev + 1 : 0
              )
            }
            className="nv-lb__ctl nv-lb__ctl--next"
            title="Next image (Right arrow)"
            aria-label="Next image"
          >
            <ChevronRight aria-hidden />
          </button>

          <div className="nv-lb__panel">
            <div className="nv-lb__frame">
              {(() => {
                const img = getImageFromItem(
                  activeLightboxItem as unknown as Record<string, unknown>
                );
                return img ? (
                  <SmartImage
                    src={img}
                    // Decorative: .nv-lb__title names this photograph in the bar
                    // directly below the frame.
                    alt=""
                    fill
                    sizes="(max-width: 1024px) 100vw, 1200px"
                    optimizeWidth={1400}
                    className="nv-lb__img"
                  />
                ) : null;
              })()}

              {activeLightboxItem.category && (
                <span className="nv-lb__tag">{activeLightboxItem.category}</span>
              )}
            </div>

            <div className="nv-lb__bar">
              <div>
                <h3 className="nv-lb__title">{activeLightboxItem.title}</h3>
                {activeLightboxItem.description && (
                  <p className="nv-post__excerpt !mt-2 max-w-2xl line-clamp-2">
                    {stripHtml(String(activeLightboxItem.description))}
                  </p>
                )}
              </div>

              <div className="nv-lb__acts">
                <span className="nv-pill">
                  {lightboxIndex + 1} / {filtered.length}
                </span>
                <Link
                  href={galleryHref(activeLightboxItem)}
                  className="nv-btn nv-btn--glass nv-btn--sm"
                >
                  Details page
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </PageTransition>
  );
}
