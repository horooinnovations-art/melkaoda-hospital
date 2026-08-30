/**
 * The ground under every interior masthead.
 *
 * Six layers, all defined in nova-interior.css and all decorative, so none of
 * them takes a node in the accessibility tree:
 *
 *   1. a fine dot matrix, drifting one interval on a 64s loop
 *   2. three concentric hairline arcs struck from a centre off the top-right
 *   3. a bronze bloom from the left, where the title starts
 *   4. a cool bloom from the lower right, so the light crosses a diagonal
 *   5. one diagonal rake that passes once as the page settles
 *   6. a corner vignette, letting the edges drop away
 *
 * What this replaced was `PageHeroAtmosphere`: two blooms and a vignette over a
 * field of vertical rails. The rails were the problem — a ruled field reads as
 * lined paper, and every interior page in the site was set on it.
 */
export default function MastAtmosphere() {
  return (
    <>
      <span className="nv-mast__matrix" aria-hidden />
      <span className="nv-mast__arcs" aria-hidden />
      <span className="nv-mast__bloom" aria-hidden />
      <span className="nv-mast__bloom nv-mast__bloom--far" aria-hidden />
      <span className="nv-mast__rake" aria-hidden />
      <span className="nv-mast__vignette" aria-hidden />
    </>
  );
}
