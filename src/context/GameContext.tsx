import { createContext, useContext, useCallback, useState } from "react";
import { startClimb, submitAnswer, skipRound, getResult } from "@/lib/api";
import { GAME } from "@/config/game";
import type { StartResponse, AnswerResponse, SkipResponse, ResultResponse, PromptPick } from "@/lib/api";

export type GameStatus = "idle" | "playing" | "revealing" | "finished";

export interface ClimbState {
  climbId: string | null;
  mode: "daily" | "free" | null;
  prompts: PromptPick[];
  currentRound: number;
  totalPoints: number;
  status: GameStatus;
  answer: string;
  checking: boolean;
  result: AnswerResponse | null;
  streak: number;
  dailyLocked: boolean;
  outcome: string | null;
}

export interface GameContextType extends ClimbState {
  startNewClimb: (mode: "daily" | "free") => Promise<void>;
  submitCurrentAnswer: () => Promise<void>;
  skipCurrentRound: () => Promise<void>;
  setAnswer: (value: string) => void;
  nextRound: () => void;
  viewResult: (climbId: string) => Promise<void>;
  resetGame: () => void;
}

const DAILY_KEY = "shikhar_daily_lock";
const STREAK_KEY = "shikhar_streak";
const ANON_ID_KEY = "shikhar_anon_id";

function getAnonId(): string {
  if (typeof window === "undefined") return "anonymous";
  let id = localStorage.getItem(ANON_ID_KEY);
  if (!id) {
    id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    localStorage.setItem(ANON_ID_KEY, id);
  }
  return id;
}

function getDailyLocked(): boolean {
  if (typeof window === "undefined") return false;
  const val = localStorage.getItem(DAILY_KEY);
  if (!val) return false;
  try {
    const parsed = JSON.parse(val);
    const today = new Date().toISOString().slice(0, 10);
    return parsed.date === today;
  } catch {
    return false;
  }
}

function setDailyLocked(): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(DAILY_KEY, JSON.stringify({ date: new Date().toISOString().slice(0, 10) }));
}

function getStoredStreak(): number {
  if (typeof window === "undefined") return 0;
  try {
    return parseInt(localStorage.getItem(STREAK_KEY) || "0", 10);
  } catch {
    return 0;
  }
}

function setStoredStreak(value: number): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STREAK_KEY, String(value));
}

const GameContext = createContext<GameContextType | null>(null);

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<ClimbState>({
    climbId: null,
    mode: null,
    prompts: [],
    currentRound: 1,
    totalPoints: 0,
    status: "idle",
    answer: "",
    checking: false,
    result: null,
    streak: getStoredStreak(),
    dailyLocked: getDailyLocked(),
    outcome: null,
  });

  const anonId = getAnonId();

  const startNewClimb = useCallback(async (mode: "daily" | "free") => {
    if (mode === "daily" && state.dailyLocked) return;

    setState((s) => ({
      ...s,
      mode,
      prompts: [],
      currentRound: 1,
      totalPoints: 0,
      status: "playing",
      answer: "",
      checking: false,
      result: null,
    }));

    try {
      const data: StartResponse = await startClimb(mode);
      setState((s) => ({
        ...s,
        climbId: data.climbId,
        prompts: data.prompts,
      }));
      if (mode === "daily") setDailyLocked();
    } catch (err) {
      setState((s) => ({ ...s, status: "idle" }));
      throw err;
    }
  }, [anonId, state.dailyLocked]);

  const submitCurrentAnswer = useCallback(async () => {
    if (!state.climbId || state.checking) return;
    if (!state.answer.trim()) return;

    setState((s) => ({ ...s, checking: true }));

    try {
      const data: AnswerResponse = await submitAnswer(
        state.climbId,
        state.currentRound,
        state.answer,
      );

      setState((s) => ({
        ...s,
        checking: false,
        result: data,
        status: "revealing",
      }));

      if (data.outcome === "summited" || data.outcome === "turned_back") {
        setState((s) => ({ ...s, status: "finished", totalPoints: data.totalPoints ?? s.totalPoints }));
        if (data.outcome === "summited") {
          const newStreak = state.streak + 1;
          setState((s) => ({ ...s, streak: newStreak }));
          setStoredStreak(newStreak);
        }
      } else if (data.result === "matched" || data.result === "valid") {
        setState((s) => ({ ...s, totalPoints: data.totalPoints ?? s.totalPoints }));
      }
    } catch {
      setState((s) => ({ ...s, checking: false, status: "playing" }));
    }
  }, [state.climbId, state.currentRound, state.answer, state.checking]);

  const skipCurrentRound = useCallback(async () => {
    if (!state.climbId || state.checking) return;
    setState((s) => ({ ...s, checking: true }));

    try {
      const data: SkipResponse = await skipRound(state.climbId, state.currentRound);
      setState((s) => ({
        ...s,
        checking: false,
        status: data.outcome ? "finished" : "playing",
      }));
      if (data.outcome) {
        setState((s) => ({ ...s, status: "finished", totalPoints: s.totalPoints }));
      }
    } catch {
      setState((s) => ({ ...s, checking: false }));
    }
  }, [state.climbId, state.currentRound, state.checking]);

  const setAnswer = useCallback((value: string) => {
    setState((s) => ({ ...s, answer: value }));
  }, []);

  const nextRound = useCallback(() => {
    setState((s) => ({
      ...s,
      currentRound: s.currentRound + 1,
      answer: "",
      result: null,
      status: s.currentRound >= GAME.roundsPerClimb ? "finished" : "playing",
      checking: false,
    }));
  }, []);

  const viewResult = useCallback(async (climbId: string) => {
    try {
      const data: ResultResponse = await getResult(climbId);
      setState((s) => ({
        ...s,
        climbId,
        totalPoints: data.totalPoints,
        outcome: data.outcome,
        status: "finished",
      }));
    } catch {
      // swallow
    }
  }, []);

  const resetGame = useCallback(() => {
    setState({
      climbId: null,
      mode: null,
      prompts: [],
      currentRound: 1,
      totalPoints: 0,
      status: "idle",
      answer: "",
      checking: false,
      result: null,
      streak: state.streak,
      dailyLocked: state.dailyLocked,
      outcome: null,
    });
  }, [state.streak, state.dailyLocked]);

  const ctx: GameContextType = {
    ...state,
    startNewClimb,
    submitCurrentAnswer,
    skipCurrentRound,
    setAnswer,
    nextRound,
    viewResult,
    resetGame,
  };

  return <GameContext.Provider value={ctx}>{children}</GameContext.Provider>;
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error("useGame must be used within GameProvider");
  return ctx;
}
