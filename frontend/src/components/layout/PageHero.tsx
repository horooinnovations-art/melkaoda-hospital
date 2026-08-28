import Link from "next/link";
import { Sparkles, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import NovaReveal from "@/components/nova/NovaReveal";
import PageHeroAtmosphere from "@/components/layout/PageHeroAtmosphere";

interface Crumb {
  label: string;
  href?: string;
}

interface PageHeroProps {
  title: string;
  subtitle?: string;
  image?: string;
  eyebrow?: string;
  breadcrumbs?: Crumb[];
  className?: string;
  children?: React.ReactNode;
  stats?: { label: string; value: string }[];
  /** Retained for source compatibility; the Nova opening has one treatment. */
  variant?: "default" | "gradient" | "premium" | "dark" | "minimal";
  badges?: { label: string; icon?: "sparkles" | "zap" }[];
  showDecoration?: boolean;
}

/**
 * The opening of every interior page.
 *
 * `from="none"` rather than the usual "up": this sits above the fold on load,
 * so it fades in place instead of sliding up into it. The reveal is still what
 * puts `data-shown` on `.nv-ph`, which is how the brand mark, the flourish and
 * the stat rules draw themselves — nova-page.css keys all of them off that one
 * attribute, so none of this needs its own observer.
 */
export default function PageHero({
  title,
  subtitle,
  eyebrow,
  breadcrumbs,
  className,
  children,
  stats,
  badges,
}: PageHeroProps) {
  const trail = breadcrumbs ?? [{ label: title }];

  return (
    <NovaReveal
      as="section"
      from="none"
      className={cn("nv-ph -mx-[calc((100vw-100%)/2)] w-screen", className)}
    >
      <PageHeroAtmosphere />

      <div className="nv-ph__inner nv-shell nv-shell--wide">
        <nav aria-label="Breadcrumb" className="nv-ph__crumbs">
          <Link href="/" className="nv-ph__crumb">
            Home
          </Link>
          {trail.map((crumb) => (
            <span key={crumb.label} className="nv-ph__step">
              {crumb.href ? (
                <Link href={crumb.href} className="nv-ph__crumb">
                  {crumb.label}
                </Link>
              ) : (
                <span className="nv-ph__crumb nv-ph__crumb--current" aria-current="page">
                  {crumb.label}
                </span>
              )}
            </span>
          ))}
        </nav>

        <p className="nv-ph__brand">
          <span className="nv-ph__brand-mark" aria-hidden />
          Gambo General Hospital
        </p>

        {badges && badges.length > 0 && (
          <div className="nv-ph__badges">
            {badges.map((badge, idx) => {
              const BadgeIcon =
                badge.icon === "sparkles"
                  ? Sparkles
                  : badge.icon === "zap"
                    ? Zap
                    : null;
              return (
                <span key={`${badge.label}-${idx}`} className="nv-ph__badge">
                  {BadgeIcon && <BadgeIcon aria-hidden />}
                  {badge.label}
                </span>
              );
            })}
          </div>
        )}

        {eyebrow && <p className="nv-eyebrow mt-5">{eyebrow}</p>}

        <h1 className="nv-ph__title">{title}</h1>

        <div className="nv-ph__flourish" aria-hidden />

        {subtitle && <p className="nv-ph__sub">{subtitle}</p>}

        {stats && stats.length > 0 && (
          <div className="nv-ph__stats">
            {stats.map((stat) => (
              <div key={stat.label} className="nv-ph__stat">
                <span className="nv-ph__stat-value">{stat.value}</span>
                <span className="nv-ph__stat-label">{stat.label}</span>
              </div>
            ))}
          </div>
        )}

        {children && <div className="nv-ph__actions">{children}</div>}
      </div>
    </NovaReveal>
  );
}
