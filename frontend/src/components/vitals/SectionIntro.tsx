import { cn } from "@/lib/utils";
import Reveal from "@/components/motion/Reveal";

interface SectionIntroProps {
  /** Ignored — retained for call-site compatibility. */
  index?: string;
  eyebrow: string;
  title: React.ReactNode;
  description?: string;
  tone?: "dark" | "light";
  action?: React.ReactNode;
  className?: string;
}

export default function SectionIntro({
  eyebrow,
  title,
  description,
  action,
  className,
}: SectionIntroProps) {
  return (
    <Reveal
      className={cn(
        "flex flex-col gap-5 md:flex-row md:items-end md:justify-between",
        className
      )}
    >
      <div className="max-w-2xl">
        <p className="g-kicker">{eyebrow}</p>
        <h2 className="g-title">
          <span className="g-title__ink">{title}</span>
        </h2>
        {description && <p className="g-lede">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </Reveal>
  );
}
