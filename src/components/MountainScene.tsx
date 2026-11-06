"use client";

import { useEffect, useRef, useState } from "react";
import { GAME } from "@/config/game";

interface MountainSceneProps {
  altitude: number;
  roundsCompleted: number;
  className?: string;
}

const CAMPS = [
  { name: "Yuksom", altitude: 1780 },
  { name: "Dzongri", altitude: 4020 },
  { name: "Goecha La", altitude: 4940 },
  { name: "Summit", altitude: 8586 },
];

function getZoneLabel(altitude: number): string {
  if (altitude < 3000) return "Valley";
  if (altitude < 5000) return "Alpine";
  if (altitude < 7000) return "Glacier";
  return "Death zone";
}

function progressFromAltitude(altitude: number): number {
  const range = GAME.summitAltitudeM - GAME.baseAltitudeM;
  return Math.max(0, Math.min(1, (altitude - GAME.baseAltitudeM) / range));
}

function getSkyColor(progress: number): string {
  const r = Math.round(15 + (1 - progress) * 15);
  const g = Math.round(30 + progress * 100);
  const b = Math.round(58 + progress * 175);
  return `rgb(${r}, ${g}, ${b})`;
}

function reducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function MountainScene({
  altitude,
  roundsCompleted,
  className,
}: MountainSceneProps) {
  const progress = progressFromAltitude(altitude);
  const prefersReducedMotion = reducedMotion();
  const [animatedProgress, setAnimatedProgress] = useState(0);
  const animFrame = useRef<number | null>(null);

  useEffect(() => {
    if (prefersReducedMotion) {
      setAnimatedProgress(progress);
      return;
    }

    const start = animatedProgress;
    const end = progress;
    const startTime = performance.now();
    const duration = 600;

    const tick = (time: number) => {
      const elapsed = time - startTime;
      const t = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - t, 3);
      setAnimatedProgress(start + (end - start) * ease);
      if (t < 1) {
        animFrame.current = requestAnimationFrame(tick);
      } else {
        animFrame.current = null;
      }
    };

    cancelAnimationFrame(animFrame.current ?? 0);
    animFrame.current = requestAnimationFrame(tick);

    return () => {
      if (animFrame.current != null) {
        cancelAnimationFrame(animFrame.current);
      }
    };
  }, [progress, prefersReducedMotion, animatedProgress]);

  const zone = getZoneLabel(altitude);
  const roundedAltitude = Math.round(altitude);

  return (
    <section
      className={`relative min-h-screen w-full overflow-hidden ${className ?? ""}`}
      aria-label={`Mountain climb progress: ${roundedAltitude} meters, ${zone} zone`}
    >
      {/* Sky gradient shifting with altitude */}
      <div
        className="absolute inset-0 z-0 transition-colors duration-500"
        style={{ background: getSkyColor(animatedProgress) }}
        aria-hidden="true"
      />

      {/* Distant mountain layer */}
      <div
        className="absolute inset-0 z-10 pointer-events-none"
        style={{ transform: `translateY(${animatedProgress * -300}px)` }}
        aria-hidden="true"
      >
        <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 1200 800">
          <rect width="1200" height="800" fill="#0f172a" />
          <path
            d="M 0 600 Q 200 450 400 550 T 800 480 T 1200 520 V 800 H 0 Z"
            fill="#1e293b"
            opacity={0.6}
          />
          <path
            d="M 0 500 Q 300 350 600 450 T 1200 400 V 800 H 0 Z"
            fill="#020617"
            opacity={0.4}
          />
        </svg>
      </div>

      {/* Middle mountain layer with trail */}
      <div
        className="absolute inset-0 z-20 pointer-events-none"
        style={{ transform: `translateY(${animatedProgress * -600}px)` }}
        aria-hidden="true"
      >
        <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 1200 800">
          <defs>
            <linearGradient id="mountGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#334155" />
              <stop offset="100%" stopColor="#475569" />
            </linearGradient>
          </defs>
          <path
            d="M 0 550 Q 150 300 350 400 T 700 320 T 1050 380 V 800 H 0 Z"
            fill="url(#mountGrad)"
          />
          {/* Trail path - zigzag */}
          <path
            d="M 100 780 Q 200 700 300 750 T 500 650 T 700 700 T 900 600 T 1100 650"
            fill="none"
            stroke="#FDE68A"
            strokeWidth="3"
            strokeDasharray="8 4"
            opacity={0.7}
          />
          {/* Camps */}
          {CAMPS.map((camp) => {
            const campProgress = progressFromAltitude(camp.altitude);
            const x = 100 + campProgress * 1000;
            const y = 780 - campProgress * 550;
            const reached = altitude >= camp.altitude;
            return (
              <g key={camp.name}>
                <circle
                  cx={x}
                  cy={y}
                  r={reached ? 6 : 4}
                  fill={reached ? "#FDE68A" : "#94a3b8"}
                />
                <text
                  x={x}
                  y={y - 10}
                  fontSize={12}
                  fill="#e2e8f0"
                  textAnchor="middle"
                  fontWeight={reached ? "bold" : "normal"}
                >
                  {camp.name}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Climber */}
      <div
        className="absolute z-30 pointer-events-none"
        style={{
          left: "50%",
          top: `${Math.max(0, 95 - animatedProgress * 85)}%`,
          transform: "translate(-50%, -50%)",
          transition: prefersReducedMotion
            ? "none"
            : "top 0.6s cubic-bezier(0.4, 0, 0.2, 1)",
        }}
        aria-label={`Climber at ${roundedAltitude} meters`}
      >
        <svg
          className="w-10 h-10"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="4" r="2" />
          <path d="M12 6v4" />
          <path d="M10 10h4" />
          <path d="M12 14l-2 4" />
          <path d="M12 14l2 4" />
          <path d="M10 10l-2 2" />
          <path d="M14 10l2 2" />
        </svg>
      </div>

      {/* Altitude zone indicator */}
      <div className="absolute top-4 left-4 z-40 bg-white/90 backdrop-blur px-3 py-1 rounded-full text-xs font-bold text-shikhar-dusk border border-shikhar-dawn shadow-md" aria-label={`Zone: ${zone}`}>
        {zone}
      </div>

      {/* Altitude display */}
      <div className="absolute top-4 right-4 z-40 bg-white/90 backdrop-blur px-3 py-1 rounded text-sm font-mono text-shikhar-dusk border border-shikhar-dawn shadow-md" aria-label={`Altitude: ${roundedAltitude} meters`}>
        {roundedAltitude} m
      </div>

      {/* Prayer flags */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-40 flex gap-1" aria-label={`Rounds completed: ${roundsCompleted} of ${GAME.roundsPerClimb}`}>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
          <div
            key={i}
            className={`w-4 h-3 rounded-t ${i <= roundsCompleted ? "bg-shikhar-dawn border-b-2 border-shikhar-dusk" : "bg-slate-200 opacity-30"} transition-all duration-300`}
            aria-label={`Round ${i} ${i <= roundsCompleted ? "completed" : "pending"}`}
          />
        ))}
      </div>
    </section>
  );
}
