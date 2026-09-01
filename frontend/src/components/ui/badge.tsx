import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors",
  {
    variants: {
      variant: {
        default: "border-[rgba(77,130,245,0.3)] bg-[rgba(77,130,245,0.15)] text-[#4d82f5]",
        brass: "border-emerald-500/30 bg-emerald-500/15 text-emerald-400",
        muted: "border-white/10 bg-white/5 text-[var(--ld-muted)]",
        outline: "border-white/15 text-[var(--ld-ink)] bg-transparent",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
