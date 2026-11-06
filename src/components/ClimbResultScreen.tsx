"use client";

import { GAME } from "@/config/game";
import { useGame } from "@/context/GameContext";

interface ClimbResultScreenProps {
  onRestart: () => void;
}

function getTierLabel(points: number): string {
  if (points >= 80) return "Inferno";
  if (points >= 60) return "Gem";
  if (points >= 40) return "Star";
  if (points >= 20) return "Sparkle";
  return "Droplet";
}

export function ClimbResultScreen({ onRestart }: ClimbResultScreenProps) {
  const { totalPoints, outcome, streak } = useGame();

  const summited = outcome === "summited";
  const altitude = Math.min(
    GAME.baseAltitudeM +
      totalPoints * ((GAME.summitAltitudeM - GAME.baseAltitudeM) / GAME.pointsToSummit),
    GAME.summitAltitudeM,
  );

  const handleShare = () => {
    const shareText = buildShareText();
    if (typeof navigator !== "undefined" && "share" in navigator) {
      void (navigator as { share?: (data: { title: string; text: string }) => Promise<void> }).share?.({
        title: "Shikhar Climb",
        text: shareText,
      });
    } else if (typeof window !== "undefined" && window.navigator.clipboard) {
      void window.navigator.clipboard.writeText(shareText);
    }
  };

  const buildShareText = (): string => {
    const tier = getTierLabel(totalPoints);
    const status = summited ? "Summited" : "Turned back";
    return `Shikhar: ${status} at ${Math.round(altitude)}m — ${totalPoints} pts (${tier}) #ShikharGame`;
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background">
      <div className="max-w-md w-full space-y-6">
        {/* Summit marker */}
        <div className="relative h-40 flex items-end justify-center">
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0.5 h-24 bg-slate-400" />
          <div
            className={`absolute bottom-24 left-1/2 -translate-x-1/2 w-12 h-8 ${
              summited ? "bg-shikhar-dawn" : "bg-slate-200"
            } rounded-t-lg shadow-md`}
          />
          <svg
            className={`absolute bottom-36 left-1/2 -translate-x-1/2 w-16 h-16 ${
              summited ? "text-shikhar-dusk" : "text-slate-400"
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
          >
            {summited ? (
              <>
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </>
            ) : (
              <>
                <path d="M20 12H4" />
                <path d="M12 20V4" />
              </>
            )}
          </svg>
        </div>

        {/* Result */}
        <div className="text-center">
          <h1 className="text-3xl font-display font-bold text-shikhar-dusk mb-2">
            {summited ? "Summited!" : "Turned back"}
          </h1>
          <p className="text-lg text-slate-600 mb-4">
            Reached {Math.round(altitude)}m on Kanchenjunga
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 bg-white/50 p-4 rounded-xl border border-border">
          <div className="text-center">
            <div className="text-2xl font-bold text-shikhar-dusk">{totalPoints}</div>
            <div className="text-xs text-slate-500">Points</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-shikhar-dusk">{Math.round(altitude)}m</div>
            <div className="text-xs text-slate-500">Altitude</div>
          </div>
        </div>

        {/* Streak */}
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <span className="text-shikhar-dusk font-medium" aria-hidden="true">
            ▾
          </span>
          <span>{streak} day streak</span>
        </div>

        {/* Actions */}
        <button
          onClick={onRestart}
          className="w-full py-4 rounded-xl font-bold text-white bg-shikhar-dusk hover:bg-shikhar-dusk/90 shadow-lg transition-all active:scale-95"
        >
          Climb again
        </button>

        <button
          onClick={handleShare}
          className="w-full py-3 rounded-xl font-medium text-shikhar-dusk border border-border bg-white hover:bg-slate-50 transition-all"
        >
          Share result
        </button>
      </div>
    </div>
  );
}

export function LoseScreen({ onRestart }: ClimbResultScreenProps) {
  return <ClimbResultScreen onRestart={onRestart} />;
}
