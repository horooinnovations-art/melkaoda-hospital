/** Shared ceremonial atmosphere for interior page heroes. */
export default function PageHeroAtmosphere() {
  return (
    <div className="g-page-hero__atmosphere" aria-hidden>
      <div className="g-page-hero__dusk" />
      <div className="g-page-hero__dawn" />
      <div className="g-page-hero__aurora" />
      <div className="g-page-hero__lattice" />
      <div className="g-page-hero__veil" />

      <div className="g-page-hero__prisms">
        <span className="g-page-hero__prism g-page-hero__prism--a" />
        <span className="g-page-hero__prism g-page-hero__prism--b" />
        <span className="g-page-hero__prism g-page-hero__prism--c" />
      </div>

      <div className="g-page-hero__constellation">
        <i />
        <i />
        <i />
        <i />
        <i />
        <i />
        <i />
        <i />
      </div>

      {/* Ornate decorative border frame */}
      <div className="g-page-hero__frame">
        <span className="g-page-hero__frame-outer" />
        <span className="g-page-hero__frame-mid" />
        <span className="g-page-hero__frame-inner" />
        <span className="g-page-hero__frame-glow" />

        <span className="g-page-hero__corner g-page-hero__corner--tl">
          <i />
          <em />
        </span>
        <span className="g-page-hero__corner g-page-hero__corner--tr">
          <i />
          <em />
        </span>
        <span className="g-page-hero__corner g-page-hero__corner--bl">
          <i />
          <em />
        </span>
        <span className="g-page-hero__corner g-page-hero__corner--br">
          <i />
          <em />
        </span>

        <span className="g-page-hero__jewel g-page-hero__jewel--t" />
        <span className="g-page-hero__jewel g-page-hero__jewel--b" />
        <span className="g-page-hero__jewel g-page-hero__jewel--l" />
        <span className="g-page-hero__jewel g-page-hero__jewel--r" />
      </div>

      <div className="g-page-hero__pilaster g-page-hero__pilaster--l">
        <span className="g-page-hero__finial" />
        <span className="g-page-hero__shaft" />
        <span className="g-page-hero__base" />
      </div>
      <div className="g-page-hero__pilaster g-page-hero__pilaster--r">
        <span className="g-page-hero__finial" />
        <span className="g-page-hero__shaft" />
        <span className="g-page-hero__base" />
      </div>

      <div className="g-page-hero__crest">
        <span className="g-page-hero__crest-ring" />
        <span className="g-page-hero__crest-ring g-page-hero__crest-ring--outer" />
        <span className="g-page-hero__crest-core">
          <svg viewBox="0 0 40 40" className="g-page-hero__crest-mark">
            <path
              d="M20 4 L22.2 14.5 L33 14.5 L24.4 21 L27.2 31.5 L20 25.2 L12.8 31.5 L15.6 21 L7 14.5 L17.8 14.5 Z"
              fill="currentColor"
            />
            <circle cx="20" cy="20" r="3.2" fill="currentColor" opacity="0.35" />
          </svg>
        </span>
      </div>

      <div className="g-page-hero__ribbon">
        <span />
        <em />
        <span />
      </div>

      <div className="g-page-hero__threshold">
        <span className="g-page-hero__threshold-line" />
        <span className="g-page-hero__threshold-gem" />
        <span className="g-page-hero__threshold-line" />
      </div>
    </div>
  );
}
