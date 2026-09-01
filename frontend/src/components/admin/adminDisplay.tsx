"use client";

import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import SmartImage from "@/components/shared/SmartImage";
import { getImageFromItem, resolveMediaUrl } from "@/lib/media";
import { cn, formatDate } from "@/lib/utils";
import { formatCellValue } from "@/lib/adminResources";

const BOOL_KEYS = new Set([
  "is_active",
  "is_available",
  "is_approved",
  "is_pinned",
  "is_featured",
]);

const STATUS_TONES: Record<string, "default" | "brass" | "muted" | "outline"> = {
  active: "default",
  open: "default",
  published: "default",
  available: "default",
  new: "brass",
  read: "muted",
  upcoming: "brass",
  ongoing: "brass",
  draft: "muted",
  closed: "muted",
  inactive: "muted",
  suspended: "muted",
  archived: "muted",
  cancelled: "muted",
  completed: "outline",
  replied: "outline",
};

export function StatusBadge({ value }: { value: unknown }) {
  const label = String(value ?? "—");
  const tone = STATUS_TONES[label.toLowerCase()] ?? "outline";
  return (
    <Badge variant={tone} className="max-w-full truncate capitalize tracking-[0.04em]">
      {label.replace(/_/g, " ")}
    </Badge>
  );
}

export function BoolBadge({
  value,
  trueLabel = "Active",
  falseLabel = "Inactive",
}: {
  value: unknown;
  trueLabel?: string;
  falseLabel?: string;
}) {
  const on = value === true || value === 1 || value === "1";
  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center gap-1.5 truncate rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] transition",
        on
          ? "bg-[var(--ld-accent-soft)] text-[var(--ld-accent)] border border-[var(--ld-accent)]/30"
          : "bg-white/5 text-[var(--ld-faint)] border border-[var(--ld-line)]"
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 shrink-0 rounded-full",
          on ? "animate-pulse bg-[var(--ld-accent)]" : "bg-[var(--ld-faint)]/50"
        )}
      />
      <span className="truncate">{on ? trueLabel : falseLabel}</span>
    </span>
  );
}

export function EntityAvatar({
  url,
  name,
  className,
}: {
  url?: string | null;
  name: string;
  className?: string;
}) {
  const resolved = url ? resolveMediaUrl(url) : undefined;
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <div
      className={cn(
        "relative h-11 w-11 shrink-0 overflow-hidden rounded-md bg-[#142036] border border-[var(--ld-line-strong)] shadow-sm",
        className
      )}
    >
      {resolved ? (
        <SmartImage
          src={resolved}
          alt={name}
          fill
          className="object-cover"
          optimizeWidth={120}
          fallback={
            <span className="flex h-full w-full items-center justify-center text-xs font-bold text-[var(--ld-accent)]">
              {initials || "•"}
            </span>
          }
        />
      ) : (
        <span className="flex h-full w-full items-center justify-center text-xs font-bold text-[var(--ld-accent)]">
          {initials || "•"}
        </span>
      )}
    </div>
  );
}

export function getRowMediaUrl(
  row: Record<string, unknown>,
  fileField?: string
): string | undefined {
  const fromHelper = getImageFromItem(row);
  if (fromHelper) return fromHelper;

  if (!fileField) return undefined;
  const responseMediaField = fileField === "media_file" ? "media" : fileField;
  const media = row[responseMediaField] as { url?: string; path?: string } | undefined;
  const fileObj = row[fileField] as { url?: string; path?: string } | undefined;
  const raw =
    row.url ||
    row.file_url ||
    row.media_file_url ||
    row[`${fileField}_url`] ||
    row[`${responseMediaField}_url`] ||
    fileObj?.url ||
    fileObj?.path ||
    media?.url ||
    media?.path ||
    row.photo_url ||
    row.image_url ||
    row.logo_url ||
    row.featured_image_url ||
    row.path;
  return raw ? resolveMediaUrl(String(raw)) : undefined;
}

export function getPrimaryLabel(
  row: Record<string, unknown>,
  titleField?: string
): string {
  if (row.first_name || row.last_name) {
    return [row.title, row.first_name, row.last_name].filter(Boolean).join(" ");
  }
  const key = titleField || "name";
  const val = row[key] ?? row.title ?? row.name ?? row.question ?? `#${row.id}`;
  return String(val);
}

export function getSubtitle(row: Record<string, unknown>): string | null {
  const parts = [
    row.designation,
    row.position,
    row.department,
    row.module,
    row.category,
    row.employment_type,
    row.slug,
    row.email,
    row.website,
    row.phone,
  ]
    .map((v) => (v != null && String(v).trim() ? String(v) : null))
    .filter(Boolean);
  return parts[0] ?? null;
}

export function renderSmartCell(
  key: string,
  row: Record<string, unknown>
): ReactNode {
  const value = row[key];

  if (BOOL_KEYS.has(key)) {
    const labels: Record<string, [string, string]> = {
      is_available: ["Available", "Unavailable"],
      is_approved: ["Approved", "Pending"],
      is_pinned: ["Pinned", "Unpinned"],
      is_featured: ["Featured", "Standard"],
      is_active: ["Active", "Inactive"],
    };
    const [t, f] = labels[key] ?? ["Yes", "No"];
    return <BoolBadge value={value} trueLabel={t} falseLabel={f} />;
  }

  if (key === "status") return <StatusBadge value={value} />;

  if (
    key.includes("_at") ||
    key.includes("date") ||
    key.startsWith("tenure") ||
    key === "deadline"
  ) {
    return (
      <span className="text-sm text-[var(--ld-muted)]">
        {formatDate(String(value ?? ""), {
          year: "numeric",
          month: "short",
          day: "numeric",
        }) || formatCellValue(value)}
      </span>
    );
  }

  if (key === "order") {
    return (
      <span className="inline-flex h-8 min-w-8 items-center justify-center rounded-md border border-[var(--ld-accent)]/30 bg-[var(--ld-accent-soft)] text-xs font-bold text-[var(--ld-accent)]">
        {formatCellValue(value)}
      </span>
    );
  }

  if (key === "website" && value) {
    return (
      <a
        href={String(value).startsWith("http") ? String(value) : `https://${value}`}
        target="_blank"
        rel="noreferrer"
        className="text-sm font-medium text-[var(--hb-accent)] underline-offset-2 hover:underline"
      >
        Visit site
      </a>
    );
  }

  return <span className="text-sm text-ink">{formatCellValue(value)}</span>;
}
