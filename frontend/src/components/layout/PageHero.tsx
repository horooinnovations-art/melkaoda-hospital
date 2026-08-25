import Link from "next/link";
import { ChevronRight, Sparkles, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
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
  variant?: "default" | "gradient" | "premium" | "dark" | "minimal";
  badges?: { label: string; icon?: "sparkles" | "zap" }[];
  showDecoration?: boolean;
}

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
    <section
      className={cn(
        "g-page-hero -mx-[calc((100vw-100%)/2)] w-screen",
        className
      )}
    >
      <PageHeroAtmosphere />

      <div className="g-page-hero__inner mx-auto max-w-7xl px-5 lg:px-8">
        <nav aria-label="Breadcrumb" className="g-crumbs">
          <Link href="/" className="g-crumbs__chip">
            Home
          </Link>
          {trail.map((crumb) => (
            <span key={crumb.label} className="g-crumbs__step">
              <ChevronRight className="g-crumbs__chev" aria-hidden />
              {crumb.href ? (
                <Link href={crumb.href} className="g-crumbs__chip">
                  {crumb.label}
                </Link>
              ) : (
                <span className="g-crumbs__chip g-crumbs__chip--current">
                  {crumb.label}
                </span>
              )}
            </span>
          ))}
        </nav>

        <div className="g-page-hero__copy">
          <p className="g-page-hero__brand">
            <span className="g-page-hero__brand-mark" aria-hidden />
            Gambo General Hospital
          </p>

          {badges && badges.length > 0 && (
            <div className="g-page-hero__badges g-page-hero__badges--top">
              {badges.map((badge, idx) => {
                const BadgeIcon =
                  badge.icon === "sparkles"
                    ? Sparkles
                    : badge.icon === "zap"
                      ? Zap
                      : null;
                return (
                  <span
                    key={`${badge.label}-${idx}`}
                    className="g-detail-badge g-detail-badge--sky"
                  >
                    {BadgeIcon && <BadgeIcon className="h-3.5 w-3.5" />}
                    {badge.label}
                  </span>
                );
              })}
            </div>
          )}

          {eyebrow && (
            <p className="g-page-hero__kicker">
              <span className="g-page-hero__kicker-live" aria-hidden>
                <span className="g-page-hero__kicker-dot" />
              </span>
              {eyebrow}
            </p>
          )}

          <h1 className="g-page-hero__title">
            <span className="g-page-hero__title-ink">{title}</span>
          </h1>

          <div className="g-page-hero__flourish" aria-hidden>
            <span />
            <i />
            <span />
          </div>

          {subtitle && <p className="g-page-hero__sub">{subtitle}</p>}

          {stats && stats.length > 0 && (
            <div className="g-page-hero__stats">
              {stats.map((stat) => (
                <div key={stat.label} className="g-page-hero__stat">
                  <span className="g-page-hero__stat-value">{stat.value}</span>
                  <span className="g-page-hero__stat-label">{stat.label}</span>
                </div>
              ))}
            </div>
          )}

          {children && <div className="g-page-hero__actions">{children}</div>}
        </div>
      </div>
    </section>
  );
}
