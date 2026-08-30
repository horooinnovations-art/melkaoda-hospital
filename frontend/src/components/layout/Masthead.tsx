import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import NovaReveal from "@/components/nova/NovaReveal";
import MastAtmosphere from "@/components/layout/MastAtmosphere";
import SmartImage from "@/components/shared/SmartImage";
import { iconForText } from "@/lib/healthIcons";
import { optimizeImageUrl } from "@/lib/media";
import { sectionMeta } from "@/lib/sections";
import { SITE_NAME } from "@/lib/api";
import { cn } from "@/lib/utils";

export interface MastCrumb {
  label: string;
  href?: string;
}

export interface MastBadge {
  label: string;
  icon?: LucideIcon;
}

export interface MastStat {
  label: string;
  value: string;
}

export interface MastheadProps {
  /** The line, minus its closing phrase. */
  title: string;
  /** The closing phrase, set in the serif italic. Part of the same h1. */
  accent?: string;
  eyebrow?: string;
  lede?: string;
  /** Route this page occupies, e.g. "/departments". Resolves ordinal + group. */
  section?: string;
  crumbs?: MastCrumb[];
  backHref?: string;
  backLabel?: string;
  badges?: MastBadge[];
  stats?: MastStat[];
  actions?: ReactNode;
  /** A portrait for the aside column. Detail pages use this. */
  image?: string | null;
  /** Anything else for the aside column; wins over `image`. */
  aside?: ReactNode;
  /** Overrides the watermark inferred from the title. `null` suppresses it. */
  glyph?: LucideIcon | null;
  /** Tightens the closing padding, so a detail page sits nearer its body. */
  tight?: boolean;
  className?: string;
}

/**
 * The opening of every page except the homepage.
 *
 * Both interior shells render this: `PageHero` for a list or landing page and
 * `DetailShell` for a [slug] page, so a visitor moving from /news into a story
 * stays inside one composition rather than meeting a second design.
 *
 * `from="none"` rather than the usual "up": this sits above the fold on load,
 * so it fades in place instead of sliding up into it. The reveal is still what
 * puts `data-shown` on `.nv-mast`, and nova-interior.css keys every arrival off
 * that one attribute -- the identity rule, the bracket marks, the per-word
 * title rise, the lede, the rake, the figure rules. No second observer.
 */
export default function Masthead({
  title,
  accent,
  eyebrow,
  lede,
  section,
  crumbs,
  backHref,
  backLabel = "Back",
  badges,
  stats,
  actions,
  image,
  aside,
  glyph,
  tight = false,
  className,
}: MastheadProps) {
  const meta = sectionMeta(section);
  const plainTitle = [title, accent].filter(Boolean).join(" ");

  // `null` suppresses the watermark; `undefined` means "infer one from the
  // title", which is what makes nineteen interior pages open differently
  // without anybody tagging a single one of them in the CMS.
  const Glyph = glyph === null ? null : (glyph ?? iconForText(plainTitle, eyebrow));

  const heroSrc = image ? (optimizeImageUrl(image, 1200) ?? image) : null;
  const asideNode =
    aside ??
    (heroSrc ? (
      <div className="nv-mast__frame">
        <SmartImage
          src={heroSrc}
          // Decorative: the h1 beside this frame is the subject own name. A
          // non-empty alt here is what a 404 portrait renders as body text,
          // which is how one title came to print twice on detail pages.
          alt=""
          fill
          priority
          optimizeWidth={1200}
          sizes="(max-width: 1024px) 100vw, 344px"
        />
        <span className="nv-mast__tick" aria-hidden />
      </div>
    ) : null);

  // Home, then the navigation group, then — on a detail page only — the section
  // the story belongs to, linked. A [slug] route resolves to its parent section,
  // so the trail reads HOME · NEWSROOM · NEWS · <story> without the caller
  // spelling any of it out.
  // `backHref` is set by DetailShell and by nothing else, which makes it the
  // signal for "this is a story inside a section" — the section itself never
  // links to its own list page from its own breadcrumb.
  const onDetail = Boolean(backHref && meta);
  const trail: MastCrumb[] = [
    { label: "Home", href: "/" },
    ...(meta ? [{ label: meta.group }] : []),
    ...(onDetail && meta ? [{ label: meta.label, href: meta.path }] : []),
    ...(crumbs ?? []),
  ];

  return (
    <NovaReveal
      as="section"
      from="none"
      className={cn(
        "nv-mast -mx-[calc((100vw-100%)/2)] w-screen",
        tight && "nv-mast--tight",
        asideNode && "nv-mast--aside",
        className
      )}
    >
      <MastAtmosphere />

      {Glyph ? (
        <span className="nv-mast__glyph" aria-hidden>
          <Glyph />
        </span>
      ) : null}

      <div className="nv-mast__inner nv-shell nv-shell--wide">
        <div className={cn("nv-mast__grid", asideNode && "nv-mast__grid--aside")}>
          <div>
            {backHref ? (
              <Link href={backHref} className="nv-mast__back">
                <ArrowLeft aria-hidden />
                {backLabel}
              </Link>
            ) : null}

            <nav aria-label="Breadcrumb" className="nv-mast__crumbs">
              {trail.map((crumb, i) => {
                const last = i === trail.length - 1;
                if (i === 0) {
                  return (
                    <Link key="home" href="/" className="nv-mast__crumb">
                      {crumb.label}
                    </Link>
                  );
                }
                return (
                  <span key={`${crumb.label}-${i}`} className="nv-mast__step">
                    {crumb.href ? (
                      <Link href={crumb.href} className="nv-mast__crumb">
                        {crumb.label}
                      </Link>
                    ) : (
                      <span
                        className={cn(
                          "nv-mast__crumb",
                          last && "nv-mast__crumb--here"
                        )}
                        aria-current={last ? "page" : undefined}
                      >
                        {crumb.label}
                      </span>
                    )}
                  </span>
                );
              })}
            </nav>

            <p className="nv-mast__ident">
              {meta ? (
                <span className="nv-mast__ord" aria-hidden>
                  {meta.ordinal}
                </span>
              ) : null}
              <span className="nv-mast__org">{SITE_NAME}</span>
              <span className="nv-mast__ident-rule" aria-hidden />
            </p>

            {eyebrow ? <p className="nv-mast__tag">{eyebrow}</p> : null}

            <h1 className="nv-mast__title">
              <span className="sr-only">{plainTitle}</span>
              <span aria-hidden>
                <MastWords text={title} />
                {accent ? (
                  <>
                    {" "}
                    <MastWords text={accent} accent offset={countWords(title)} />
                  </>
                ) : null}
              </span>
            </h1>

            <div className="nv-mast__rule" aria-hidden>
              <span className="nv-mast__rule-bar" />
              <span className="nv-mast__rule-node" />
              <span className="nv-mast__rule-line" />
            </div>

            {lede ? <p className="nv-mast__lede">{lede}</p> : null}

            {badges && badges.length > 0 ? (
              <div className="nv-mast__badges">
                {badges.map((badge, i) => {
                  const Icon = badge.icon;
                  return (
                    <span key={`${badge.label}-${i}`} className="nv-mast__badge">
                      {Icon ? (
                        <Icon aria-hidden />
                      ) : (
                        <span className="nv-mast__badge-dot" aria-hidden />
                      )}
                      {badge.label}
                    </span>
                  );
                })}
              </div>
            ) : null}

            {stats && stats.length > 0 ? (
              <div className="nv-mast__figs">
                {stats.map((stat) => (
                  <div key={stat.label} className="nv-mast__fig">
                    <span className="nv-mast__fig-value">{stat.value}</span>
                    <span className="nv-mast__fig-label">{stat.label}</span>
                  </div>
                ))}
              </div>
            ) : null}

            {actions ? <div className="nv-mast__actions">{actions}</div> : null}
          </div>

          {asideNode ? <div className="nv-mast__aside">{asideNode}</div> : null}
        </div>
      </div>
    </NovaReveal>
  );
}

function countWords(text: string) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/**
 * One clipping box per word, each holding the word translated below its own
 * baseline; `--i` is the stagger index. The boxes are separated by real
 * whitespace rather than a margin, so the gaps are the word space the typeface
 * itself sets. The whole run is aria-hidden and a plain copy of the line sits
 * beside it, because a screen reader walking forty inline-blocks announces the
 * title with its spaces missing.
 */
function MastWords({
  text,
  accent = false,
  offset = 0,
}: {
  text: string;
  accent?: boolean;
  offset?: number;
}) {
  const words = text.trim().split(/\s+/).filter(Boolean);

  return (
    <>
      {words.map((word, i) => (
        <span key={`${word}-${i}`}>
          {i > 0 ? " " : null}
          <span
            className={cn("nv-mast__w", accent && "nv-mast__w--accent")}
            style={{ "--i": offset + i } as CSSProperties}
          >
            <span>{word}</span>
          </span>
        </span>
      ))}
    </>
  );
}
