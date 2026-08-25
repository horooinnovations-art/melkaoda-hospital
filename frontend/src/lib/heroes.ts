/** Resolve a page-hero image from CMS media — never Unsplash. */
import { getImageFromItem, resolveMediaUrl } from "./media";

export function heroFromSettings(
  settings?: Record<string, unknown> | null
): string | undefined {
  if (!settings) return undefined;
  return (
    resolveMediaUrl(settings.hero_image_url as string) ||
    resolveMediaUrl(settings.banner_url as string) ||
    resolveMediaUrl(settings.logo_url as string)
  );
}

export function heroFromItems(
  items?: Array<Record<string, unknown>> | null
): string | undefined {
  if (!items?.length) return undefined;
  for (const item of items) {
    const src = getImageFromItem(item);
    if (src) return src;
  }
  return undefined;
}
