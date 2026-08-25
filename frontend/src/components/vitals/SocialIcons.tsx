/** Brand glyphs — lucide dropped its brand set, so these are inlined. */

type GlyphProps = { className?: string };

export function FacebookGlyph({ className }: GlyphProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M13.5 22v-8h2.7l.4-3.1h-3.1V8.9c0-.9.25-1.5 1.55-1.5h1.65V4.6A22 22 0 0 0 14.3 4.5c-2.4 0-4 1.45-4 4.12V10.9H7.6V14h2.7v8z" />
    </svg>
  );
}

export function TwitterGlyph({ className }: GlyphProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M17.53 3H20.5l-6.49 7.42L21.5 21h-5.83l-4.57-5.98L5.86 21H2.88l6.94-7.93L2.5 3h5.98l4.13 5.46zm-1.04 16.2h1.64L7.6 4.72H5.84z" />
    </svg>
  );
}

export function InstagramGlyph({ className }: GlyphProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M12 2.16c3.2 0 3.58.01 4.85.07 1.17.05 1.8.25 2.23.41.56.22.96.48 1.38.9s.68.82.9 1.38c.16.42.36 1.06.41 2.23.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.05 1.17-.25 1.8-.41 2.23-.22.56-.48.96-.9 1.38s-.82.68-1.38.9c-.42.16-1.06.36-2.23.41-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-1.17-.05-1.8-.25-2.23-.41-.56-.22-.96-.48-1.38-.9s-.68-.82-.9-1.38c-.16-.42-.36-1.06-.41-2.23C2.17 15.58 2.16 15.2 2.16 12s.01-3.58.07-4.85c.05-1.17.25-1.8.41-2.23.22-.56.48-.96.9-1.38s.82-.68 1.38-.9c.42-.16 1.06-.36 2.23-.41C8.42 2.17 8.8 2.16 12 2.16m0 5.18a4.66 4.66 0 1 0 0 9.32 4.66 4.66 0 0 0 0-9.32m0 7.69a3.03 3.03 0 1 1 0-6.06 3.03 3.03 0 0 1 0 6.06m5.93-7.87a1.09 1.09 0 1 1-2.18 0 1.09 1.09 0 0 1 2.18 0" />
    </svg>
  );
}

export function LinkedinGlyph({ className }: GlyphProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M6.94 5a1.94 1.94 0 1 1-3.88 0 1.94 1.94 0 0 1 3.88 0M3.3 8.44h3.32V21H3.3zm5.44 0h3.18v1.72h.05c.44-.83 1.52-1.72 3.14-1.72 3.36 0 3.98 2.2 3.98 5.07V21h-3.32v-6.14c0-1.47-.03-3.35-2.05-3.35-2.05 0-2.36 1.6-2.36 3.25V21H8.74z" />
    </svg>
  );
}

export function YoutubeGlyph({ className }: GlyphProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M21.6 7.2a2.52 2.52 0 0 0-1.77-1.78C18.25 5 12 5 12 5s-6.25 0-7.83.42A2.52 2.52 0 0 0 2.4 7.2 26.3 26.3 0 0 0 2 12a26.3 26.3 0 0 0 .4 4.8 2.52 2.52 0 0 0 1.77 1.78C5.75 19 12 19 12 19s6.25 0 7.83-.42a2.52 2.52 0 0 0 1.77-1.78A26.3 26.3 0 0 0 22 12a26.3 26.3 0 0 0-.4-4.8M10 15.02V8.98L15.2 12z" />
    </svg>
  );
}

export function TelegramGlyph({ className }: GlyphProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M21.9 4.36 18.6 19.9c-.25 1.1-.9 1.37-1.83.85l-5.05-3.72-2.44 2.35c-.27.27-.5.5-1.02.5l.36-5.14 9.36-8.46c.4-.36-.09-.56-.63-.2L5.78 13.36.8 11.8c-1.08-.34-1.1-1.08.23-1.6L20.5 2.79c.9-.33 1.69.2 1.4 1.57" />
    </svg>
  );
}

export const SOCIAL_GLYPHS = {
  facebook: FacebookGlyph,
  twitter: TwitterGlyph,
  instagram: InstagramGlyph,
  linkedin: LinkedinGlyph,
  youtube: YoutubeGlyph,
  telegram: TelegramGlyph,
} as const;

export type SocialKey = keyof typeof SOCIAL_GLYPHS;

const HANDLE_BASE: Partial<Record<SocialKey, string>> = {
  telegram: "https://t.me/",
  twitter: "https://x.com/",
  instagram: "https://instagram.com/",
};

/** Settings sometimes hold a bare handle (`@name`) instead of a full URL. */
export function normalizeSocialUrl(
  key: SocialKey,
  value?: string | null
): string | null {
  const raw = value?.trim();
  if (!raw) return null;
  if (/^https?:\/\//i.test(raw)) return raw;

  const base = HANDLE_BASE[key];
  if (!base) return null;
  return `${base}${raw.replace(/^@/, "")}`;
}
