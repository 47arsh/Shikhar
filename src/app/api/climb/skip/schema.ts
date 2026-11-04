import { z } from "zod";

const skipSchema = z.object({
  climbId: z.string().min(1),
  round: z.number().int().min(1).max(10),
});

export type SkipInput = z.infer<typeof skipSchema>;

export function validateSkip(input: unknown): SkipInput {
  return skipSchema.parse(input);
}
