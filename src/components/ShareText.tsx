"use client";

import { useCallback } from "react";

interface ShareTextProps {
  totalPoints: number;
  rounds: Array<{ points: number | null; tier: string | null; skipped: boolean }>;
  outcome: string;
}

function tierToEmoji(tier: string | null, points: number | null, skipped: boolean): string {
  if (skipped) return "⏭️";
  if (points == null) return "⬜";
  if (points >= 80) return "🔴";
  if (points >= 60) return "🟠";
  if (points >= 40) return "🟡";
  if (points >= 20) return "🟢";
  return "🔵";
}

export function ShareText({ totalPoints, rounds, outcome }: ShareTextProps) {
  const tierRow = rounds.map((r) => tierToEmoji(r.tier, r.points, r.skipped)).join(" ");
  const summited = outcome === "summited";
  const status = summited ? "Summited 🏔️" : "Turned back 🏳️";

  const shareText = useCallback(
    () =>
      `Shikhar: ${status} — ${totalPoints} pts\n${tierRow}\n#ShikharGame`,
    [totalPoints, tierRow, outcome],
  );

  const handleCopy = useCallback(() => {
    if (typeof window !== "undefined" && window.navigator.clipboard) {
      window.navigator.clipboard.writeText(shareText());
    }
  }, [shareText]);

  return (
    <div className="max-w-md mx-auto px-4 py-6">
      <div className="bg-white/50 border border-border rounded-xl p-4 mb-4">
        <p className="text-sm text-slate-600 mb-2">Copy your result:</p>
        <div className="font-mono text-sm text-shikhar-dusk bg-slate-100 p-3 rounded border border-slate-200 whitespace-pre-wrap">
          {shareText()}
        </div>
        <button
          onClick={handleCopy}
          className="mt-3 w-full py-2 rounded-lg font-medium text-shikhar-dusk border border-border bg-white hover:bg-slate-50 transition-all"
        >
          Copy to clipboard
        </button>
      </div>
    </div>
  );
}
