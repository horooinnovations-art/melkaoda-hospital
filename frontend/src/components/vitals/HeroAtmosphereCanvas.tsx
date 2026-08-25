"use client";

import { useEffect, useRef } from "react";

interface Vec3 {
  x: number;
  y: number;
  z: number;
}

interface Orb {
  pos: Vec3;
  vel: Vec3;
  radius: number;
  hue: number;
  sat: number;
  light: number;
  alpha: number;
  phase: number;
  speed: number;
  spin: number;
  spinVel: number;
}

interface Spark {
  pos: Vec3;
  vel: Vec3;
  size: number;
  hue: number;
  alpha: number;
}

function project(p: Vec3, cx: number, cy: number, focal: number, camZ: number) {
  const z = p.z + camZ;
  if (z <= 40) return null;
  const s = focal / z;
  return { px: cx + p.x * s, py: cy + p.y * s, scale: s, z: p.z };
}

function rotateY(p: Vec3, a: number): Vec3 {
  const c = Math.cos(a);
  const s = Math.sin(a);
  return { x: p.x * c + p.z * s, y: p.y, z: -p.x * s + p.z * c };
}

function rotateX(p: Vec3, a: number): Vec3 {
  const c = Math.cos(a);
  const s = Math.sin(a);
  return { x: p.x, y: p.y * c - p.z * s, z: p.y * s + p.z * c };
}

/**
 * Soft cinematic 3D field for the hero — luminous orbs, ribbons, sparks, parallax.
 */
export default function HeroAtmosphereCanvas() {
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
    const focal = 420;
    const camZ = 520;

    // Offscreen canvases for bloom and noise
    const offscreen = document.createElement("canvas");
    const offCtx = offscreen.getContext("2d");
    const noiseCanvas = document.createElement("canvas");
    const noiseCtx = noiseCanvas.getContext("2d");

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
      // size offscreen canvases
      offscreen.width = canvas.width;
      offscreen.height = canvas.height;
      noiseCanvas.width = canvas.width;
      noiseCanvas.height = canvas.height;

      // Generate a subtle static noise texture once per resize
      if (noiseCtx) {
        const img = noiseCtx.createImageData(noiseCanvas.width, noiseCanvas.height);
        for (let i = 0; i < img.data.length; i += 4) {
          const v = 128 + (Math.random() - 0.5) * 32; // subtle
          img.data[i] = v;
          img.data[i + 1] = v;
          img.data[i + 2] = v;
          img.data[i + 3] = 12; // low alpha
        }
        noiseCtx.putImageData(img, 0, 0);
      }
    };

    const ro = new ResizeObserver(resize);
    ro.observe(container);
    resize();

    // Cool night palette — blue / indigo / soft violet on deep black
    // Broader, richer palette
    const hues = [162, 168, 174, 180, 42, 38, 155];
    const orbCount = reduceRef.current ? 6 : 20;
    const orbs: Orb[] = [];

    for (let i = 0; i < orbCount; i += 1) {
      const hue = hues[i % hues.length] + (Math.random() - 0.5) * 14;
      orbs.push({
        pos: {
          x: (Math.random() - 0.5) * 780,
          y: (Math.random() - 0.5) * 520,
          z: (Math.random() - 0.5) * 420,
        },
        vel: {
          x: (Math.random() - 0.5) * 0.18,
          y: (Math.random() - 0.5) * 0.14,
          z: (Math.random() - 0.5) * 0.12,
        },
        radius: 40 + Math.random() * 90,
        hue,
        sat: 55 + Math.random() * 20,
        light: 42 + Math.random() * 14,
        alpha: 0.22 + Math.random() * 0.28,
        phase: Math.random() * Math.PI * 2,
        speed: 0.45 + Math.random() * 0.45,
        spin: Math.random() * Math.PI * 2,
        spinVel: (Math.random() - 0.5) * 0.006,
      });
    }

    const sparkCount = reduceRef.current ? 28 : 120;
    const sparks: Spark[] = [];
    for (let i = 0; i < sparkCount; i += 1) {
      sparks.push({
        pos: {
          x: (Math.random() - 0.5) * 900,
          y: (Math.random() - 0.5) * 620,
          z: (Math.random() - 0.5) * 480,
        },
        vel: {
          x: (Math.random() - 0.5) * 0.22,
          y: (Math.random() - 0.5) * 0.22,
          z: (Math.random() - 0.5) * 0.16,
        },
        size: 0.7 + Math.random() * 1.8,
        hue: hues[i % hues.length],
        alpha: 0.25 + Math.random() * 0.45,
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

    const drawOrb = (
      px: number,
      py: number,
      r: number,
      orb: Orb,
      fog: number,
      blur: number
    ) => {
      ctx.save();
      // layered blur for stronger bloom when needed
      if (blur > 0.5) ctx.filter = `blur(${Math.min(blur * 1.6, 36).toFixed(1)}px)`;

      const a = orb.alpha * fog;
      const core = ctx.createRadialGradient(
        px - r * 0.28,
        py - r * 0.32,
        r * 0.05,
        px,
        py,
        r
      );
      core.addColorStop(
        0,
        `hsla(${orb.hue}, ${orb.sat}%, ${orb.light + 18}%, ${a * 0.85})`
      );
      core.addColorStop(
        0.35,
        `hsla(${orb.hue + 18}, ${orb.sat}%, ${orb.light}%, ${a * 0.45})`
      );
      core.addColorStop(
        0.7,
        `hsla(${orb.hue + 40}, ${orb.sat - 10}%, ${orb.light - 8}%, ${a * 0.16})`
      );
      core.addColorStop(1, "transparent");

      ctx.beginPath();
      ctx.arc(px, py, r, 0, Math.PI * 2);
      ctx.fillStyle = core;
      ctx.fill();

      // Soft ring for 3D shell feel
      ctx.beginPath();
      ctx.ellipse(
        px,
        py,
        r * 0.92,
        r * (0.32 + Math.abs(Math.sin(orb.spin)) * 0.28),
        orb.spin,
        0,
        Math.PI * 2
      );
      ctx.strokeStyle = `hsla(${orb.hue + 10}, 80%, 78%, ${a * 0.35})`;
      ctx.lineWidth = 1.2;
      ctx.stroke();

      ctx.restore();
    };

    const drawRibbon = (
      cx: number,
      cy: number,
      t: number,
      parallaxX: number,
      parallaxY: number,
      index: number
    ) => {
      const radius = 140 + index * 48;
      const tilt = 0.28 + index * 0.1;
      const spin = t * (0.12 + index * 0.04) * (index % 2 === 0 ? 1 : -1);
      const hue = hues[index % hues.length];

      ctx.beginPath();
      for (let i = 0; i <= 72; i += 1) {
        const a = (i / 72) * Math.PI * 2 + spin;
        let p: Vec3 = {
          x: Math.cos(a) * radius,
          y: Math.sin(a) * radius * tilt,
          z: Math.sin(a * 2 + spin) * 55,
        };
        p = rotateY(p, 0.35 + index * 0.15);
        p = rotateX(p, 0.2);
        const pr = project(
          {
            x: p.x + parallaxX * 0.15,
            y: p.y + parallaxY * 0.12 - 10,
            z: p.z,
          },
          cx,
          cy,
          focal,
          camZ
        );
        if (!pr) continue;
        if (i === 0) ctx.moveTo(pr.px, pr.py);
        else ctx.lineTo(pr.px, pr.py);
      }
      ctx.closePath();
      ctx.strokeStyle = `hsla(${hue}, 70%, 62%, ${0.1 - index * 0.018})`;
      ctx.lineWidth = 1.35;
      ctx.stroke();
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
      m.x += (m.tx - m.x) * 0.04;
      m.y += (m.ty - m.y) * 0.04;
      const parallaxX = (m.x - 0.5) * 64;
      const parallaxY = (m.y - 0.5) * 40;

      ctx.clearRect(0, 0, width, height);
      const cx = width / 2 + parallaxX * 0.25;
      const cy = height / 2 + parallaxY * 0.25;
      const t = now * 0.001;
      const animate = !reduceRef.current;

      // Color washes
      const washA = ctx.createRadialGradient(
        cx + Math.sin(t * 0.2) * 90,
        cy - 50,
        10,
        cx,
        cy,
        Math.max(width, height) * 0.55
      );
      washA.addColorStop(0, "rgba(70, 120, 220, 0.1)");
      washA.addColorStop(0.4, "rgba(90, 80, 180, 0.05)");
      washA.addColorStop(1, "transparent");
      ctx.fillStyle = washA;
      ctx.fillRect(0, 0, width, height);

      const washB = ctx.createRadialGradient(
        width * 0.78 + Math.cos(t * 0.15) * 40,
        height * 0.28,
        20,
        width * 0.78,
        height * 0.28,
        Math.min(width, height) * 0.4
      );
      washB.addColorStop(0, "rgba(100, 90, 200, 0.08)");
      washB.addColorStop(1, "transparent");
      ctx.fillStyle = washB;
      ctx.fillRect(0, 0, width, height);

      const washC = ctx.createRadialGradient(
        width * 0.2,
        height * 0.75 + Math.sin(t * 0.12) * 30,
        10,
        width * 0.2,
        height * 0.75,
        Math.min(width, height) * 0.35
      );
      washC.addColorStop(0, "rgba(40, 140, 190, 0.07)");
      washC.addColorStop(1, "transparent");
      ctx.fillStyle = washC;
      ctx.fillRect(0, 0, width, height);

      for (let i = 0; i < 3; i += 1) {
        drawRibbon(cx, cy, t, parallaxX, parallaxY, i);
      }

      // Soft vignette to focus center
      ctx.save();
      const vig = ctx.createRadialGradient(cx, cy, Math.min(width, height) * 0.12, cx, cy, Math.max(width, height) * 0.9);
      vig.addColorStop(0, 'rgba(0,0,0,0)');
      vig.addColorStop(0.7, 'rgba(6,8,14,0.06)');
      vig.addColorStop(1, 'rgba(4,6,10,0.16)');
      ctx.fillStyle = vig;
      ctx.fillRect(0,0,width,height);
      ctx.restore();

      // Sparks + links
      const projected: { px: number; py: number; size: number; alpha: number; hue: number }[] =
        [];

      for (const spark of sparks) {
        if (animate) {
          spark.pos.x += spark.vel.x * dt;
          spark.pos.y += spark.vel.y * dt;
          spark.pos.z += spark.vel.z * dt;
          if (Math.abs(spark.pos.x) > 460) spark.vel.x *= -1;
          if (Math.abs(spark.pos.y) > 330) spark.vel.y *= -1;
          if (Math.abs(spark.pos.z) > 250) spark.vel.z *= -1;
          let p = spark.pos;
          p = rotateY(p, 0.0006 * dt);
          spark.pos.x = p.x;
          spark.pos.y = p.y;
          spark.pos.z = p.z;
        }

        const pr = project(
          {
            x: spark.pos.x + parallaxX * (0.15 + spark.pos.z / 900),
            y: spark.pos.y + parallaxY * (0.12 + spark.pos.z / 1000),
            z: spark.pos.z,
          },
          cx,
          cy,
          focal,
          camZ
        );
        if (!pr) continue;
        const alpha = Math.max(0.05, Math.min(0.75, (280 - spark.pos.z) / 520)) * spark.alpha;
        projected.push({
          px: pr.px,
          py: pr.py,
          size: spark.size * pr.scale,
          alpha,
          hue: spark.hue,
        });
      }

      for (let i = 0; i < projected.length; i += 1) {
        const a = projected[i];
        for (let j = i + 1; j < projected.length; j += 1) {
          const b = projected[j];
          const dx = a.px - b.px;
          const dy = a.py - b.py;
          const dist = Math.hypot(dx, dy);
          if (dist > 110) continue;
          const opacity = (1 - dist / 110) * Math.min(a.alpha, b.alpha) * 0.18;
          ctx.beginPath();
          ctx.moveTo(a.px, a.py);
          ctx.lineTo(b.px, b.py);
          ctx.strokeStyle = `hsla(${(a.hue + b.hue) / 2}, 80%, 75%, ${opacity})`;
          ctx.lineWidth = 0.7;
          ctx.stroke();
        }
      }

      for (const p of projected) {
        ctx.beginPath();
        ctx.arc(p.px, p.py, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${p.hue}, 85%, 78%, ${p.alpha})`;
        ctx.fill();
      }

      // Draw a faint noise overlay for filmic texture
      if (noiseCtx) {
        ctx.save();
        ctx.globalAlpha = 0.035;
        ctx.globalCompositeOperation = 'overlay';
        ctx.drawImage(noiseCanvas, 0, 0, width, height);
        ctx.restore();
      }

      // Orbs far → near
      const drawn = orbs
        .map((orb) => {
          if (animate) {
            orb.pos.x += orb.vel.x * dt;
            orb.pos.y += orb.vel.y * dt;
            orb.pos.z += orb.vel.z * dt;
            if (Math.abs(orb.pos.x) > 390) orb.vel.x *= -1;
            if (Math.abs(orb.pos.y) > 270) orb.vel.y *= -1;
            if (Math.abs(orb.pos.z) > 220) orb.vel.z *= -1;
            orb.spin += orb.spinVel * dt;
            // Slow orbital drift
            const ang = 0.0012 * dt;
            const cos = Math.cos(ang);
            const sin = Math.sin(ang);
            const nx = orb.pos.x * cos - orb.pos.z * sin;
            const nz = orb.pos.x * sin + orb.pos.z * cos;
            orb.pos.x = nx;
            orb.pos.z = nz;
          }

          const breath = 1 + Math.sin(t * orb.speed + orb.phase) * 0.08;
          const bob = Math.sin(t * orb.speed * 0.9 + orb.phase) * (animate ? 10 : 0);
          const depthBias = 0.14 + (orb.pos.z + 220) / 500;
          const pr = project(
            {
              x: orb.pos.x + parallaxX * depthBias,
              y: orb.pos.y + bob + parallaxY * depthBias * 0.85,
              z: orb.pos.z,
            },
            cx,
            cy,
            focal,
            camZ
          );
          if (!pr) return null;
          const fog = Math.max(0.25, Math.min(1, (240 - orb.pos.z) / 470));
          const blur = Math.max(0, Math.min(4, Math.abs(orb.pos.z) / 75));
          return {
            orb,
            px: pr.px,
            py: pr.py,
            r: orb.radius * pr.scale * breath,
            fog,
            blur,
            z: orb.pos.z,
          };
        })
        .filter(Boolean)
        .sort((a, b) => (a!.z - b!.z));

      for (const item of drawn) {
        if (!item) continue;
        drawOrb(item.px, item.py, item.r, item.orb, item.fog, item.blur);
      }

      if (animate) {
        // Create bloom by blurring current frame into offscreen and compositing back
        if (offCtx && offscreen) {
          offCtx.clearRect(0, 0, offscreen.width, offscreen.height);
          // draw the current canvas pixels to offscreen
          offCtx.drawImage(canvas, 0, 0, offscreen.width, offscreen.height);
          offCtx.filter = 'blur(18px)';
          offCtx.globalCompositeOperation = 'lighter';
          offCtx.drawImage(canvas, 0, 0, offscreen.width, offscreen.height);
          offCtx.filter = 'none';
          offCtx.globalCompositeOperation = 'source-over';
          ctx.save();
          ctx.globalAlpha = 0.28;
          ctx.globalCompositeOperation = 'lighter';
          ctx.drawImage(offscreen, 0, 0, width, height);
          ctx.restore();
        }

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
  }, []);

  return (
    <div
      ref={containerRef}
      className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
      aria-hidden
    >
      <canvas
        ref={canvasRef}
        className="v-hero-canvas pointer-events-auto block h-full w-full opacity-80"
        style={{ mixBlendMode: "screen" }}
      />
    </div>
  );
}
