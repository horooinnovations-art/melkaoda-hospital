import { cn } from "@/lib/utils";

interface EmptyStateProps {
  title?: string;
  description?: string;
  className?: string;
  icon?: React.ReactNode;
}

function HeartPulseIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M19.5 12.572 12 20l-7.5-7.428A5 5 0 1 1 12 6.006a5 5 0 1 1 7.5 6.566" />
      <path d="M3.5 12h3l2 4 3-8 2 4h5" />
    </svg>
  );
}

export default function EmptyState({
  title = "Nothing here yet",
  description = "Check back soon — we're updating this section.",
  className,
  icon,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "v-home-card relative flex flex-col items-center justify-center overflow-hidden px-8 py-20 text-center",
        className
      )}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[3px] bg-sky-700/70" />
      <div className="relative mb-5 grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-[#0c1b2a] to-[#1d4ed8] text-sky-100">
        {icon ?? <HeartPulseIcon className="h-6 w-6" />}
      </div>
      <h3 className="relative font-display text-2xl text-[#0c1b2a]">{title}</h3>
      <p className="relative mt-3 max-w-md text-sm leading-relaxed text-[#5a6e6a]">
        {description}
      </p>
    </div>
  );
}
