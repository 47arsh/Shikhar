"use client";

import Link from "next/link";
import { useGame } from "@/context/GameContext";
import { StreakDisplay } from "@/components/StreakDisplay";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Shikhar - Indian Rarity-Trivia Climbing Game",
  description: "Name any real answer to Indian trivia prompts. Score rarer answers higher and climb Kanchenjunga (8,586 m).",
  openGraph: {
    title: "Shikhar - Indian Rarity-Trivia Climbing Game",
    description: "Name any real answer to Indian trivia prompts. Score rarer answers higher and climb Kanchenjunga.",
    type: "website",
  },
};

export default function HomePage() {
  const { dailyLocked, startNewClimb } = useGame();

  const handleStartDaily = () => {
    startNewClimb("daily");
  };

  const handleStartFree = () => {
    startNewClimb("free");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-6">
        <h1 className="text-5xl font-display font-bold text-shikhar-dusk tracking-tight">
          Shikhar
        </h1>
        <p className="text-lg text-slate-600">
          An Indian rarity-trivia climbing game. Climb Kanchenjunga with rare answers.
        </p>

        <StreakDisplay />

        <div className="space-y-3">
          <Link
            href="/play/daily"
            onClick={handleStartDaily}
            className={`w-full py-4 rounded-xl font-bold text-white transition-all active:scale-95 shadow-lg ${
              dailyLocked
                ? "bg-slate-300 text-slate-500 cursor-not-allowed"
                : "bg-shikhar-dusk hover:bg-shikhar-dusk/90"
            }`}
          >
            {dailyLocked ? "Daily climb (played today)" : "Daily climb"}
          </Link>

          <button
            onClick={handleStartFree}
            className="w-full py-4 rounded-xl font-bold text-shikhar-dusk bg-white border border-border hover:bg-slate-50 transition-all active:scale-95"
          >
            Free climb
          </button>
        </div>

        <div className="text-xs text-slate-500 mt-4">
          No login. No ads. Just rare answers. Climb Kanchenjunga (8,586 m).
        </div>
      </div>
    </div>
  );
}
