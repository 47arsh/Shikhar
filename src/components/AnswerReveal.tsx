"use client";

import { useCallback } from "react";
import { useGame } from "@/context/GameContext";
import { GAME } from "@/config/game";

interface AnswerRevealProps {
  result: {
    result: string;
    canonicalName?: string;
    points?: number;
    tier?: string;
    firstAscent?: boolean;
    message?: string;
    attemptsLeft?: number;
    outcome?: string;
    totalPoints?: number;
    altitude?: number;
  };
  attemptsLeft: number;
  skipsLeft: number;
  onNext: () => void;
  onSkip: () => void;
  finished: boolean;
}

const tierColors: Record<string, string> = {
  "Everyone's answer": "bg-slate-100 text-slate-600 border border-slate-200",
  "Fairly common": "bg-blue-100 text-blue-700 border border-blue-200",
  Uncommon: "bg-purple-100 text-purple-700 border border-purple-200",
  "Rare find": "bg-amber-100 text-amber-800 border border-amber-200",
};

function tierLabel(tier: string | undefined): string {
  if (!tier) return "Everyone's answer";
  return tier in tierColors ? tier : "Everyone's answer";
}

export function AnswerReveal({
  result,
  attemptsLeft,
  skipsLeft,
  onNext,
  onSkip,
  finished,
}: AnswerRevealProps) {
  const { setAnswer, setError } = useGame();

  const isSuccess =
    result.result === "matched" || result.result === "valid";

  const handleNext = useCallback(() => {
    setAnswer("");
    setError(null);
    onNext();
  }, [onNext, setAnswer, setError]);

  const handleSkip = useCallback(() => {
    setAnswer("");
    setError(null);
    onSkip();
  }, [onSkip, setAnswer, setError]);

  if (!result) return null;

  return (
    <div
      className="bg-card border border-border rounded-2xl p-6 shadow-lg mb-6"
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <div className="flex items-center justify-between mb-4">
        <span
          className={`px-3 py-1 rounded-full text-xs font-bold border ${tierColors[tierLabel(result.tier)]} aria-label={result.tier}`}
        >
          {result.tier}
        </span>
        {result.firstAscent && (
          <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-xs font-bold">
            <svg
              className="w-3 h-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
            <span>First ascent</span>
          </div>
        )}
      </div>

      <div className="mb-4">
        <p className="text-sm font-medium text-slate-500 mb-1">Your answer</p>
        <p className="text-2xl font-display font-bold text-shikhar-dusk">
          {result.canonicalName ?? "—"}
        </p>
      </div>

      {isSuccess && result.points != null && result.totalPoints != null && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-500">Points this round</span>
            <span className="text-lg font-bold text-shikhar-dusk">
              +{result.points}
            </span>
          </div>
          <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
            <div
              className="bg-shikhar-dawn h-full transition-all duration-500"
              style={{ width: `${Math.min(result.points, 100)}%` }}
            />
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {result.totalPoints} total / {GAME.pointsToSummit} to summit
          </p>
        </div>
      )}

      {!isSuccess && result.message && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
          {result.message}
          {result.attemptsLeft != null && result.attemptsLeft > 0 && (
            <p className="text-xs text-amber-600 mt-1">
              {result.attemptsLeft} attempt{result.attemptsLeft !== 1 ? "s" : ""} remaining
            </p>
          )}
        </div>
      )}

      {finished ? (
        <button
          onClick={handleNext}
          className="w-full py-3 rounded-xl font-bold text-white bg-shikhar-dusk hover:bg-shikhar-dusk/90 shadow-lg transition-all active:scale-95"
          aria-label="See final results"
        >
          See results
        </button>
      ) : isSuccess ? (
        <>
          <button
            onClick={handleNext}
            className="w-full py-3 rounded-xl font-bold text-white bg-shikhar-dusk hover:bg-shikhar-dusk/90 shadow-lg transition-all active:scale-95"
            aria-label="Continue to next round"
          >
            Next round
          </button>
        </>
      ) : (
        <>
          <button
            onClick={handleNext}
            className="w-full py-3 rounded-xl font-bold text-white bg-shikhar-dusk hover:bg-shikhar-dusk/90 shadow-lg transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={attemptsLeft <= 0}
            aria-label="Try again"
          >
            Try again
          </button>

          {skipsLeft > 0 ? (
            <button
              onClick={handleSkip}
              className="w-full py-2.5 mt-2 rounded-xl font-medium text-shikhar-dusk border border-border bg-white hover:bg-slate-50 transition-all"
              aria-label="Skip this round"
            >
              Skip round ({skipsLeft} left)
            </button>
          ) : (
            <p className="text-xs text-slate-500 text-center mt-2">
              No skips remaining
            </p>
          )}
        </>
      )}
    </div>
  );
}
