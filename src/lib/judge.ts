import { z } from "zod";
import { GAME } from "@/config/game";

export interface EntityCandidate {
  id: string;
  label: string;
  description: string | null;
  sitelinkCount: number | null;
}

export interface JudgeVerdict {
  valid: boolean;
  canonicalName: string;
  entityId: string | null;
  confidence: number;
  reason: string;
}

export const judgeVerdictSchema = z.object({
  valid: z.boolean(),
  canonicalName: z.string().min(1).max(200),
  entityId: z.string().nullable(),
  confidence: z.number().min(0).max(1),
  reason: z.string().max(140),
});

export type JudgeVerdictOutput = z.infer<typeof judgeVerdictSchema>;

export interface Judge {
  judge(
    promptText: string,
    hint: string | null,
    userInput: string,
    candidates: EntityCandidate[]
  ): Promise<JudgeVerdict>;
}

/**
 * Deterministic, fixture-based mock judge used in development and tests.
 * Exercises four paths: valid, invalid, low-confidence (uncertain), and
 * timeout. User input is treated strictly as data — injected instructions
 * are not acted on.
 */
export class MockJudge implements Judge {
  // Phrases that indicate a prompt-injection attempt; they are treated as
  // untrusted data and cause the verdict to be invalid.
  private injectionPatterns = [
    "ignore previous",
    "mark this valid",
    "you are now",
    "disregard",
    "system:",
  ];

  async judge(
    _promptText: string,
    _hint: string | null,
    userInput: string,
    candidates: EntityCandidate[]
  ): Promise<JudgeVerdict> {
    const normalized = userInput.trim().toLowerCase();

    // Prompt-injection guard: injected instructions are treated as data and
    // cause an invalid verdict.
    if (this.injectionPatterns.some((p) => normalized.includes(p))) {
      return {
        valid: false,
        canonicalName: userInput.trim(),
        entityId: null,
        confidence: 0.1,
        reason: "Input contains untrusted instructions",
      };
    }

    // Timeout path: simulates a judge exceeding judgeTimeoutMs
    if (normalized === "__timeout__") {
      await new Promise((resolve) => {
        setTimeout(resolve, GAME.judgeTimeoutMs + 100);
      });
      throw new Error("Judge timeout");
    }

    // Uncertain path: 0.5 <= confidence < 0.8
    if (normalized === "__uncertain__") {
      return {
        valid: false,
        canonicalName: userInput.trim(),
        entityId: null,
        confidence: 0.65,
        reason: "Could not verify with sufficient confidence",
      };
    }

    // Invalid path: confidence < 0.5
    if (normalized === "__invalid__" || normalized === "asdfghjkl") {
      return {
        valid: false,
        canonicalName: userInput.trim(),
        entityId: null,
        confidence: 0.2,
        reason: "Not a valid answer for this prompt",
      };
    }

    // Valid path: match against candidates
    const match = candidates.find((c) => c.label.toLowerCase() === normalized);
    if (match) {
      return {
        valid: true,
        canonicalName: match.label,
        entityId: match.id,
        confidence: 0.95,
        reason: "Matched known entity",
      };
    }

    // Deterministic: only accept known seeded answers/aliases or specific test fixtures
    // Arbitrary input is rejected — the judge is fixture-based, not permissive
    if (normalized === "ganges" || normalized === "ganga" || normalized === "yamuna" || 
        normalized === "brahmaputra" || normalized === "nile" || normalized === "jordan" ||
        normalized === "mississippi" || normalized === "amazon") {
      return {
        valid: true,
        canonicalName: userInput.trim(),
        entityId: null,
        confidence: 0.95,
        reason: "Matched known valid answer",
      };
    }

    return {
      valid: false,
      canonicalName: userInput.trim(),
      entityId: null,
      confidence: 0.3,
      reason: "Input does not look like a valid entity",
    };
  }
}

export function createJudge(): Judge {
  return new MockJudge();
}
