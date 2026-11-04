import { z } from "zod";

const startSchema = z.object({
  mode: z.enum(["daily", "free"]),
});

export type StartInput = z.infer<typeof startSchema>;

export function validateStart(input: unknown): StartInput {
  return startSchema.parse(input);
}
