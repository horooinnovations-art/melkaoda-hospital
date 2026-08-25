"use client";

import { useEffect, useRef } from "react";

type Theme = "dark" | "light";

interface Vec3 {
  x: number;
  y: number;
  z: number;
}

type ShapeKind = "sphere" | "ring" | "poly" | "blob";

interface FieldShape {
  kind: ShapeKind;
  pos: Vec3;
  vel: Vec3;
  radius: number;
  rx: number;
  ry: number;
  rz: number;
  vrx: number;
  vry: number;
  vrz: number;
  hue: number;
  alpha: number;
  breathPhase: number;
  breathSpeed: number;
  sides?: number;
}

interface Node3D extends Vec3 {
  vx: number;
  vy: number;
  vz: number;
  size: number;
}

function project(
  p: Vec3,
  cx: number,
  cy: number,
  focal: number,
  camZ: number
) {
  const z = p.z + camZ;
  if (z <= 40) return null;
  const scale = focal / z;
  return {
    px: cx + p.x * scale,
    py: cy + p.y * scale,
    scale,
    z: p.z,
  };
}

function rotateX(p: Vec3, a: number): Vec3 {
  const c = Math.cos(a);
  const s = Math.sin(a);
  return { x: p.x, y: p.y * c - p.z * s, z: p.y * s + p.z * c };
}

function rotateY(p: Vec3, a: number): Vec3 {
  const c = Math.cos(a);
  const s = Math.sin(a);
  return { x: p.x * c + p.z * s, y: p.y, z: -p.x * s + p.z * c };
}

function rotateZ(p: Vec3, a: number): Vec3 {
  const c = Math.cos(a);
  const s = Math.sin(a);
  return { x: p.x * c - p.y * s, y: p.x * s + p.y * c, z: p.z };
}

function iridescent(
  theme: Theme,
  hue: number,
  alpha: number
): { fill: string; stroke: string; glow: string } {
  if (theme === "dark") {
    const h1 = 168 + hue * 40;
    const h2 = 195 + hue * 55;
    const h3 = 265 + hue * 20;
    return {
      fill: `hsla(${h1}, 72%, 58%, ${alpha * 0.22})`,
      stroke: `hsla(${h2}, 78%, 68%, ${alpha * 0.55})`,
      glow: `hsla(${h3}, 70%, 62%, ${alpha * 0.35})`,
    };
  }
  return {
    fill: `hsla(${175 + hue * 20}, 45%, 38%, ${alpha * 0.12})`,
    stroke: `hsla(${172 + hue * 15}, 42%, 32%, ${alpha * 0.28})`,
    glow: `hsla(${180 + hue * 10}, 40%, 40%, ${alpha * 0.18})`,
  };
}

/**
 * Ambient geometric field: translucent spheres, rings, soft polyhedrons and
 * organic blobs drifting with a 4–6s breath rhythm, soft DOF and mouse parallax.
 */
export default function GeometricFieldCanvas({
  theme = "dark",
}: {
  theme?: Theme;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const mouseRef = useRef({ x: 0.5, y: 0.5, tx: 0.5, ty: 0.5 });
  const visibleRef = useRef(true);
  const reduceRef = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    reduceRef.current =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let width = 0;
    let height = 0;
    let dpr = 1;
    const focal = 380;
    const camZ = 520;

    const resize = () => {
      const rect = container.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = Math.max(1, rect.width);
      height = Math.max(1, rect.height);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const ro = new ResizeObserver(resize);
    ro.observe(container);
    resize();

    const shapes: FieldShape[] = [];
    const kinds: ShapeKind[] = ["sphere", "ring", "poly", "blob", "sphere", "ring"];
    const count = reduceRef.current ? 6 : 14;

    for (let i = 0; i < count; i += 1) {
      const kind = kinds[i % kinds.length];
      shapes.push({
        kind,
        pos: {
          x: (Math.random() - 0.5) * 720,
          y: (Math.random() - 0.5) * 520,
          z: (Math.random() - 0.5) * 420,
        },
        vel: {
          x: (Math.random() - 0.5) * 0.18,
          y: (Math.random() - 0.5) * 0.14,
          z: (Math.random() - 0.5) * 0.12,
        },
        radius: 28 + Math.random() * 54,
        rx: Math.random() * Math.PI * 2,
        ry: Math.random() * Math.PI * 2,
        rz: Math.random() * Math.PI * 2,
        vrx: (Math.random() - 0.5) * 0.004,
        vry: (Math.random() - 0.5) * 0.005,
        vrz: (Math.random() - 0.5) * 0.003,
        hue: Math.random(),
        alpha: 0.45 + Math.random() * 0.45,
        breathPhase: Math.random() * Math.PI * 2,
        breathSpeed: 0.9 + Math.random() * 0.45,
        sides: 5 + Math.floor(Math.random() * 3),
      });
    }

    const nodes: Node3D[] = [];
    const nodeCount = reduceRef.current ? 18 : 42;
    for (let i = 0; i < nodeCount; i += 1) {
      nodes.push({
        x: (Math.random() - 0.5) * 780,
        y: (Math.random() - 0.5) * 560,
        z: (Math.random() - 0.5) * 500,
        vx: (Math.random() - 0.5) * 0.28,
        vy: (Math.random() - 0.5) * 0.28,
        vz: (Math.random() - 0.5) * 0.2,
        size: 1 + Math.random() * 2.2,
      });
    }

    const onMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current.tx = (e.clientX - rect.left) / Math.max(1, rect.width);
      mouseRef.current.ty = (e.clientY - rect.top) / Math.max(1, rect.height);
    };
    const onLeave = () => {
      mouseRef.current.tx = 0.5;
      mouseRef.current.ty = 0.5;
    };
    window.addEventListener("mousemove", onMove, { passive: true });
    canvas.addEventListener("mouseleave", onLeave);

    const drawSphere = (
      px: number,
      py: number,
      r: number,
      colors: ReturnType<typeof iridescent>,
      blur: number
    ) => {
      ctx.save();
      if (blur > 0.4) ctx.filter = `blur(${blur.toFixed(1)}px)`;
      const g = ctx.createRadialGradient(px - r * 0.28, py - r * 0.32, r * 0.08, px, py, r);
      g.addColorStop(0, colors.glow);
      g.addColorStop(0.45, colors.fill);
      g.addColorStop(1, "transparent");
      ctx.beginPath();
      ctx.arc(px, py, r, 0, Math.PI * 2);
      ctx.fillStyle = g;
      ctx.fill();
      ctx.strokeStyle = colors.stroke;
      ctx.lineWidth = 1.1;
      ctx.stroke();
      ctx.restore();
    };

    const drawRing = (
      px: number,
      py: number,
      r: number,
      shape: FieldShape,
      colors: ReturnType<typeof iridescent>,
      blur: number
    ) => {
      ctx.save();
      if (blur > 0.4) ctx.filter = `blur(${blur.toFixed(1)}px)`;
      ctx.translate(px, py);
      ctx.rotate(shape.rz);
      ctx.scale(1, 0.38 + Math.abs(Math.sin(shape.rx)) * 0.45);
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.strokeStyle = colors.stroke;
      ctx.lineWidth = 2.2;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.72, 0, Math.PI * 2);
      ctx.strokeStyle = colors.fill;
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();
    };

    const drawPoly = (
      px: number,
      py: number,
      r: number,
      shape: FieldShape,
      colors: ReturnType<typeof iridescent>,
      blur: number
    ) => {
      const sides = shape.sides ?? 6;
      ctx.save();
      if (blur > 0.4) ctx.filter = `blur(${blur.toFixed(1)}px)`;
      ctx.translate(px, py);
      ctx.rotate(shape.ry);
      ctx.beginPath();
      for (let i = 0; i <= sides; i += 1) {
        const a = (i / sides) * Math.PI * 2 + shape.rz;
        const rr = r * (0.86 + Math.sin(a * 3 + shape.rx) * 0.08);
        const x = Math.cos(a) * rr;
        const y = Math.sin(a) * rr * (0.72 + Math.abs(Math.cos(shape.rx)) * 0.28);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fillStyle = colors.fill;
      ctx.fill();
      ctx.strokeStyle = colors.stroke;
      ctx.lineWidth = 1.15;
      ctx.stroke();
      ctx.restore();
    };

    const drawBlob = (
      px: number,
      py: number,
      r: number,
      shape: FieldShape,
      colors: ReturnType<typeof iridescent>,
      blur: number,
      t: number
    ) => {
      ctx.save();
      if (blur > 0.4) ctx.filter = `blur(${blur.toFixed(1)}px)`;
      ctx.translate(px, py);
      ctx.rotate(shape.rz + t * 0.08);
      ctx.beginPath();
      const steps = 28;
      for (let i = 0; i <= steps; i += 1) {
        const a = (i / steps) * Math.PI * 2;
        const wobble =
          0.78 +
          0.14 * Math.sin(a * 3 + shape.breathPhase + t) +
          0.08 * Math.cos(a * 5 - shape.rx);
        const x = Math.cos(a) * r * wobble;
        const y = Math.sin(a) * r * wobble * 0.88;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      const g = ctx.createRadialGradient(-r * 0.2, -r * 0.25, r * 0.1, 0, 0, r);
      g.addColorStop(0, colors.glow);
      g.addColorStop(0.55, colors.fill);
      g.addColorStop(1, "transparent");
      ctx.fillStyle = g;
      ctx.fill();
      ctx.strokeStyle = colors.stroke;
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();
    };

    let last = performance.now();

    const tick = (now: number) => {
      const dt = Math.min(32, now - last) / 16.67;
      last = now;

      if (!visibleRef.current) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }

      const m = mouseRef.current;
      m.x += (m.tx - m.x) * 0.045;
      m.y += (m.ty - m.y) * 0.045;
      const parallaxX = (m.x - 0.5) * 48;
      const parallaxY = (m.y - 0.5) * 32;

      ctx.clearRect(0, 0, width, height);
      const cx = width / 2 + parallaxX * 0.35;
      const cy = height / 2 + parallaxY * 0.35;
      const t = now * 0.001;
      const animate = !reduceRef.current;

      // Soft volumetric light pools
      if (theme === "dark") {
        const glow = ctx.createRadialGradient(
          cx + Math.sin(t * 0.2) * 80,
          cy - 40,
          20,
          cx,
          cy,
          Math.max(width, height) * 0.55
        );
        glow.addColorStop(0, "rgba(20, 224, 163, 0.07)");
        glow.addColorStop(0.4, "rgba(56, 207, 232, 0.04)");
        glow.addColorStop(1, "transparent");
        ctx.fillStyle = glow;
        ctx.fillRect(0, 0, width, height);
      }

      const projectedNodes: { px: number; py: number; size: number; alpha: number }[] =
        [];

      for (const node of nodes) {
        if (animate) {
          node.x += node.vx * dt;
          node.y += node.vy * dt;
          node.z += node.vz * dt;
          if (Math.abs(node.x) > 390) node.vx *= -1;
          if (Math.abs(node.y) > 300) node.vy *= -1;
          if (Math.abs(node.z) > 260) node.vz *= -1;
          let p: Vec3 = node;
          p = rotateY(p, 0.00055 * dt);
          p = rotateX(p, 0.00025 * dt);
          node.x = p.x;
          node.y = p.y;
          node.z = p.z;
        }

        const pr = project(
          {
            x: node.x + parallaxX * (0.2 + node.z / 800),
            y: node.y + parallaxY * (0.15 + node.z / 900),
            z: node.z,
          },
          cx,
          cy,
          focal,
          camZ
        );
        if (!pr) continue;
        const alpha = Math.max(0.04, Math.min(0.7, (280 - node.z) / 560));
        projectedNodes.push({
          px: pr.px,
          py: pr.py,
          size: node.size * pr.scale,
          alpha,
        });
      }

      const maxDist = 128;
      for (let i = 0; i < projectedNodes.length; i += 1) {
        const n1 = projectedNodes[i];
        ctx.beginPath();
        ctx.arc(n1.px, n1.py, n1.size, 0, Math.PI * 2);
        ctx.fillStyle =
          theme === "dark"
            ? `rgba(20, 224, 163, ${n1.alpha * 0.9})`
            : `rgba(15, 118, 110, ${n1.alpha * 0.55})`;
        ctx.fill();

        for (let j = i + 1; j < projectedNodes.length; j += 1) {
          const n2 = projectedNodes[j];
          const dx = n1.px - n2.px;
          const dy = n1.py - n2.py;
          const dist = Math.hypot(dx, dy);
          if (dist >= maxDist) continue;
          const opacity =
            (1 - dist / maxDist) *
            Math.min(n1.alpha, n2.alpha) *
            (theme === "dark" ? 0.11 : 0.06);
          ctx.beginPath();
          ctx.moveTo(n1.px, n1.py);
          ctx.lineTo(n2.px, n2.py);
          ctx.strokeStyle =
            theme === "dark"
              ? `rgba(56, 207, 232, ${opacity})`
              : `rgba(15, 118, 110, ${opacity})`;
          ctx.lineWidth = 0.7;
          ctx.stroke();
        }
      }

      // Sort shapes far → near for soft DOF
      const drawn = shapes
        .map((shape) => {
          if (animate) {
            shape.pos.x += shape.vel.x * dt;
            shape.pos.y += shape.vel.y * dt;
            shape.pos.z += shape.vel.z * dt;
            if (Math.abs(shape.pos.x) > 360) shape.vel.x *= -1;
            if (Math.abs(shape.pos.y) > 260) shape.vel.y *= -1;
            if (Math.abs(shape.pos.z) > 220) shape.vel.z *= -1;
            shape.rx += shape.vrx * dt;
            shape.ry += shape.vry * dt;
            shape.rz += shape.vrz * dt;
          }

          // 4–6s breath cycle (~0.17–0.25 Hz)
          const breath =
            1 +
            Math.sin(t * shape.breathSpeed * 1.05 + shape.breathPhase) * 0.07;
          const depthBias = 0.15 + (shape.pos.z + 220) / 500;
          const world: Vec3 = {
            x: shape.pos.x + parallaxX * depthBias,
            y: shape.pos.y + parallaxY * depthBias * 0.85,
            z: shape.pos.z,
          };
          const pr = project(world, cx, cy, focal, camZ);
          if (!pr) return null;
          const r = shape.radius * pr.scale * breath;
          const fog = Math.max(0.2, Math.min(1, (240 - shape.pos.z) / 480));
          const blur = Math.max(0, Math.min(4.5, Math.abs(shape.pos.z) / 70));
          const colors = iridescent(theme, shape.hue, shape.alpha * fog);
          return { shape, pr, r, colors, blur };
        })
        .filter(Boolean)
        .sort((a, b) => (a!.pr.z - b!.pr.z));

      for (const item of drawn) {
        if (!item) continue;
        const { shape, pr, r, colors, blur } = item;
        if (shape.kind === "sphere") drawSphere(pr.px, pr.py, r, colors, blur);
        else if (shape.kind === "ring") drawRing(pr.px, pr.py, r, shape, colors, blur);
        else if (shape.kind === "poly") drawPoly(pr.px, pr.py, r, shape, colors, blur);
        else drawBlob(pr.px, pr.py, r, shape, colors, blur, t);
      }

      if (animate) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };

    const io = new IntersectionObserver(
      (entries) => {
        visibleRef.current = entries.some((e) => e.isIntersecting);
      },
      { threshold: 0.04 }
    );
    io.observe(canvas);

    if (reduceRef.current) {
      visibleRef.current = true;
      tick(performance.now());
    } else {
      rafRef.current = requestAnimationFrame(tick);
    }

    return () => {
      window.removeEventListener("mousemove", onMove);
      canvas.removeEventListener("mouseleave", onLeave);
      ro.disconnect();
      io.disconnect();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [theme]);

  return (
    <div
      ref={containerRef}
      className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
      aria-hidden
    >
      <canvas
        ref={canvasRef}
        className="pointer-events-auto block h-full w-full opacity-[0.78]"
        style={{ mixBlendMode: theme === "dark" ? "screen" : "multiply" }}
      />
    </div>
  );
}
