export type ClimbMode = "daily" | "free";

export interface PromptPick {
  round: number;
  text: string;
  hint: string | null;
  category: string;
}

export interface StartResponse {
  climbId: string;
  prompts: PromptPick[];
}

export interface AnswerResponse {
  result: "matched" | "valid" | "uncertain" | "invalid" | "unverified";
  canonicalName?: string;
  points?: number;
  tier?: string;
  firstAscent?: boolean;
  altitude?: number;
  totalPoints?: number;
  outcome?: string;
  roundsCompleted?: number;
  attemptsLeft?: number;
  message?: string;
}

export interface SkipResponse {
  result: "skipped";
  skipsLeft: number;
  roundsCompleted: number;
  outcome?: string;
}

export interface RoundResult {
  round: number;
  text: string;
  category: string;
  input: string | null;
  points: number | null;
  tier: string | null;
  skipped: boolean;
}

export interface ResultResponse {
  climbId: string;
  mode: ClimbMode;
  totalPoints: number;
  outcome: string;
  altitude: number;
  rounds: RoundResult[];
}

const API_BASE = "";

async function request<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(err.error || "Request failed");
  }
  return res.json();
}

export function startClimb(mode: ClimbMode, anonId?: string): Promise<StartResponse> {
  return request<StartResponse>("/api/climb/start", { mode });
}

export function submitAnswer(
  climbId: string,
  round: number,
  input: string,
): Promise<AnswerResponse> {
  return request<AnswerResponse>("/api/climb/answer", { climbId, round, input });
}

export function skipRound(climbId: string, round: number): Promise<SkipResponse> {
  return request<SkipResponse>("/api/climb/skip", { climbId, round });
}

export function getResult(climbId: string): Promise<ResultResponse> {
  return fetch(`/api/climb/result/${climbId}`)
    .then((res) => {
      if (!res.ok) throw new Error("Result not found");
      return res.json();
    })
    .then((data) => data as ResultResponse);
}
