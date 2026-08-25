import DOMPurify from "isomorphic-dompurify";
import { rewriteProseHtml } from "@/lib/media";


export function sanitizeCmsHtml(html: string | null | undefined): string {
  if (!html) return "";
  const cleaned = DOMPurify.sanitize(String(html), {
    USE_PROFILES: { html: true },
    ADD_ATTR: ["target", "rel"],
  });
  return rewriteProseHtml(cleaned);
}
