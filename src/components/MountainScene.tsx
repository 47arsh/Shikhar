"use client";

import { useEffect, useState } from "react";
import { GAME } from "@/config/game";

const SUMMIT_ALTITUDE = GAME.summitAltitudeM;

interface MountainSceneProps {
  altitude: number;
  roundsCompleted: number;
  className?: string;
}

const CAMPS = [
  { name: "Yuksom", altitude: 1780, labelY: -10 },
  { name: "Dzongri", altitude: 4020, labelY: -10 },
  { name: "Goecha La", altitude: 4940, labelY: -10 },
  { name: "Summit", altitude: 8586, labelY: -10 },
];

function getZoneLabel(altitude: number): string {
  if (altitude < 3000) return "Valley";
  if (altitude < 5000) return "Alpine";
  if (altitude < 7000) return "Glacier";
  return "Death zone";
}

export function MountainScene({
  altitude,
  roundsCompleted,
  className,
}: MountainSceneProps) {
  const progress = Math.min(altitude / SUMMIT_ALTITUDE, 1);
  const [cameraY, setCameraY] = useState(0);

  useEffect(() => {
    const targetY = -progress * 400;
    setCameraY(targetY);
  }, [progress]);

  const climberY = Math.max(0, 100 - progress * 90);

  return (
    <section className={`relative min-h-screen w-full overflow-hidden ${className ?? ""}`}>
      {/* Sky gradient shifting with altitude */}
      <div className="absolute inset-0 z-0 transition-colors duration-500" style={{ background: getSkyColor(progress) }} />

      {/* Distant mountain layer */}
      <div className="absolute inset-0 z-10 pointer-events-none" style={{ transform: `translateY(${cameraY * 0.3}px)` }}>
        <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 1200 800">
          <defs>
            <linearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={getSkyTop(progress)} />
              <stop offset="100%" stopColor={getSkyBottom(progress)} />
            </linearGradient>
          </defs>
          <rect width="1200" height="800" fill="url(#skyGrad)" />
          {/* Distant ridges */}
          <path d="M 0 600 Q 200 450 400 550 T 800 480 T 1200 520 V 800 H 0 Z" fill="#1e293b" opacity={0.6} />
          <path d="M 0 500 Q 300 350 600 450 T 1200 400 V 800 H 0 Z" fill="#0f172a" opacity={0.4} />
        </svg>
      </div>

      {/* Middle mountain layer with trail */}
      <div className="absolute inset-0 z-20 pointer-events-none" style={{ transform: `translateY(${cameraY * 0.6}px)` }}>
        <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 1200 800">
          <defs>
            <linearGradient id="mountGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#334155" />
              <stop offset="100%" stopColor="#475569" />
            </linearGradient>
          </defs>
          <path d="M 0 550 Q 150 300 350 400 T 700 320 T 1050 380 V 800 H 0 Z" fill="url(#mountGrad)" />
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
            const campProgress = camp.altitude / SUMMIT_ALTITUDE;
            const x = 100 + campProgress * 1000;
            const y = 780 - campProgress * 550;
            const reached = altitude >= camp.altitude;
            return (
              <g key={camp.name}>
                <circle cx={x} cy={y} r={reached ? 6 : 4} fill={reached ? "#FDE68A" : "#94a3b8"} />
                <text x={x} y={y + camp.labelY} fontSize={12} fill="#e2e8f0" textAnchor="middle" fontWeight={reached ? "bold" : "normal"}>
                  {camp.name}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Climber marker */}
      <div className="absolute z-30 pointer-events-none transition-all duration-1000 ease-out" style={{
        left: "50%",
        top: `${climberY}%`,
        transform: "translate(-50%, -50%)",
      }}>
        <div className="relative">
        <div className="w-8 h-8 bg-shikhar-dawn rounded-full shadow-lg border-2 border-white flex items-center justify-center">
          <span className="text-[10px] font-bold text-shikhar-dusk">🏔️</span>
        </div>
          <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-2 h-2 bg-orange-400 rounded-full opacity-0 transition-opacity duration-300" id="sparkle" />
        </div>
      </div>

      {/* Altitude zone indicator */}
      <div className="absolute top-4 left-4 z-40 bg-white/90 backdrop-blur px-3 py-1 rounded-full text-xs font-bold text-shikhar-dusk border border-shikhar-dawn shadow-md">
        {getZoneLabel(altitude)}
      </div>

      {/* Altitude display */}
      <div className="absolute top-4 right-4 z-40 bg-white/90 backdrop-blur px-3 py-1 rounded text-sm font-mono text-shikhar-dusk border border-shikhar-dawn shadow-md">
        {Math.round(altitude)} m
      </div>

      {/* Prayer flags */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-40 flex gap-1" style={{ pointerEvents: "none" }}>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
          <div
            key={i}
            className={`w-4 h-3 rounded-t ${i <= roundsCompleted ? "bg-shikhar-dawn border-b-2 border-shikhar-dusk" : "bg-slate-200 opacity-30"} transition-all duration-300`}
          />
        ))}
      </div>
    </section>
  );
}

function getSkyColor(p: number): string {
  const r = Math.round(15 + (15 - p * 15));
  const g = Math.round(30 + (100 - p * 100));
  const b = Math.round(58 + (175 - p * 175));
  return `rgb(${r}, ${g}, ${b})`;
}

function getSkyTop(p: number): string {
  const r = Math.round(15 - p * 10);
  const g = Math.round(24 - p * 24);
  const b = Math.round(42 - p * 30);
  return `rgb(${Math.max(0, r)}, ${Math.max(0, g)}, ${Math.max(0, b)})`;
}

function getSkyBottom(p: number): string {
  const r = Math.round(15 + p * 100);
  const g = Math.round(30 + p * 120);
  const b = Math.round(58 + p * 160);
  return `rgb(${Math.min(255, r)}, ${Math.min(255, g)}, ${Math.min(255, b)})`;
}
