"use client";

import { useCallback, useMemo, useState } from "react";
import {
  BadgeCheck,
  CalendarDays,
  ClipboardList,
  Download,
  FileSpreadsheet,
  FileText,
  FolderOpen,
  HardDrive,
  Handshake,
  Search,
  X,
} from "lucide-react";
import {
  useGetResourceListQuery,
  useGetSettingsQuery,
  useTrackDownloadMutation,
} from "@/store/slices/apiSlice";
import PageHero from "@/components/layout/PageHero";
import PageBody from "@/components/layout/PageBody";
import NovaReveal from "@/components/nova/NovaReveal";
import EmptyState from "@/components/shared/EmptyState";
import { GridSkeleton } from "@/components/shared/Skeleton";
import PageTransition from "@/components/motion/PageTransition";
import { resolveMediaUrl } from "@/lib/media";
import {
  cleanPublicText,
  cn,
  formatDate,
  formatFileSize,
  isPublicItemActive,
  stripHtml,
} from "@/lib/utils";
import type { DownloadFile } from "@/lib/types";

const FALLBACK_INTRO =
  "Access forms, guides, and essential resources for patients, partners, and healthcare professionals.";

/**
 * What the centre is *for*, shown while it is still empty.
 *
 * The three names match the categories the admin form suggests, so an editor who
 * types "Patient Forms" into Admin - Downloads fills the shelf this page has
 * already promised rather than inventing a fourth heading nobody advertised.
 */
const PROSPECTUS = [
  {
    icon: ClipboardList,
    title: "Patient Forms",
    desc: "Registration, consent, and medical history forms.",
  },
  {
    icon: FileText,
    title: "Guides & Manuals",
    desc: "Patient guides and healthcare information.",
  },
  {
    icon: Handshake,
    title: "Partner Resources",
    desc: "Resources for catchment facilities.",
  },
];

/** Heading for entries an editor saved without a category. */
const UNGROUPED = "Other resources";

/** Extension of a filename or URL, upper-cased - "PDF", "XLSX". */
function extOf(value?: string | null) {
  const name = String(value || "").split(/[?#]/)[0];
  const match = name.match(/\.([A-Za-z0-9]{1,8})$/);
  return match ? match[1].toUpperCase() : "";
}

/** Spreadsheets read differently from documents, so they get their own glyph. */
function glyphFor(ext: string) {
  if (/^(XLS|XLSX|CSV)$/.test(ext)) return FileSpreadsheet;
  return FileText;
}

export default function DownloadsPage() {
  const { data, isLoading, isError } = useGetResourceListQuery({
    resource: "downloads",
    perPage: 100,
  });
  const { data: settings } = useGetSettingsQuery();
  const [track] = useTrackDownloadMutation();

  const [category, setCategory] = useState<string | null>(null);
  const [term, setTerm] = useState("");

  const intro = (settings?.downloads_intro as string) || FALLBACK_INTRO;
  const closingNote = (settings?.downloads_note as string) || "";

  const files = useMemo(
    () =>
      ((data?.data ?? []) as DownloadFile[]).filter((file) =>
        isPublicItemActive(file as unknown as Record<string, unknown>)
      ),
    [data?.data]
  );

  /** Categories in the order the API returned them, so `order` still governs. */
  const categories = useMemo(() => {
    const counts = new Map<string, number>();
    for (const file of files) {
      const key = file.category?.trim() || UNGROUPED;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return [...counts.entries()];
  }, [files]);

  const visible = useMemo(() => {
    const needle = term.trim().toLowerCase();
    return files.filter((file) => {
      const key = file.category?.trim() || UNGROUPED;
      if (category && key !== category) return false;
      if (!needle) return true;
      const haystack = [
        file.title,
        file.category,
        file.file_name,
        file.version,
        file.description ? stripHtml(file.description) : "",
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(needle);
    });
  }, [files, category, term]);

  const grouped = useMemo(() => {
    const map = new Map<string, DownloadFile[]>();
    for (const file of visible) {
      const key = file.category?.trim() || UNGROUPED;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(file);
    }
    return [...map.entries()];
  }, [visible]);

  // Best-effort counter: the file must open whether or not the ping lands.
  const onTake = useCallback(
    (file: DownloadFile) => {
      track({ idOrSlug: file.slug || file.id })
        .unwrap()
        .catch(() => {});
    },
    [track]
  );

  return (
    <PageTransition>
      <PageHero
        section="/downloads"
        title="Forms &"
        accent="Downloads"
        eyebrow="Resources"
        subtitle={intro}
        stats={
          files.length
            ? [
                {
                  value: String(files.length),
                  label: files.length === 1 ? "File" : "Files",
                },
                {
                  value: String(categories.length),
                  label: categories.length === 1 ? "Category" : "Categories",
                },
              ]
            : undefined
        }
        breadcrumbs={[{ label: "Downloads" }]}
      />

      <PageBody>
        {isLoading ? (
          <GridSkeleton count={6} />
        ) : isError ? (
          <EmptyState
            title="Unable to load downloads"
            description="Please try again in a moment."
          />
        ) : files.length === 0 ? (
          <>
            <EmptyState
              icon={<FolderOpen />}
              title="No downloads are available yet"
              description="Check back later for forms, guides, and resources."
            />
            <div className="nv-dlcats">
              {PROSPECTUS.map((item, i) => {
                const Glyph = item.icon;
                return (
                  <NovaReveal key={item.title} from="up" delay={0.08 + i * 0.09}>
                    <article className="nv-dlcat">
                      <span className="nv-dlcat__ico" aria-hidden>
                        <Glyph />
                      </span>
                      <h2 className="nv-dlcat__title">{item.title}</h2>
                      <p className="nv-dlcat__desc">{item.desc}</p>
                    </article>
                  </NovaReveal>
                );
              })}
            </div>
          </>
        ) : (
          <>
            <div className="nv-toolbar">
              <div>
                <p className="nv-toolbar__kicker">
                  {visible.length === files.length
                    ? `${files.length} ${files.length === 1 ? "file" : "files"}`
                    : `${visible.length} of ${files.length} files`}
                </p>
                <p className="nv-toolbar__note">
                  Every document here is the current revision. Where a form
                  carries a version, check it against the copy you were given
                  before filling it in.
                </p>
              </div>

              <div className="nv-search">
                <Search className="nv-search__ico" aria-hidden />
                <input
                  type="search"
                  value={term}
                  onChange={(event) => setTerm(event.target.value)}
                  placeholder="Search downloads"
                  aria-label="Search downloads"
                />
                {term && (
                  <button
                    type="button"
                    className="nv-search__clear"
                    aria-label="Clear search"
                    onClick={() => setTerm("")}
                  >
                    <X aria-hidden />
                  </button>
                )}
              </div>
            </div>

            {categories.length > 1 && (
              <div className="nv-filters mb-8">
                <button
                  type="button"
                  className={cn("nv-filter", !category && "nv-filter--on")}
                  onClick={() => setCategory(null)}
                >
                  All
                  <span className="nv-filter__count">{files.length}</span>
                </button>
                {categories.map(([name, count]) => (
                  <button
                    key={name}
                    type="button"
                    className={cn("nv-filter", category === name && "nv-filter--on")}
                    onClick={() => setCategory(name)}
                  >
                    {name}
                    <span className="nv-filter__count">{count}</span>
                  </button>
                ))}
              </div>
            )}
            {visible.length === 0 ? (
              <EmptyState
                icon={<Search />}
                title="No matching downloads"
                description="Try a different word, or clear the filters to see everything."
              />
            ) : (
              grouped.map(([name, items]) => (
                <section key={name} className="nv-dlgroup">
                  <h2 className="nv-dlgroup__label">
                    {name}
                    <b>
                      {items.length} {items.length === 1 ? "file" : "files"}
                    </b>
                  </h2>

                  <div className="nv-dlgrid">
                    {items.map((file, i) => (
                      <NovaReveal
                        key={file.id}
                        from="up"
                        delay={Math.min(Math.floor(i / 3), 5) * 0.1}
                      >
                        <FileCard file={file} onTake={onTake} />
                      </NovaReveal>
                    ))}
                  </div>
                </section>
              ))
            )}
            {closingNote && (
              <div className="nv-note nv-note--warn mt-10">
                <span className="nv-note__ico" aria-hidden>
                  <FolderOpen />
                </span>
                <div>
                  <p className="nv-note__title">Cannot find a document?</p>
                  <p className="nv-note__desc">{stripHtml(closingNote)}</p>
                </div>
              </div>
            )}
          </>
        )}
      </PageBody>
    </PageTransition>
  );
}

/**
 * One file.
 *
 * `file_type` / `file_size` / `file_name` are denormalized onto the download row
 * when it is saved, so this prints a format and a weight without the page
 * joining `media` per entry. An entry with neither an upload nor a URL still
 * renders - a hole on the public page is how an editor finds out.
 */
function FileCard({
  file,
  onTake,
}: {
  file: DownloadFile;
  onTake: (file: DownloadFile) => void;
}) {
  const href = resolveMediaUrl(file.file) || resolveMediaUrl(file.file_url) || "";
  const ext =
    (file.file_type || "").toUpperCase() || extOf(file.file_name) || extOf(href);
  const Glyph = glyphFor(ext);
  const size = formatFileSize(file.file_size);
  const published = formatDate(file.published_at, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const desc = file.description ? cleanPublicText(file.description) : "";
  const featured = file.is_featured === true || file.is_featured === 1;

  return (
    <article className={cn("nv-dlfile", featured && "nv-dlfile--feat")}>
      <div className="nv-dlfile__top">
        <span className="nv-dlfile__ext" aria-hidden>
          {ext || <Glyph />}
        </span>
        <div className="min-w-0">
          <h3 className="nv-dlfile__title">
            {cleanPublicText(file.title) || file.title}
          </h3>
          {desc && <p className="nv-dlfile__desc">{desc}</p>}
        </div>
      </div>

      {(size || file.version || published) && (
        <div className="nv-dlfile__meta">
          {size && (
            <span className="nv-dlfile__chip">
              <HardDrive aria-hidden />
              {size}
            </span>
          )}
          {file.version && (
            <span className="nv-dlfile__chip">
              <BadgeCheck aria-hidden />
              {file.version}
            </span>
          )}
          {published && (
            <span className="nv-dlfile__chip">
              <CalendarDays aria-hidden />
              {published}
            </span>
          )}
        </div>
      )}

      <div className="nv-dlfile__foot">
        {href ? (
          <a
            href={href}
            target="_blank"
            rel="noreferrer"
            className="nv-dlfile__go"
            onClick={() => onTake(file)}
          >
            <Download aria-hidden />
            Download
          </a>
        ) : (
          <span className="nv-dlfile__go" aria-disabled="true">
            <Download aria-hidden />
            Coming soon
          </span>
        )}
      </div>
    </article>
  );
}
