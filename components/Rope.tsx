"use client";

import { useEffect, useRef } from "react";

export type RopeMode = "slack" | "taut" | "failed";

interface RopeProps {
  mode: RopeMode;
  progress?: number | null;
  ambient?: boolean;
}

const VIEW_W = 1000;
const VIEW_H = 250;
const X0 = 72;
const X1 = 928;
const ROPE_Y = 104;
const SLACK_SAG = 88;
const FAIL_SAG = 118;
const DRIFT_AMP = 7;
const DRIFT_HZ = 0.3;
const STIFFNESS = 130;
const DAMPING = 12;

function ropePath(sag: number): string {
  return `M ${X0} ${ROPE_Y} Q ${VIEW_W / 2} ${ROPE_Y + sag} ${X1} ${ROPE_Y}`;
}

function pointAt(t: number, sag: number): { x: number; y: number } {
  const mt = 1 - t;
  const cx = VIEW_W / 2;
  const cy = ROPE_Y + sag;
  return {
    x: mt * mt * X0 + 2 * mt * t * cx + t * t * X1,
    y: mt * mt * ROPE_Y + 2 * mt * t * cy + t * t * ROPE_Y,
  };
}

function sagFor(mode: RopeMode): number {
  if (mode === "taut") return 0;
  if (mode === "failed") return FAIL_SAG;
  return SLACK_SAG;
}

export function Rope({ mode, progress = null, ambient = false }: RopeProps) {
  const pathRef = useRef<SVGPathElement>(null);
  const beadRef = useRef<SVGCircleElement>(null);
  const springRef = useRef({ value: sagFor(mode), velocity: 0 });
  const initialD = useRef(ropePath(sagFor(mode))).current;

  useEffect(() => {
    const path = pathRef.current;
    const bead = beadRef.current;
    if (!path) return;

    const apply = (sag: number) => {
      path.setAttribute("d", ropePath(sag));
      if (bead) {
        if (progress !== null && Number.isFinite(progress)) {
          const t = Math.min(1, Math.max(0, progress));
          const pt = pointAt(t, sag);
          bead.setAttribute("cx", String(pt.x));
          bead.setAttribute("cy", String(pt.y));
          bead.setAttribute("opacity", "1");
        } else {
          bead.setAttribute("opacity", "0");
        }
      }
    };

    const targetBase = sagFor(mode);
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (reduce) {
      springRef.current = { value: targetBase, velocity: 0 };
      apply(targetBase);
      return;
    }

    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const drift =
        mode === "slack"
          ? Math.sin((now / 1000) * Math.PI * 2 * DRIFT_HZ) * DRIFT_AMP
          : 0;
      const target = targetBase + drift;
      const spring = springRef.current;
      const accel =
        STIFFNESS * (target - spring.value) - DAMPING * spring.velocity;
      spring.velocity += accel * dt;
      spring.value += spring.velocity * dt;
      apply(spring.value);
      const settled =
        Math.abs(spring.velocity) < 0.02 &&
        Math.abs(target - spring.value) < 0.05;
      if (mode === "slack" || !settled) {
        raf = requestAnimationFrame(tick);
      } else {
        springRef.current = { value: targetBase, velocity: 0 };
        apply(targetBase);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [mode, progress]);

  const failY = ROPE_Y + FAIL_SAG / 2;

  return (
    <svg
      className={ambient ? "rope rope--ambient" : "rope"}
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      role="img"
      aria-hidden="true"
      focusable="false"
      preserveAspectRatio="xMidYMid meet"
    >
      {!ambient && (
        <g className="rope__bollards">
          <g>
            <rect x={X0 - 26} y={ROPE_Y - 22} width={40} height={86} rx={8} />
            <rect x={X0 - 34} y={ROPE_Y - 30} width={56} height={16} rx={7} />
          </g>
          <g>
            <rect x={X1 - 14} y={ROPE_Y - 22} width={40} height={86} rx={8} />
            <rect x={X1 - 22} y={ROPE_Y - 30} width={56} height={16} rx={7} />
          </g>
        </g>
      )}
      <path
        ref={pathRef}
        className={`rope__line rope__line--${mode}`}
        d={initialD}
        fill="none"
      />
      {mode === "failed" && (
        <g className="rope__hatch">
          <line x1={460} y1={failY - 24} x2={492} y2={failY + 24} />
          <line x1={484} y1={failY - 24} x2={516} y2={failY + 24} />
          <line x1={508} y1={failY - 24} x2={540} y2={failY + 24} />
        </g>
      )}
      <circle ref={beadRef} className="rope__bead" r={9} opacity={0} />
    </svg>
  );
}
