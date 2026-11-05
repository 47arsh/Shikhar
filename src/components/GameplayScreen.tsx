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
    dailyLocked,
    setAnswer,
    submitCurrentAnswer,
    skipCurrentRound,
    startNewClimb,
  } = useGame();

  useEffect(() => {
    if (status === "idle" && mode) {
      startNewClimb(mode);
    }
  }, [status, mode, startNewClimb]);

  const currentPrompt = prompts[currentRound - 1];

  if (status === "idle" || !currentPrompt) {
    return <div className="min-h-screen flex items-center justify-center p-4" />;
  }

  const handleSubmit = useCallback(() => {
    submitCurrentAnswer();
  }, [submitCurrentAnswer]);

  const handleSkip = useCallback(() => {
    skipCurrentRound();
  }, [skipCurrentRound]);

  const handleAnswerChange = useCallback((value: string) => {
    setAnswer(value);
  }, [setAnswer]);

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
            {dailyLocked && <span>Daily climb locked</span>}
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
