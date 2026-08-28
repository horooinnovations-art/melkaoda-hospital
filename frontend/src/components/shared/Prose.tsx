import { cn } from "@/lib/utils";
import { sanitizeCmsHtml } from "@/lib/sanitizeHtml";

/**
 * Sanitized CMS HTML, styled for charcoal.
 *
 * The old `prose-hospital g-prose` pair set near-black ink on a light card, so
 * every detail page's body copy was unreadable once the canvas went dark. The
 * `.nv-prose` scope in nova-page.css styles by element rather than by class,
 * because what an editor produces is arbitrary — it also covers tables and code
 * blocks, which neither previous sheet styled at all.
 */
export default function Prose({
  html,
  className,
}: {
  html: string;
  className?: string;
}) {
  const safeHtml = sanitizeCmsHtml(html);

  return (
    <div
      className={cn("nv-prose max-w-none", className)}
      dangerouslySetInnerHTML={{ __html: safeHtml }}
    />
  );
}
