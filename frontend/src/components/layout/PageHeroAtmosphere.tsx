/**
 * Interior-page atmosphere — Nova.
 *
 * This used to render ~40 decorative nodes (prisms, a constellation, corner
 * jewels, a crest, pilasters, a ribbon, four frame rings). All of it has been
 * replaced by three light layers, defined in nova-page.css: two blooms that
 * breathe on long, offset cycles and a corner vignette. The rail field and the
 * base seam are pseudo-elements on `.nv-ph` itself, so they need no markup.
 *
 * The reasoning is the same one the rest of the system follows: richness that
 * comes from ornament stacked on a surface has to keep adding ornament, while
 * richness that comes from the surface — an edge catching light, a hairline
 * warming at its centre — holds up at any size.
 */
export default function PageHeroAtmosphere() {
  return (
    <>
      <span className="nv-ph__glow" aria-hidden />
      <span className="nv-ph__glow nv-ph__glow--warm" aria-hidden />
      <span className="nv-ph__vignette" aria-hidden />
    </>
  );
}
