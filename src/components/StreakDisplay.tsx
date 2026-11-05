import { useGame } from "@/context/GameContext";

export function StreakDisplay() {
  const { streak, dailyLocked } = useGame();

  return (
    <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-xs font-medium text-slate-600">
      <span className="text-orange-500">🔥</span>
      <span>{streak}</span>
      <span className="text-slate-400">day streak</span>
      {dailyLocked && (
        <span className="ml-1 text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">
          Daily locked
        </span>
      )}
    </div>
  );
}
