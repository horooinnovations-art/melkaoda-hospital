import { HeartPulse } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  title?: string;
  description?: string;
  className?: string;
  icon?: React.ReactNode;
}

/**
 * Page-scale empty and error state.
 *
 * The previous version was a white card with #0c1b2a copy and a sky-to-blue
 * icon plate — legible on the old light canvas, invisible on charcoal. It now
 * uses `.nv-state`, which is the card-sized `.nv-empty` widened to page scale
 * rather than a second look for the same idea.
 */
export default function EmptyState({
  title = "Nothing here yet",
  description = "Check back soon — we're updating this section.",
  className,
  icon,
}: EmptyStateProps) {
  return (
    <div className={cn("nv-state", className)}>
      <span className="nv-state__ico" aria-hidden>
        {icon ?? <HeartPulse />}
      </span>
      <p className="nv-state__title">{title}</p>
      {description ? <p className="nv-state__desc">{description}</p> : null}
    </div>
  );
}
