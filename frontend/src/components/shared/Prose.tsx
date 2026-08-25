import { cn } from "@/lib/utils";
import { sanitizeCmsHtml } from "@/lib/sanitizeHtml";

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
      className={cn("prose-hospital g-prose max-w-none", className)}
      dangerouslySetInnerHTML={{ __html: safeHtml }}
    />
  );
}
