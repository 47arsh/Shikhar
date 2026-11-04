import { GAME } from "@/config/game";

export type SanitizeResult =
  | { ok: true; value: string }
  | { ok: false; reason: "too_long" | "url" | "control_char" };

const URL_PATTERN = /https?:\/\//i;
const WWW_PATTERN = /www\./i;
const CONTROL_CHAR_PATTERN = /[\u0000-\u001f\u007f-\u009f]/;

export function sanitizeInput(input: string): SanitizeResult {
  if (input.length > GAME.maxInputLength) {
    return { ok: false, reason: "too_long" };
  }
  if (URL_PATTERN.test(input) || WWW_PATTERN.test(input)) {
    return { ok: false, reason: "url" };
  }
  if (CONTROL_CHAR_PATTERN.test(input)) {
    return { ok: false, reason: "control_char" };
  }
  return { ok: true, value: input.trim() };
}
