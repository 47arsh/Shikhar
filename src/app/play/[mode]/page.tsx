"use client";

import { useState } from "react";
import { useGame } from "@/context/GameContext";
import { GameplayScreen } from "@/components/GameplayScreen";
import { AnswerReveal } from "@/components/AnswerReveal";
import { ClimbResultScreen } from "@/components/ClimbResultScreen";
import { ShareText } from "@/components/ShareText";
import type { GameContextType } from "@/context/GameContext";

export default async function PlayPage({ params }: { params: Promise<{ mode: string }> }) {
  const game = useGame() as GameContextType;
  const { status, result, totalPoints, outcome, prompts } = game;
  const [showResult, setShowResult] = useState(false);
  const [showShare, setShowShare] = useState(false);

  const rounds = (prompts ?? []).map(() => ({
    points: result?.points ?? null,
    tier: result?.tier ?? null,
    skipped: false,
  }));

  if (status === "idle") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <h2 className="text-xl font-bold text-shikhar-dusk">Starting climb...</h2>
          <p className="text-slate-500">Please wait.</p>
        </div>
      </div>
    );
  }

  if (status === "finished") {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full space-y-6">
          <ClimbResultScreen onRestart={() => {}} />
          <div className="space-y-3">
            <button
              onClick={() => setShowShare(true)}
              className="w-full py-3 rounded-xl font-medium text-shikhar-dusk border border-border bg-white hover:bg-slate-50 transition-all"
            >
              Share result
            </button>
          </div>
          {showShare && (
            <ShareText totalPoints={totalPoints} rounds={rounds} outcome={outcome ?? ""} />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <GameplayScreen />
      {showResult && (
        <AnswerReveal onContinue={() => setShowResult(false)} />
      )}
    </div>
  );
}
