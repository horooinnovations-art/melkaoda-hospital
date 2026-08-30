"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, Images, Tag } from "lucide-react";
import {
  useGetResourceItemQuery,
  useGetResourceListQuery,
} from "@/store/slices/apiSlice";
import EmptyState from "@/components/shared/EmptyState";
import Prose from "@/components/shared/Prose";
import SmartImage from "@/components/shared/SmartImage";
import { DetailSkeleton } from "@/components/shared/Skeleton";
import Reveal from "@/components/motion/Reveal";
import DetailShell, {
  DetailDivider,
  DetailLinkChip,
  DetailPanel,
  DetailSectionHeader,
  type DetailBadge,
} from "@/components/shared/DetailShell";
import { getImageFromItem } from "@/lib/media";
import { stripHtml } from "@/lib/utils";
import type { GalleryItem } from "@/lib/types";

function galleryHref(item: GalleryItem) {
  return `/gallery/${item.slug || item.id}`;
}

function GalleryFullscreenImage({
  src,
  alt,
}: {
  src: string;
  alt?: string;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isFs, setIsFs] = useState(false);

  useEffect(() => {
    function onFsChange() {
      setIsFs(!!getFullscreenElement());
    }
    document.addEventListener("fullscreenchange", onFsChange);
    document.addEventListener("webkitfullscreenchange", onFsChange);
    document.addEventListener("msfullscreenchange", onFsChange);
    return () => {
      document.removeEventListener("fullscreenchange", onFsChange);
      document.removeEventListener("webkitfullscreenchange", onFsChange);
      document.removeEventListener("msfullscreenchange", onFsChange);
    };
  }, []);

  function getFullscreenElement(): Element | null {
    const d = document as Document & {
      webkitFullscreenElement?: Element | null;
      msFullscreenElement?: Element | null;
    };
    return d.fullscreenElement ?? d.webkitFullscreenElement ?? d.msFullscreenElement ?? null;
  }

  async function requestFullscreenOn(el: Element): Promise<void> {
    const e = el as HTMLElement & {
      webkitRequestFullscreen?: () => void;
      msRequestFullscreen?: () => void;
      requestFullscreen?: () => Promise<void>;
    };
    if (e.requestFullscreen) {
      await e.requestFullscreen();
      return;
    }
    if (e.webkitRequestFullscreen) {
      e.webkitRequestFullscreen();
      return;
    }
    if (e.msRequestFullscreen) {
      e.msRequestFullscreen();
      return;
    }
  }

  async function openFullscreen() {
    const el = containerRef.current;
    if (!el) {
      window.open(src, "_blank");
      return;
    }
    try {
      await requestFullscreenOn(el);
    } catch {
      window.open(src, "_blank");
    }
  }

  return (
    <div ref={containerRef} className="w-full h-full bg-black flex items-center justify-center">
      {!isFs ? (
        <button onClick={openFullscreen} className="w-full h-full p-0 m-0 block text-left">
          <SmartImage
            src={src}
            alt={alt ?? ""}
            fill
            priority
            optimizeWidth={2000}
            className="object-cover nv-dgallery__img"
            sizes="100vw"
          />
        </button>
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <SmartImage
            src={src}
            alt={alt ?? ""}
            width={2400}
            height={1600}
            optimizeWidth={2400}
            className="mx-auto h-auto max-h-[100vh] w-auto object-contain"
            sizes="(max-width: 1024px) 100vw, 1200px"
          />
        </div>
      )}
    </div>
  );
}

export default function GalleryDetail({ slug }: { slug: string }) {
  const { data, isLoading, isError } = useGetResourceItemQuery({
    resource: "gallery",
    idOrSlug: slug,
  });

  const { data: listData } = useGetResourceListQuery({
    resource: "gallery",
    perPage: 12,
  });

  if (isLoading) {
    return (
      <DetailShell
        title="Loading photo"
        backHref="/gallery"
        backLabel="Gallery"
        width="full"
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
        title="Photo not found"
        backHref="/gallery"
        backLabel="Gallery"
        width="full"
      >
        <DetailPanel>
          <EmptyState
            title="Photo not found"
            description="This gallery item may have been removed or hidden."
          />
          <div className="mt-6">
            <DetailLinkChip href="/gallery">Back to gallery</DetailLinkChip>
          </div>
        </DetailPanel>
      </DetailShell>
    );
  }

  const item = data as GalleryItem;
  const image = getImageFromItem(item as unknown as Record<string, unknown>);
  const plainDescription = item.description
    ? stripHtml(String(item.description))
    : "";

  const related = ((listData?.data ?? []) as GalleryItem[])
    .filter((g) => g.id !== item.id)
    .filter((g) =>
      Boolean(getImageFromItem(g as unknown as Record<string, unknown>))
    )
    .slice(0, 4);

  const badges: DetailBadge[] = [];
  if (item.category) {
    badges.push({ icon: Tag, label: item.category, tone: "teal" });
  }
  badges.push({ icon: Images, label: "Hospital gallery", tone: "glass" });

  return (
    <DetailShell
      title={item.title || "Gallery photo"}
      subtitle={
        plainDescription
          ? plainDescription.length > 160
            ? `${plainDescription.slice(0, 160).trim()}…`
            : plainDescription
          : undefined
      }
      image={image}
      badges={badges}
      backHref="/gallery"
      backLabel="Gallery"
      width="full"
      imageMode="showcase"
    >
      {/* No section header above the content. The three that used to open these
          pages — "Hospital news · Article", "Hospital page · Content", "Gallery ·
          Featured image" — restated the masthead directly above them and told a
          reader nothing they had not just read. */}
      {image ? (
        <DetailPanel tone={1} className="nv-dgallery">
          <div className="nv-dgallery__frame">
            {/* Fullscreen API implementation */}
            <GalleryFullscreenImage src={image} alt={item.title || "Gallery photo"} />
          </div>
        </DetailPanel>
      ) : (
        <DetailPanel>
          <EmptyState title="No image attached" />
        </DetailPanel>
      )}

      {item.description && item.description.includes("<") && (
        <>
          <DetailDivider />
          <DetailPanel tone={2}>
            <div className="nv-dpanel__label">
              <span className="nv-dpanel__icon" aria-hidden>
                <Images className="h-4 w-4" />
              </span>
              <div>
                <p className="nv-dpanel__kicker">Caption</p>
                <h3 className="nv-dpanel__title">About this photo</h3>
              </div>
            </div>
            <Prose html={item.description} />
          </DetailPanel>
        </>
      )}

      {related.length > 0 && (
        <>
          <DetailDivider delay={0.08} />
          <DetailSectionHeader
            eyebrow="Keep exploring"
            title="More from the gallery"
            delay={0.1}
          />
          <div className="nv-drelated">
            {related.map((g, i) => {
              const thumb = getImageFromItem(
                g as unknown as Record<string, unknown>
              );
              if (!thumb) return null;
              return (
                <Reveal key={g.id} delay={0.05 + i * 0.04}>
                  <Link href={galleryHref(g)} className="nv-drelated__card">
                    <span className="nv-drelated__media">
                      <SmartImage
                        src={thumb}
                        alt={g.title || "Gallery"}
                        fill
                        optimizeWidth={600}
                        className="object-cover"
                        sizes="(max-width: 768px) 50vw, 25vw"
                      />
                    </span>
                    <span className="nv-drelated__title">
                      {g.title}
                    </span>
                    <span className="nv-drelated__go" aria-hidden>
                      <ArrowUpRight className="h-4 w-4" />
                    </span>
                  </Link>
                </Reveal>
              );
            })}
          </div>
        </>
      )}

      <DetailDivider delay={0.12} />
      <div className="nv-dfooter">
        <DetailLinkChip href="/gallery">Back to gallery</DetailLinkChip>
      </div>
    </DetailShell>
  );
}
