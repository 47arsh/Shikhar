import { z } from "zod";

const answerSchema = z.object({
  name: z.string().min(1).max(100),
  rarity: z.number().int().min(1).max(100),
  aliases: z.array(z.string().min(1).max(100)).default([]),
});

export const promptSchema = z.object({
  id: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/, "id must be kebab-case lowercase"),
  category: z.string().min(1).max(50),
  text: z.string().min(1).max(300),
  hint: z.string().min(1).max(200).optional(),
  verified: z.boolean().default(true),
  answers: z.array(answerSchema).min(30),
});

export type PromptContent = z.infer<typeof promptSchema>;
export type AnswerContent = z.infer<typeof answerSchema>;

export function validatePrompt(content: unknown): PromptContent {
  return promptSchema.parse(content);
}

export function validatePrompts(contents: unknown[]): PromptContent[] {
  return contents.map((c) => validatePrompt(c));
}
