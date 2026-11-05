"use client";

import { useGame } from "@/context/GameContext";

export function StreakDisplay() {
  const { streak } = useGame();

  return (
    <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-xs font-medium text-slate-600">
      <span className="text-orange-500">🔥</span>
      <span>{streak}</span>
      <span className="text-slate-400">day streak</span>
    </div>
  );
}
