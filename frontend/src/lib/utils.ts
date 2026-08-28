import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date?: string | null, options?: Intl.DateTimeFormatOptions) {
  if (!date) return "";
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    ...options,
  });
}

export function formatYear(date?: string | null) {
  if (!date) return "";
  return new Date(date).getFullYear().toString();
}

/**
 * Cut to `length`, then back up to the last word boundary so the ellipsis never
 * lands mid-word ("…without bei…"). If the cut leaves no whitespace to fall back
 * to — a single very long token — the hard slice stands.
 */
export function truncate(text: string, length = 120) {
  if (text.length <= length) return text;
  const cut = text.slice(0, length);
  const lastSpace = cut.lastIndexOf(" ");
  const kept = lastSpace > length * 0.6 ? cut.slice(0, lastSpace) : cut;
  return `${kept.replace(/[\s,;:.!?-]+$/, "").trim()}…`;
}

export function stripHtml(html: string) {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

/** Remove emoji / pictographs for cleaner marketing surfaces. */
export function stripEmoji(text: string) {
  return text
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{200D}]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Clean CMS display strings: strip html/emoji, fix common typos,
 * and drop trailing junk like "lll".
 */
export function cleanPublicText(text?: string | null) {
  if (!text) return "";
  let value = stripEmoji(stripHtml(String(text)));
  value = value.replace(/\bWellcome\b/gi, "Welcome");
  value = value.replace(/\bDeparments\b/gi, "Departments");
  value = value.replace(/\s+[a-z]{1,3}$/i, (tail) =>
    /^(lll|lll\.|xx|xxx|test)$/i.test(tail.trim()) ? "" : tail
  );
  value = value.replace(/\s{2,}/g, " ").trim();
  return value;
}

export type HoursRow = { day: string; hours: string };

/** Parse "Monday: 24 hrs Tuesday: 24 hrs…" into structured rows. */
export function parseHoursSchedule(raw?: string | null): HoursRow[] {
  if (!raw?.trim()) return [];
  const text = raw.replace(/\s+/g, " ").trim();

  // Already compact ("24/7", "Open 24 hours")
  if (/^24\s*\/\s*7|^open\s+24|^always/i.test(text) && !/monday/i.test(text)) {
    return [{ day: "Every day", hours: text }];
  }

  const dayPattern =
    /(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\s*[:\-–]?\s*/gi;
  const parts: { day: string; start: number }[] = [];
  let match: RegExpExecArray | null;
  while ((match = dayPattern.exec(text)) !== null) {
    parts.push({ day: match[1], start: match.index + match[0].length });
  }
  if (!parts.length) return [{ day: "Hours", hours: text }];

  return parts.map((part, i) => {
    const end = i + 1 < parts.length ? text.indexOf(parts[i + 1].day, part.start) : text.length;
    const hours = text.slice(part.start, end).replace(/^[:\-–]\s*/, "").trim() || "—";
    return { day: part.day.slice(0, 3), hours };
  });
}

/** True when every day is effectively 24 hours. */
export function isAlwaysOpen(raw?: string | null) {
  if (!raw) return false;
  if (/24\s*\/\s*7/i.test(raw)) return true;
  const rows = parseHoursSchedule(raw);
  return (
    rows.length >= 7 &&
    rows.every((r) => /24/.test(r.hours) && !/\d{1,2}:\d{2}\s*(am|pm)/i.test(r.hours))
  );
}

/** Collapse "Loke, …, Loke, …" style repeated address tokens. */
export function formatPublicAddress(
  ...parts: Array<string | null | undefined>
): string | undefined {
  const tokens = parts
    .filter((p): p is string => Boolean(p && String(p).trim()))
    .flatMap((p) => String(p).split(/[,|;/]+/))
    .map((t) => t.trim().replace(/\s+/g, " "))
    .filter(Boolean);

  const seen = new Set<string>();
  const unique: string[] = [];
  for (const token of tokens) {
    const key = token.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(token);
  }
  return unique.length ? unique.join(", ") : undefined;
}

/** Check if a public resource record is active and allowed to show publicly. */
export function isPublicItemActive(item: Record<string, unknown> | null | undefined): boolean {
  if (!item || typeof item !== "object") return false;

  const isActive = item.is_active;
  if (isActive === false || isActive === 0 || isActive === "0" || isActive === "false") {
    return false;
  }

  const isPublished = item.is_published;
  if (isPublished === false || isPublished === 0 || isPublished === "0" || isPublished === "false") {
    return false;
  }

  const isVisible = item.is_visible;
  if (isVisible === false || isVisible === 0 || isVisible === "0" || isVisible === "false") {
    return false;
  }

  if (typeof item.status === "string") {
    const s = item.status.toLowerCase().trim();
    if (
      s === "draft" ||
      s === "inactive" ||
      s === "archived" ||
      s === "hidden" ||
      s === "disabled" ||
      s === "suspended" ||
      s === "closed"
    ) {
      return false;
    }
  }

  return true;
}

