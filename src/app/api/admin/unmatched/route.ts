import { NextRequest, NextResponse } from "next/server";
import { validateAdminSecret } from "./schema";
import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";

export async function GET(req: NextRequest): Promise<NextResponse> {
  env;
  const secret = req.headers.get("x-admin-secret");
  if (secret !== env.ADMIN_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const submissions = await prisma.unmatchedSubmission.findMany({
    where: { reviewed: false },
    orderBy: { count: "desc" },
    take: 50,
    include: { prompt: true },
  });

  return NextResponse.json({ submissions });
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  env;
  const secret = req.headers.get("x-admin-secret");
  if (secret !== env.ADMIN_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  let input: { submissionId: string; action: "approve" | "dismiss"; canonicalName?: string; isAlias?: boolean };
  try {
    input = z
      .object({
        submissionId: z.string().min(1),
        action: z.enum(["approve", "dismiss"]),
        canonicalName: z.string().optional(),
        isAlias: z.boolean().optional(),
      })
      .parse(body);
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const submission = await prisma.unmatchedSubmission.findUnique({
    where: { id: input.submissionId },
  });
  if (!submission) {
    return NextResponse.json({ error: "Submission not found" }, { status: 404 });
  }

  if (input.action === "dismiss") {
    await prisma.unmatchedSubmission.update({
      where: { id: input.submissionId },
      data: { reviewed: true },
    });
    return NextResponse.json({ ok: true });
  }

  // Approve: create a new answer or alias
  if (!input.canonicalName) {
    return NextResponse.json({ error: "canonicalName required for approve" }, { status: 400 });
  }

  const existingAnswer = await prisma.answer.findFirst({
    where: {
      promptId: submission.promptId,
      canonicalName: input.canonicalName,
    },
  });

  if (existingAnswer && !input.isAlias) {
    await prisma.unmatchedSubmission.update({
      where: { id: input.submissionId },
      data: { reviewed: true, reviewNote: "Already exists" },
    });
    return NextResponse.json({ error: "Answer already exists" }, { status: 409 });
  }

  await prisma.answer.create({
    data: {
      promptId: submission.promptId,
      canonicalName: input.canonicalName,
      seededRarity: null,
      aliases: input.isAlias ? [submission.normalizedInput] : [],
      plays: 0,
    },
  });

  await prisma.unmatchedSubmission.update({
    where: { id: input.submissionId },
    data: { reviewed: true },
  });

  return NextResponse.json({ ok: true });
}
