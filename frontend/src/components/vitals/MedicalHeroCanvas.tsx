"use client";

import { useEffect, useRef } from "react";

type InstrumentKind =
  | "stethoscope"
  | "microscope"
  | "pill"
  | "syringe"
  | "heart"
  | "thermometer"
  | "capsule"
  | "cross"
  | "dna";

interface Vec3 {
  x: number;
  y: number;
  z: number;
}

interface Instrument {
  kind: InstrumentKind;
  pos: Vec3;
  vel: Vec3;
  rx: number;
  ry: number;
  rz: number;
  vrx: number;
  vry: number;
  vrz: number;
  scale: number;
  tint: number;
  bobPhase: number;
  bobSpeed: number;
  trail: { x: number; y: number; a: number }[];
}

function project(p: Vec3, cx: number, cy: number, focal: number, camZ: number) {
  const z = p.z + camZ;
  if (z <= 50) return null;
  const s = focal / z;
  return { px: cx + p.x * s, py: cy + p.y * s, scale: s, z: p.z };
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

const PALETTE = [
  { fill: "rgba(45, 212, 167, 0.55)", stroke: "rgba(167, 243, 218, 0.95)", glow: "rgba(45, 212, 167, 0.35)" },
  { fill: "rgba(45, 212, 191, 0.5)", stroke: "rgba(153, 246, 228, 0.9)", glow: "rgba(45, 212, 191, 0.3)" },
  { fill: "rgba(251, 146, 60, 0.5)", stroke: "rgba(254, 215, 170, 0.9)", glow: "rgba(251, 146, 60, 0.28)" },
  { fill: "rgba(245, 192, 98, 0.45)", stroke: "rgba(253, 230, 138, 0.88)", glow: "rgba(245, 192, 98, 0.25)" },
  { fill: "rgba(250, 204, 21, 0.42)", stroke: "rgba(254, 240, 138, 0.85)", glow: "rgba(250, 204, 21, 0.22)" },
  { fill: "rgba(31, 191, 214, 0.45)", stroke: "rgba(165, 243, 252, 0.9)", glow: "rgba(31, 191, 214, 0.28)" },
];

/**
 * Cinematic 3D medical field — orbiting instruments, DNA helix, trails, parallax.
 */
export default function MedicalHeroCanvas({ intensity = 1 }: { intensity?: number }) {
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
    const focal = 440;
    const camZ = 540;

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

    const kinds: InstrumentKind[] = [
      "stethoscope",
      "microscope",
      "pill",
      "syringe",
      "heart",
      "thermometer",
      "capsule",
      "cross",
      "dna",
      "pill",
      "stethoscope",
      "microscope",
      "capsule",
      "syringe",
    ];

    const count = reduceRef.current ? 7 : Math.round(14 * intensity);
    const instruments: Instrument[] = [];

    for (let i = 0; i < count; i += 1) {
      const angle = (i / count) * Math.PI * 2;
      const orbit = 180 + (i % 4) * 70;
      instruments.push({
        kind: kinds[i % kinds.length],
        pos: {
          x: Math.cos(angle) * orbit + (Math.random() - 0.5) * 80,
          y: (Math.random() - 0.5) * 380,
          z: Math.sin(angle) * orbit * 0.7 + (Math.random() - 0.5) * 100,
        },
        vel: {
          x: (Math.random() - 0.5) * 0.28,
          y: (Math.random() - 0.5) * 0.2,
          z: (Math.random() - 0.5) * 0.18,
        },
        rx: Math.random() * Math.PI * 2,
        ry: Math.random() * Math.PI * 2,
        rz: Math.random() * Math.PI * 2,
        vrx: (Math.random() - 0.5) * 0.01,
        vry: (Math.random() - 0.5) * 0.012,
        vrz: (Math.random() - 0.5) * 0.008,
        scale: 0.85 + Math.random() * 0.7,
        tint: i % PALETTE.length,
        bobPhase: Math.random() * Math.PI * 2,
        bobSpeed: 0.65 + Math.random() * 0.7,
        trail: [],
      });
    }

    const dust: Array<Vec3 & { vx: number; vy: number; vz: number; r: number; hue: number }> = [];
    const dustCount = reduceRef.current ? 24 : Math.round(70 * intensity);
    for (let i = 0; i < dustCount; i += 1) {
      dust.push({
        x: (Math.random() - 0.5) * 960,
        y: (Math.random() - 0.5) * 680,
        z: (Math.random() - 0.5) * 520,
        vx: (Math.random() - 0.5) * 0.25,
        vy: (Math.random() - 0.5) * 0.25,
        vz: (Math.random() - 0.5) * 0.18,
        r: 0.7 + Math.random() * 2.2,
        hue: Math.random(),
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

    const transformLocal = (local: Vec3, inst: Instrument, bob: number): Vec3 => {
      let p = { x: local.x * inst.scale, y: local.y * inst.scale, z: local.z * inst.scale };
      p = rotateX(p, inst.rx);
      p = rotateY(p, inst.ry);
      p = rotateZ(p, inst.rz);
      return {
        x: p.x + inst.pos.x,
        y: p.y + inst.pos.y + bob,
        z: p.z + inst.pos.z,
      };
    };

    const worldProject = (
      world: Vec3,
      cx: number,
      cy: number,
      parallaxX: number,
      parallaxY: number
    ) => {
      const depthBias = 0.14 + (world.z + 200) / 480;
      return project(
        {
          x: world.x + parallaxX * depthBias,
          y: world.y + parallaxY * depthBias * 0.8,
          z: world.z,
        },
        cx,
        cy,
        focal,
        camZ
      );
    };

    const strokePath = (
      points: Vec3[],
      inst: Instrument,
      bob: number,
      cx: number,
      cy: number,
      px: number,
      py: number,
      color: string,
      lineWidth: number
    ) => {
      const projected: { px: number; py: number }[] = [];
      for (const pt of points) {
        const pr = worldProject(transformLocal(pt, inst, bob), cx, cy, px, py);
        if (!pr) return;
        projected.push({ px: pr.px, py: pr.py });
      }
      if (projected.length < 2) return;
      ctx.beginPath();
      ctx.moveTo(projected[0].px, projected[0].py);
      for (let i = 1; i < projected.length; i += 1) {
        ctx.lineTo(projected[i].px, projected[i].py);
      }
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.stroke();
    };

    const fillPath = (
      points: Vec3[],
      inst: Instrument,
      bob: number,
      cx: number,
      cy: number,
      px: number,
      py: number,
      fill: string,
      stroke: string,
      lineWidth = 1.3
    ) => {
      const projected: { px: number; py: number }[] = [];
      for (const pt of points) {
        const pr = worldProject(transformLocal(pt, inst, bob), cx, cy, px, py);
        if (!pr) return;
        projected.push({ px: pr.px, py: pr.py });
      }
      if (projected.length < 3) return;
      ctx.beginPath();
      ctx.moveTo(projected[0].px, projected[0].py);
      for (let i = 1; i < projected.length; i += 1) {
        ctx.lineTo(projected[i].px, projected[i].py);
      }
      ctx.closePath();
      ctx.fillStyle = fill;
      ctx.fill();
      ctx.strokeStyle = stroke;
      ctx.lineWidth = lineWidth;
      ctx.stroke();
    };

    const alpha = (rgba: string, a: number) =>
      rgba.replace(/[\d.]+\)$/, `${Math.max(0, Math.min(1, a))})`);

    const drawStethoscope = (
      inst: Instrument,
      bob: number,
      cx: number,
      cy: number,
      px: number,
      py: number,
      fog: number
    ) => {
      const pal = PALETTE[inst.tint];
      strokePath(
        [
          { x: -30, y: -38, z: 0 },
          { x: -20, y: -12, z: 5 },
          { x: 0, y: 10, z: 0 },
          { x: 20, y: -12, z: -5 },
          { x: 30, y: -38, z: 0 },
        ],
        inst,
        bob,
        cx,
        cy,
        px,
        py,
        alpha(pal.stroke, 0.85 * fog),
        2.6
      );
      strokePath(
        [
          { x: 0, y: 10, z: 0 },
          { x: 5, y: 30, z: 6 },
          { x: 14, y: 46, z: 2 },
        ],
        inst,
        bob,
        cx,
        cy,
        px,
        py,
        alpha(pal.stroke, 0.8 * fog),
        2.4
      );
      fillPath(
        [
          { x: 5, y: 50, z: -6 },
          { x: 22, y: 50, z: -2 },
          { x: 24, y: 62, z: 3 },
          { x: 14, y: 68, z: 5 },
          { x: 3, y: 60, z: 0 },
        ],
        inst,
        bob,
        cx,
        cy,
        px,
        py,
        alpha(pal.fill, 0.5 * fog),
        alpha(pal.stroke, 0.9 * fog),
        1.5
      );
    };

    const drawMicroscope = (
      inst: Instrument,
      bob: number,
      cx: number,
      cy: number,
      px: number,
      py: number,
      fog: number
    ) => {
      const pal = PALETTE[inst.tint];
      fillPath(
        [
          { x: -30, y: 42, z: -12 },
          { x: 30, y: 42, z: -12 },
          { x: 24, y: 52, z: 10 },
          { x: -24, y: 52, z: 10 },
        ],
        inst,
        bob,
        cx,
        cy,
        px,
        py,
        alpha(pal.fill, 0.4 * fog),
        alpha(pal.stroke, 0.85 * fog)
      );
      strokePath(
        [
          { x: -10, y: 42, z: 0 },
          { x: -10, y: -12, z: 0 },
          { x: 8, y: -32, z: 5 },
          { x: 20, y: -24, z: 7 },
        ],
        inst,
        bob,
        cx,
        cy,
        px,
        py,
        alpha(pal.stroke, 0.9 * fog),
        3.2
      );
      fillPath(
        [
          { x: 14, y: -38, z: 2 },
          { x: 28, y: -32, z: 7 },
          { x: 26, y: -18, z: 9 },
          { x: 12, y: -24, z: 4 },
        ],
        inst,
        bob,
        cx,
        cy,
        px,
        py,
        alpha(pal.fill, 0.45 * fog),
        alpha(pal.stroke, 0.9 * fog)
      );
      fillPath(
        [
          { x: -6, y: 10, z: -14 },
          { x: 26, y: 10, z: -8 },
          { x: 24, y: 16, z: 8 },
          { x: -8, y: 16, z: 2 },
        ],
        inst,
        bob,
        cx,
        cy,
        px,
        py,
        alpha(pal.fill, 0.35 * fog),
        alpha(pal.stroke, 0.8 * fog)
      );
    };

    const drawPill = (
      inst: Instrument,
      bob: number,
      cx: number,
      cy: number,
      px: number,
      py: number,
      fog: number,
      capsule: boolean
    ) => {
      const pal = PALETTE[inst.tint];
      const palB = PALETTE[(inst.tint + 2) % PALETTE.length];
      if (capsule) {
        fillPath(
          [
            { x: -24, y: -12, z: 0 },
            { x: 0, y: -14, z: 5 },
            { x: 0, y: 14, z: 5 },
            { x: -24, y: 12, z: 0 },
            { x: -28, y: 0, z: -3 },
          ],
          inst,
          bob,
          cx,
          cy,
          px,
          py,
          alpha(pal.fill, 0.5 * fog),
          alpha(pal.stroke, 0.9 * fog)
        );
        fillPath(
          [
            { x: 0, y: -14, z: 5 },
            { x: 24, y: -12, z: 0 },
            { x: 28, y: 0, z: -3 },
            { x: 24, y: 12, z: 0 },
            { x: 0, y: 14, z: 5 },
          ],
          inst,
          bob,
          cx,
          cy,
          px,
          py,
          alpha(palB.fill, 0.48 * fog),
          alpha(palB.stroke, 0.9 * fog)
        );
      } else {
        const ring: Vec3[] = [];
        for (let i = 0; i <= 18; i += 1) {
          const a = (i / 18) * Math.PI * 2;
          ring.push({
            x: Math.cos(a) * 18,
            y: Math.sin(a) * 11,
            z: Math.sin(a * 2) * 4,
          });
        }
        fillPath(
          ring,
          inst,
          bob,
          cx,
          cy,
          px,
          py,
          alpha(pal.fill, 0.5 * fog),
          alpha(pal.stroke, 0.9 * fog)
        );
        strokePath(
          [
            { x: -15, y: 0, z: 3 },
            { x: 15, y: 0, z: 3 },
          ],
          inst,
          bob,
          cx,
          cy,
          px,
          py,
          alpha(pal.stroke, 0.85 * fog),
          1.4
        );
      }
    };

    const drawSyringe = (
      inst: Instrument,
      bob: number,
      cx: number,
      cy: number,
      px: number,
      py: number,
      fog: number
    ) => {
      const pal = PALETTE[inst.tint];
      fillPath(
        [
          { x: -9, y: -30, z: 0 },
          { x: 9, y: -30, z: 0 },
          { x: 9, y: 24, z: 0 },
          { x: -9, y: 24, z: 0 },
        ],
        inst,
        bob,
        cx,
        cy,
        px,
        py,
        alpha(pal.fill, 0.4 * fog),
        alpha(pal.stroke, 0.85 * fog)
      );
      strokePath(
        [
          { x: 0, y: -30, z: 0 },
          { x: 0, y: -46, z: 0 },
        ],
        inst,
        bob,
        cx,
        cy,
        px,
        py,
        alpha(pal.stroke, 0.9 * fog),
        2.2
      );
      fillPath(
        [
          { x: -12, y: -50, z: -2 },
          { x: 12, y: -50, z: -2 },
          { x: 12, y: -44, z: 2 },
          { x: -12, y: -44, z: 2 },
        ],
        inst,
        bob,
        cx,
        cy,
        px,
        py,
        alpha(pal.fill, 0.45 * fog),
        alpha(pal.stroke, 0.9 * fog)
      );
      strokePath(
        [
          { x: 0, y: 24, z: 0 },
          { x: 0, y: 52, z: 0 },
        ],
        inst,
        bob,
        cx,
        cy,
        px,
        py,
        alpha(pal.stroke, 0.9 * fog),
        1.5
      );
    };

    const drawHeart = (
      inst: Instrument,
      bob: number,
      cx: number,
      cy: number,
      px: number,
      py: number,
      fog: number
    ) => {
      const pal = PALETTE[3];
      const heart: Vec3[] = [];
      for (let i = 0; i <= 28; i += 1) {
        const t = (i / 28) * Math.PI * 2;
        const hx = 18 * Math.sin(t) ** 3;
        const hy =
          -(
            13 * Math.cos(t) -
            5 * Math.cos(2 * t) -
            2 * Math.cos(3 * t) -
            Math.cos(4 * t)
          ) *
            1.05 +
          4;
        heart.push({ x: hx, y: hy, z: Math.sin(t * 2) * 5 });
      }
      fillPath(
        heart,
        inst,
        bob,
        cx,
        cy,
        px,
        py,
        alpha(pal.fill, 0.5 * fog),
        alpha(pal.stroke, 0.95 * fog),
        1.6
      );
    };

    const drawThermometer = (
      inst: Instrument,
      bob: number,
      cx: number,
      cy: number,
      px: number,
      py: number,
      fog: number
    ) => {
      const pal = PALETTE[inst.tint];
      fillPath(
        [
          { x: -6, y: -38, z: 0 },
          { x: 6, y: -38, z: 0 },
          { x: 6, y: 24, z: 0 },
          { x: -6, y: 24, z: 0 },
        ],
        inst,
        bob,
        cx,
        cy,
        px,
        py,
        alpha(pal.fill, 0.4 * fog),
        alpha(pal.stroke, 0.85 * fog)
      );
      const bulb: Vec3[] = [];
      for (let i = 0; i <= 16; i += 1) {
        const a = (i / 16) * Math.PI * 2;
        bulb.push({
          x: Math.cos(a) * 11,
          y: 32 + Math.sin(a) * 11,
          z: Math.sin(a) * 4,
        });
      }
      fillPath(
        bulb,
        inst,
        bob,
        cx,
        cy,
        px,
        py,
        alpha(PALETTE[2].fill, 0.5 * fog),
        alpha(PALETTE[2].stroke, 0.9 * fog)
      );
    };

    const drawCross = (
      inst: Instrument,
      bob: number,
      cx: number,
      cy: number,
      px: number,
      py: number,
      fog: number
    ) => {
      const pal = PALETTE[inst.tint];
      fillPath(
        [
          { x: -8, y: -30, z: 0 },
          { x: 8, y: -30, z: 0 },
          { x: 8, y: 30, z: 0 },
          { x: -8, y: 30, z: 0 },
        ],
        inst,
        bob,
        cx,
        cy,
        px,
        py,
        alpha(pal.fill, 0.42 * fog),
        alpha(pal.stroke, 0.85 * fog)
      );
      fillPath(
        [
          { x: -26, y: -8, z: 0 },
          { x: 26, y: -8, z: 0 },
          { x: 26, y: 8, z: 0 },
          { x: -26, y: 8, z: 0 },
        ],
        inst,
        bob,
        cx,
        cy,
        px,
        py,
        alpha(pal.fill, 0.42 * fog),
        alpha(pal.stroke, 0.85 * fog)
      );
    };

    const drawDna = (
      inst: Instrument,
      bob: number,
      cx: number,
      cy: number,
      px: number,
      py: number,
      fog: number
    ) => {
      const palA = PALETTE[inst.tint];
      const palB = PALETTE[(inst.tint + 1) % PALETTE.length];
      const steps = 18;
      const strandA: Vec3[] = [];
      const strandB: Vec3[] = [];
      for (let i = 0; i <= steps; i += 1) {
        const t = (i / steps) * Math.PI * 4;
        const y = -40 + (i / steps) * 80;
        strandA.push({ x: Math.cos(t) * 14, y, z: Math.sin(t) * 14 });
        strandB.push({
          x: Math.cos(t + Math.PI) * 14,
          y,
          z: Math.sin(t + Math.PI) * 14,
        });
      }
      strokePath(strandA, inst, bob, cx, cy, px, py, alpha(palA.stroke, 0.9 * fog), 2.2);
      strokePath(strandB, inst, bob, cx, cy, px, py, alpha(palB.stroke, 0.9 * fog), 2.2);
      for (let i = 0; i < steps; i += 2) {
        strokePath(
          [strandA[i], strandB[i]],
          inst,
          bob,
          cx,
          cy,
          px,
          py,
          alpha(palA.fill, 0.7 * fog),
          1.2
        );
      }
    };

    const drawInstrument = (
      inst: Instrument,
      bob: number,
      cx: number,
      cy: number,
      parallaxX: number,
      parallaxY: number,
      fog: number
    ) => {
      switch (inst.kind) {
        case "stethoscope":
          drawStethoscope(inst, bob, cx, cy, parallaxX, parallaxY, fog);
          break;
        case "microscope":
          drawMicroscope(inst, bob, cx, cy, parallaxX, parallaxY, fog);
          break;
        case "pill":
          drawPill(inst, bob, cx, cy, parallaxX, parallaxY, fog, false);
          break;
        case "capsule":
          drawPill(inst, bob, cx, cy, parallaxX, parallaxY, fog, true);
          break;
        case "syringe":
          drawSyringe(inst, bob, cx, cy, parallaxX, parallaxY, fog);
          break;
        case "heart":
          drawHeart(inst, bob, cx, cy, parallaxX, parallaxY, fog);
          break;
        case "thermometer":
          drawThermometer(inst, bob, cx, cy, parallaxX, parallaxY, fog);
          break;
        case "cross":
          drawCross(inst, bob, cx, cy, parallaxX, parallaxY, fog);
          break;
        case "dna":
          drawDna(inst, bob, cx, cy, parallaxX, parallaxY, fog);
          break;
      }
    };

    const drawOrbitRings = (
      cx: number,
      cy: number,
      t: number,
      parallaxX: number,
      parallaxY: number
    ) => {
      for (let r = 0; r < 3; r += 1) {
        const radius = 120 + r * 55;
        const tilt = 0.35 + r * 0.12;
        const spin = t * (0.18 + r * 0.05) * (r % 2 === 0 ? 1 : -1);
        ctx.beginPath();
        for (let i = 0; i <= 64; i += 1) {
          const a = (i / 64) * Math.PI * 2 + spin;
          const x = Math.cos(a) * radius;
          const y = Math.sin(a) * radius * tilt;
          const z = Math.sin(a + spin) * 40;
          const pr = worldProject(
            { x: x * 0.9, y: y * 0.9 - 20, z },
            cx,
            cy,
            parallaxX,
            parallaxY
          );
          if (!pr) continue;
          if (i === 0) ctx.moveTo(pr.px, pr.py);
          else ctx.lineTo(pr.px, pr.py);
        }
        ctx.closePath();
        const colors = [
          "rgba(45, 212, 167, 0.18)",
          "rgba(45, 212, 191, 0.14)",
          "rgba(251, 146, 60, 0.12)",
        ];
        ctx.strokeStyle = colors[r];
        ctx.lineWidth = 1.4;
        ctx.stroke();
      }
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
      const parallaxX = (m.x - 0.5) * 70;
      const parallaxY = (m.y - 0.5) * 42;

      ctx.clearRect(0, 0, width, height);
      const cx = width / 2 + parallaxX * 0.28;
      const cy = height / 2 + parallaxY * 0.28;
      const t = now * 0.001;
      const animate = !reduceRef.current;

      // Colorful volumetric washes
      const pools = [
        {
          x: cx + Math.sin(t * 0.2) * 120,
          y: cy - 80,
          c0: "rgba(31, 191, 214, 0.16)",
          c1: "rgba(45, 212, 191, 0.06)",
        },
        {
          x: width * 0.78 + Math.cos(t * 0.15) * 50,
          y: height * 0.3,
          c0: "rgba(251, 146, 60, 0.12)",
          c1: "transparent",
        },
        {
          x: width * 0.2,
          y: height * 0.7 + Math.sin(t * 0.12) * 40,
          c0: "rgba(245, 192, 98, 0.1)",
          c1: "transparent",
        },
      ];
      for (const pool of pools) {
        const g = ctx.createRadialGradient(pool.x, pool.y, 8, pool.x, pool.y, Math.max(width, height) * 0.42);
        g.addColorStop(0, pool.c0);
        g.addColorStop(1, pool.c1);
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, width, height);
      }

      drawOrbitRings(cx, cy, t, parallaxX, parallaxY);

      for (const d of dust) {
        if (animate) {
          d.x += d.vx * dt;
          d.y += d.vy * dt;
          d.z += d.vz * dt;
          if (Math.abs(d.x) > 480) d.vx *= -1;
          if (Math.abs(d.y) > 360) d.vy *= -1;
          if (Math.abs(d.z) > 270) d.vz *= -1;
        }
        const pr = project(
          { x: d.x + parallaxX * 0.12, y: d.y + parallaxY * 0.1, z: d.z },
          cx,
          cy,
          focal,
          camZ
        );
        if (!pr) continue;
        const a = Math.max(0.06, Math.min(0.65, (280 - d.z) / 540));
        const pal = PALETTE[Math.floor(d.hue * PALETTE.length)];
        ctx.beginPath();
        ctx.arc(pr.px, pr.py, d.r * pr.scale, 0, Math.PI * 2);
        ctx.fillStyle = alpha(pal.glow, a);
        ctx.fill();
      }

      const drawn = instruments
        .map((inst) => {
          if (animate) {
            // Slow orbital drift around origin
            const ang = 0.0018 * dt * (inst.tint % 2 === 0 ? 1 : -1);
            const cos = Math.cos(ang);
            const sin = Math.sin(ang);
            const nx = inst.pos.x * cos - inst.pos.z * sin;
            const nz = inst.pos.x * sin + inst.pos.z * cos;
            inst.pos.x = nx + inst.vel.x * dt;
            inst.pos.z = nz + inst.vel.z * dt;
            inst.pos.y += inst.vel.y * dt;
            if (Math.abs(inst.pos.y) > 280) inst.vel.y *= -1;
            if (Math.hypot(inst.pos.x, inst.pos.z) > 420) {
              inst.vel.x *= -1;
              inst.vel.z *= -1;
            }
            inst.rx += inst.vrx * dt;
            inst.ry += inst.vry * dt;
            inst.rz += inst.vrz * dt;
          }
          const bob = Math.sin(t * inst.bobSpeed + inst.bobPhase) * (animate ? 12 : 0);
          const fog = Math.max(0.28, Math.min(1, (240 - inst.pos.z) / 460));

          const pr = worldProject(
            { x: inst.pos.x, y: inst.pos.y + bob, z: inst.pos.z },
            cx,
            cy,
            parallaxX,
            parallaxY
          );
          if (pr && animate) {
            inst.trail.unshift({ x: pr.px, y: pr.py, a: 0.35 * fog });
            if (inst.trail.length > 10) inst.trail.pop();
          }

          return { inst, bob, fog, z: inst.pos.z, pr };
        })
        .sort((a, b) => a.z - b.z);

      for (const item of drawn) {
        // Motion trails
        if (item.inst.trail.length > 1) {
          ctx.beginPath();
          ctx.moveTo(item.inst.trail[0].x, item.inst.trail[0].y);
          for (let i = 1; i < item.inst.trail.length; i += 1) {
            ctx.lineTo(item.inst.trail[i].x, item.inst.trail[i].y);
          }
          const pal = PALETTE[item.inst.tint];
          ctx.strokeStyle = alpha(pal.glow, 0.35 * item.fog);
          ctx.lineWidth = 2;
          ctx.lineCap = "round";
          ctx.stroke();
        }

        ctx.save();
        const blur = Math.max(0, Math.min(3.2, Math.abs(item.z) / 95));
        if (blur > 0.55) ctx.filter = `blur(${blur.toFixed(1)}px)`;
        drawInstrument(item.inst, item.bob, cx, cy, parallaxX, parallaxY, item.fog);
        ctx.restore();
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
  }, [intensity]);

  return (
    <div
      ref={containerRef}
      className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
      aria-hidden
    >
      <canvas
        ref={canvasRef}
        className="pointer-events-auto block h-full w-full opacity-95"
        style={{ mixBlendMode: "screen" }}
      />
    </div>
  );
}
