-- Add open-vocabulary fields to Answer and create JudgedAnswer table

-- Answer: source, entityId, popularitySignal
ALTER TABLE "Answer" ADD COLUMN "source" TEXT NOT NULL DEFAULT 'seeded';
ALTER TABLE "Answer" ADD COLUMN "entityId" TEXT;
ALTER TABLE "Answer" ADD COLUMN "popularitySignal" DOUBLE PRECISION;

-- JudgedAnswer: cached verdicts for open-vocabulary inputs
CREATE TABLE "JudgedAnswer" (
    "id" TEXT NOT NULL,
    "promptId" TEXT NOT NULL,
    "normalizedInput" TEXT NOT NULL,
    "valid" BOOLEAN NOT NULL,
    "canonicalName" TEXT NOT NULL,
    "entityId" TEXT,
    "confidence" DOUBLE PRECISION NOT NULL,
    "reason" TEXT NOT NULL,
    "answerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JudgedAnswer_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "JudgedAnswer_promptId_fkey" FOREIGN KEY ("promptId") REFERENCES "Prompt"("id") ON DELETE CASCADE,
    CONSTRAINT "JudgedAnswer_answerId_fkey" FOREIGN KEY ("answerId") REFERENCES "Answer"("id") ON DELETE SET NULL
);

CREATE INDEX "JudgedAnswer_promptId_idx" ON "JudgedAnswer"("promptId");
CREATE INDEX "JudgedAnswer_promptId_normalizedInput_idx" ON "JudgedAnswer"("promptId", "normalizedInput");
CREATE UNIQUE INDEX "JudgedAnswer_promptId_normalizedInput_key" ON "JudgedAnswer"("promptId", "normalizedInput");
