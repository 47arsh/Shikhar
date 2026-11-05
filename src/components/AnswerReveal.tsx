"use client";

import { useCallback, useEffect } from "react";
import { useGame } from "@/context/GameContext";

interface AnswerRevealProps {
  onContinue: () => void;
}

export function AnswerReveal({ onContinue }: AnswerRevealProps) {
  const { result, nextRound, skipCurrentRound } = useGame();

  // Announce result to screen readers when it changes
  useEffect(() => {
    if (result?.result === "matched" || result?.result === "valid") {
      // No visual change needed here; the component re-renders
    }
  }, [result]);

  const handleContinue = useCallback(() => {
    onContinue();
    nextRound();
  }, [onContinue, nextRound]);

  const handleSkip = useCallback(() => {
    skipCurrentRound();
    onContinue();
  }, [skipCurrentRound, onContinue]);

  const tierColors: Record<string, string> = {
    "Everyone's answer": "bg-slate-100 text-slate-600",
    "Fairly common": "bg-blue-100 text-blue-700",
    Uncommon: "bg-purple-100 text-purple-700",
    "Rare find": "bg-amber-100 text-amber-800",
  };

  if (!result) return null;

  const isSuccess = result.result === "matched" || result.result === "valid";

  return (
    <div className="bg-card border border-border rounded-2xl p-6 shadow-lg mb-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
      {/* Result header */}
      <div className="flex items-center justify-between mb-4">
        <div className={`px-3 py-1 rounded-full text-xs font-bold ${tierColors[result.tier ?? "Everyone's answer"]}`}>
          {result.tier}
        </div>
        {result.firstAscent && (
          <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-xs font-bold animate-bounce">
            <span>🏔️</span>
            <span>First ascent</span>
          </div>
        )}
      </div>

      {/* Answer */}
      <div className="mb-4">
        <p className="text-sm font-medium text-slate-500 mb-1">Your answer</p>
        <p className="text-2xl font-display font-bold text-shikhar-dusk">{result.canonicalName}</p>
      </div>

      {/* Points */}
      {isSuccess && result.points != null && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm text-slate-500">Points</span>
            <span className="text-lg font-bold text-shikhar-dusk">+{result.points}</span>
          </div>
          <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
            <div
              className="bg-shikhar-dawn h-full transition-all duration-500"
              style={{ width: `${Math.min(result.points, 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Message for non-success */}
      {!isSuccess && result.message && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
          {result.message}
        </div>
      )}

      {/* Continue button */}
      <button
        onClick={handleContinue}
        className="w-full py-3 rounded-xl font-bold text-white bg-shikhar-dusk hover:bg-shikhar-dusk/90 shadow-lg transition-all active:scale-95"
        aria-label="Continue to next round"
      >
        {isSuccess ? "Next round" : "Try again"}
      </button>

      {result.result === "uncertain" || result.result === "invalid" ? (
        <button
          onClick={handleSkip}
          className="w-full py-2.5 mt-2 rounded-xl font-medium text-shikhar-dusk border border-border bg-white hover:bg-slate-50 transition-all"
          aria-label="Skip this round"
        >
          Skip round
        </button>
      ) : null}
    </div>
  );
}
