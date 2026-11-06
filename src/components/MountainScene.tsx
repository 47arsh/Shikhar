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
  // Pale dawn to ice-blue gradient
  const r = Math.round(240 + (1 - progress) * 15);  // Warm whites to cool blues
  const g = Math.round(248 + progress * 8);
  const b = Math.round(255 - progress * 60);         // Ice blues
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
  const mountainLayerOpacity = Math.max(0.3, 1 - animatedProgress * 1.5);

  return (
    <section
      className={`relative min-h-screen w-full overflow-hidden ${className ?? ""}`}
      aria-label={`Mountain climb progress: ${roundedAltitude} meters, ${zone} zone`}
    >
      {/* Pale dawn to ice-blue sky gradient */}
      <div
        className="absolute inset-0 z-0 transition-colors duration-500"
        style={{ background: getSkyColor(animatedProgress) }}
        aria-hidden="true"
      />

      {/* Bright snowy Himalayan peaks with atmospheric depth */}
      <div
        className="absolute inset-0 z-10 pointer-events-none"
        style={{ transform: `translateY(${animatedProgress * -250}px)` }}
        aria-hidden="true"
      >
        <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 1200 800">
          {/* Far background - bright snowy peaks with soft blue shadows */}
          <path
            d="M 0 700 Q 150 580 300 650 T 600 580 T 900 620 T 1200 600 V 800 H 0 Z"
            fill="#ffffff"
            opacity={mountainLayerOpacity * 0.15}
          />
          <path
            d="M 0 650 Q 200 520 400 590 T 700 520 T 1000 570 V 800 H 0 Z"
            fill="#e6f3ff"
            opacity={mountainLayerOpacity * 0.2}
          />
          <path
            d="M 0 600 Q 300 450 600 520 T 1200 470 V 800 H 0 Z"
            fill="#cce7ff"
            opacity={mountainLayerOpacity * 0.25}
          />

          {/* Middle peaks - bright with defined snow caps */}
          <path
            d="M 0 550 Q 100 420 300 500 T 600 420 T 900 480 T 1200 450 V 800 H 0 Z"
            fill="#ffffff"
            opacity={mountainLayerOpacity * 0.4}
          />
          <path
            d="M 0 500 Q 150 370 350 440 T 650 370 T 950 430 V 800 H 0 Z"
            fill="#f0f8ff"
            opacity={mountainLayerOpacity * 0.5}
          />

          {/* Close foreground peaks - maximum contrast, bright snow */}
          <path
            d="M 0 450 Q 80 320 200 390 T 400 320 T 700 380 T 1000 340 V 800 H 0 Z"
            fill="#ffffff"
            opacity={mountainLayerOpacity}
          />
          <path
            d="M 0 400 Q 120 270 250 330 T 500 270 T 850 330 V 800 H 0 Z"
            fill="#e8f4ff"
            opacity={mountainLayerOpacity * 1.1}
          />

          {/* Snow caps with subtle blue shadows */}
          <ellipse cx="300" cy="180" rx="80" ry="25" fill="#f0f8ff" opacity="0.8" />
          <ellipse cx="600" cy="160" rx="100" ry="30" fill="#ffffff" opacity="0.9" />
          <ellipse cx="900" cy="170" rx="90" ry="28" fill="#f0f8ff" opacity="0.85" />

          {/* Atmospheric depth gradient */}
          <defs>
            <linearGradient id="atmosphericGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="100%" stopColor="#e6f3ff" />
            </linearGradient>
          </defs>
          <path
            d="M 0 420 Q 200 280 400 350 T 800 280 T 1200 330 V 800 H 0 Z"
            fill="url(#atmosphericGradient)"
            opacity={mountainLayerOpacity * 0.3}
          />
        </svg>
      </div>

      {/* Bright snow trail with visible depth */}
      <div
        className="absolute inset-0 z-20 pointer-events-none"
        style={{ transform: `translateY(${animatedProgress * -400}px)` }}
        aria-hidden="true"
      >
        <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 1200 800">
          {/* Main trail - crisp white with subtle shadow */}
          <path
            d="M 100 780 Q 150 700 250 730 T 400 650 T 550 700 T 700 580 T 850 630 T 1000 580 T 1100 650"
            fill="none"
            stroke="#ffffff"
            strokeWidth="3"
            strokeDasharray="8 6"
            opacity={0.7}
          />

          {/* Trail shadow for depth */}
          <path
            d="M 100 780 Q 150 700 250 730 T 400 650 T 550 700 T 700 580 T 850 630 T 1000 580 T 1100 650"
            fill="none"
            stroke="#e6f0ff"
            strokeWidth="1"
            opacity={0.4}
          />

          {/* Sunlit trail sections */}
          <path
            d="M 100 780 L 250 730 L 400 650 L 550 700 L 700 580 L 850 630 L 1000 580 L 1100 650"
            fill="none"
            stroke="#fff8dc"
            strokeWidth="1.5"
            opacity={0.6}
          />

          {/* Bright camps with altitude markers */}
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
                  fill={reached ? "#ffeb3b" : "#e8f4ff"}
                  stroke={reached ? "#ffc107" : "#b3d9ff"}
                  strokeWidth="1"
                />
                <text
                  x={x}
                  y={y - 10}
                  fontSize={12}
                  fill="#2c3e50"
                  textAnchor="middle"
                  fontWeight={reached ? "bold" : "normal"}
                >
                  {camp.name}
                </text>
                <text
                  x={x}
                  y={y + 20}
                  fontSize={10}
                  fill="#ffffff"
                  textAnchor="middle"
                  fontWeight="normal"
                  opacity={0.8}
                >
                  {camp.altitude}m
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Bright climber indicator */}
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
          fill="#4a90e2"
          stroke="#2c5aa6"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="4" r="2" fill="#ffffff" />
          <path d="M12 6v4" />
          <path d="M10 10h4" />
          <path d="M12 14l-2 4" />
          <path d="M12 14l2 4" />
          <path d="M10 10l-2 2" />
          <path d="M14 10l2 2" />
        </svg>
      </div>

      {/* Zone indicator with bright styling */}
      <div className="absolute top-4 left-4 z-40 bg-white/90 backdrop-blur px-3 py-1 rounded-full text-xs font-bold text-shikhar-dusk border border-shikhar-dawn shadow-md" aria-label={`Zone: ${zone}`}>
        <span className="text-shikhar-dawn mr-1">⬔</span>
        {zone}
      </div>

      {/* Altitude display with better contrast */}
      <div className="absolute top-4 right-4 z-40 bg-white/95 backdrop-blur px-3 py-1 rounded text-sm font-mono text-shikhar-dusk border border-shikhar-dawn shadow-md" aria-label={`Altitude: ${roundedAltitude} meters`}>
        <span className="text-shikhar-dawn font-bold">🏔️</span> {roundedAltitude} m
      </div>

      {/* Bright prayer flags for completed rounds */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-40 flex gap-1" aria-label={`Rounds completed: ${roundsCompleted} of ${GAME.roundsPerClimb}`}>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
          <div
            key={i}
            className={`w-5 h-3 rounded-t ${i <= roundsCompleted ? "bg-gradient-to-r from-green-400 via-emerald-400 to-teal-400 border-b-2 border-green-600" : "bg-slate-200 opacity-30"} transition-all duration-300 shadow-sm`}
            aria-label={`Round ${i} ${i <= roundsCompleted ? "completed" : "pending"}`}
          />
        ))}
      </div>
    </section>
  );
}