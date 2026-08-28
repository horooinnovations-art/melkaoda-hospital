"use client";

import "./TronGrid.css";

/**
 * Full-viewport animated Tron-style perspective grid.
 * CSS-only grid + forward-motion animation.
 * Non-interactive, sits behind all page content.
 */
export default function TronGrid() {
  return (
    <div className="tron-grid" aria-hidden="true">
      {/* Deep space base */}
      <div className="tron-grid__base" />

      {/* The perspective-transformed grid floor */}
      <div className="tron-grid__perspective">
        <div className="tron-grid__floor">
          {/* Primary grid lines (animated) */}
          <div className="tron-grid__lines tron-grid__lines--primary" />
          {/* Secondary finer grid */}
          <div className="tron-grid__lines tron-grid__lines--secondary" />
        </div>
      </div>

      {/* Depth fade mask — fades grid into darkness near horizon */}
      <div className="tron-grid__fade" />

      {/* Vignette overlay */}
      <div className="tron-grid__vignette" />
    </div>
  );
}
