import { cn } from "@/lib/utils";

/**
 * Layered ambience used behind dark "Vitals" sections: drifting aurora,
 * a slow technical grid and a faint field of medical crosses.
 */
export function Backdrop({
  variant = "dark",
  crosses = false,
  className,
}: {
  variant?: "dark" | "light";
  crosses?: boolean;
  className?: string;
}) {
  return (
    <div
      aria-hidden
      className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}
    >
      <span className={cn("v-aurora", variant === "light" && "v-aurora-soft")} />
      <span className={cn("v-grid", variant === "light" && "v-grid-ink")} />
      {crosses && <span className="v-crosses" />}
    </div>
  );
}

const BEATS = 5;
const SPAN = 300;

function ecgPath() {
  let d = "M 0 50";
  for (let i = 0; i < BEATS; i += 1) {
    const x = i * SPAN;
    d += ` H ${x + 96} l 12 -13 l 10 -34 l 14 74 l 12 -47 l 10 20 H ${x + SPAN}`;
  }
  return d;
}

/**
 * Continuously drawing heartbeat trace. Used as a section rule and as the
 * signature motif on the hero / emergency bands.
 */
export function EcgLine({
  className,
  stroke = "rgba(20,224,163,0.85)",
  width = 1.6,
}: {
  className?: string;
  stroke?: string;
  width?: number;
}) {
  return (
    <svg
      aria-hidden
      viewBox={`0 0 ${BEATS * SPAN} 100`}
      preserveAspectRatio="none"
      className={cn("v-ecg h-full w-full", className)}
    >
      <path
        d={ecgPath()}
        fill="none"
        stroke={stroke}
        strokeWidth={width}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

/** Small status chip with a blinking vital dot. */
export function VitalChip({
  children,
  tone = "mint",
  className,
}: {
  children: React.ReactNode;
  tone?: "mint" | "coral" | "ink";
  className?: string;
}) {
  const tones = {
    mint: "border-mint/30 bg-mint/10 text-mint",
    coral: "border-coral/35 bg-coral/12 text-coral",
    ink: "border-teal-deep/15 bg-teal-deep/6 text-teal-deep",
  } as const;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.22em]",
        tones[tone],
        className
      )}
    >
      <span className="v-blip relative flex h-1.5 w-1.5">
        <span className="absolute inline-flex h-full w-full rounded-full bg-current opacity-70" />
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-current" />
      </span>
      {children}
    </span>
  );
}
