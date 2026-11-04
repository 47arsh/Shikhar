import { z } from "zod";

const adminSecretSchema = z.object({
  adminSecret: z.string().min(1),
});

export function validateAdminSecret(input: unknown): { adminSecret: string } {
  return adminSecretSchema.parse(input);
}
