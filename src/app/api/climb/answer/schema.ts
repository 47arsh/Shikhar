import { z } from "zod";
import { GAME } from "@/config/game";

const answerSchema = z.object({
  climbId: z.string().min(1),
  round: z.number().int().min(1).max(10),
  input: z.string().min(1).max(GAME.maxInputLength),
});

export type AnswerInput = z.infer<typeof answerSchema>;

export function validateAnswer(input: unknown): AnswerInput {
  return answerSchema.parse(input);
}
