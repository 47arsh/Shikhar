"use client";

import { useCallback, useEffect } from "react";
import { GAME } from "@/config/game";
import { useGame } from "@/context/GameContext";
import { MountainScene } from "@/components/MountainScene";
import { AnswerInput } from "@/components/AnswerInput";

interface GameplayScreenProps {
  mode?: "daily" | "free";
}

export function GameplayScreen({ mode }: GameplayScreenProps) {
  const {
    prompts,
    currentRound,
    totalPoints,
    status,
    answer,
    checking,
    result,
    streak,
    setAnswer,
    submitCurrentAnswer,
    skipCurrentRound,
    startNewClimb,
    error,
    setError,
  } = useGame();

  useEffect(() => {
    if (status === "idle" && mode) {
      startNewClimb(mode);
    }
  }, [status, mode, startNewClimb]);

  const currentPrompt = prompts[currentRound - 1];

  // Loading state while climb is being created
  if (status === "playing" && (!prompts || prompts.length === 0)) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <div className="flex flex-col items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-12 h-12 border-4 border-shikhar-dusk border-t-transparent rounded-full animate-spin" />
            <p className="text-lg font-medium text-shikhar-dusk">Starting climb…</p>
            <p className="text-sm text-slate-500">Please wait.</p>
          </div>
        </div>
      </div>
    );
  }

  if (!currentPrompt) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <div className="text-center">
          <p className="text-sm text-slate-500">No prompts available.</p>
        </div>
      </div>
    );
  }

  const handleSubmit = useCallback(() => {
    setError(null);
    submitCurrentAnswer();
  }, [submitCurrentAnswer, setError]);

  const handleSkip = useCallback(() => {
    setError(null);
    skipCurrentRound();
  }, [skipCurrentRound, setError]);

  const handleAnswerChange = useCallback((value: string) => {
    setAnswer(value);
    setError(null);
  }, [setAnswer, setError]);

  const handleRetry = useCallback(() => {
    setError(null);
    submitCurrentAnswer();
  }, [submitCurrentAnswer, setError]);

  const progress = (currentRound / GAME.roundsPerClimb) * 100;

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="px-4 py-3 bg-white/50 backdrop-blur border-b border-border sticky top-0 z-50">
        <div className="max-w-md mx-auto flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-shikhar-dusk">
              Round {currentRound} of {GAME.roundsPerClimb}
            </span>
            <span className="text-xs font-medium text-shikhar-dusk">
              {totalPoints} pts
            </span>
          </div>
          <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
            <div
              className="bg-shikhar-dawn h-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>{streak} day streak</span>
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-6 flex-1">
        {/* Mountain scene */}
        <MountainScene
          altitude={0}
          roundsCompleted={currentRound - 1}
          className="h-64 mb-6"
        />

        {/* Prompt card */}
        <div className="bg-card border border-border rounded-xl p-6 mb-6 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              {currentPrompt.category}
            </span>
            {result?.firstAscent && (
              <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded">
                First ascent!
              </span>
            )}
          </div>
          <h2 className="text-xl font-display font-bold text-shikhar-dusk mb-2">
            {currentPrompt.text}
          </h2>
          {currentPrompt.hint && (
            <p className="text-sm text-slate-600 italic">{currentPrompt.hint}</p>
          )}
        </div>

        {/* Error display */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start gap-2">
              <span className="text-red-600">⚠️</span>
              <p className="text-sm text-red-700">{error}</p>
            </div>
            <button
              onClick={handleRetry}
              className="mt-2 px-3 py-1 rounded text-xs font-medium text-red-600 bg-red-100 hover:bg-red-200 transition-all"
            >
              Try again
            </button>
          </div>
        )}

        {/* Answer input */}
        <AnswerInput
          value={answer}
          onChange={handleAnswerChange}
          onSubmit={handleSubmit}
          checking={checking}
          disabled={status !== "playing"}
          error={result?.result === "invalid" || result?.result === "uncertain" ? result.message : undefined}
        />

        {/* Skip button */}
        <button
          onClick={handleSkip}
          disabled={checking || status !== "playing"}
          className={`w-full py-2.5 rounded-xl font-medium text-shikhar-dusk border border-border transition-all disabled:opacity-50 ${
            checking || status !== "playing"
              ? "bg-slate-100"
              : "bg-white hover:bg-slate-50"
          }`}
          aria-label="Skip this round"
        >
          Skip round
        </button>
      </main>
    </div>
  );
}
