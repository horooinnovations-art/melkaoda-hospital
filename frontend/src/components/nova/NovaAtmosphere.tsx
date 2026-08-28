/**
 * Non-interactive backdrop for the hero band: a wide champagne bloom, a low warm
 * horizon with a single hairline across it, and film grain over both. All of it
 * is CSS (see nova-atmosphere.css) — this component only parks the layers.
 *
 * The layer is document-anchored and hero-height, so it scrolls away with the
 * hero and everything below reads against the flat charcoal page. The corner
 * falloff is separate and viewport-anchored: `body::before` in nova-core.css.
 *
 * This used to be a 2D canvas painting a mint/teal neon perspective grid and an
 * amber sun, driven by a requestAnimationFrame loop. It was replaced because a
 * saturated neon horizon belongs to a different product than a charcoal page
 * with champagne hairlines — and because that loop ran on every public page for
 * the life of the visit. Nothing here needs a client boundary, so there is no
 * "use client" either: the whole backdrop now ships as markup and CSS.
 */

export default function NovaAtmosphere() {
  return (
    <div className="nv-bg" aria-hidden>
      <span className="nv-bg__bloom" />
      <span className="nv-bg__horizon" />
      <span className="nv-bg__grain" />
    </div>
  );
}
