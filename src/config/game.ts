export const GAME = {
  name: "Shikhar",
  roundsPerClimb: 10,
  baseAltitudeM: 1780,
  summitAltitudeM: 8586,
  pointsToSummit: 600,
  skipsPerClimb: 2,
  maxAttemptsPerRound: 5,
  priorWeightK: 40,
  dayBoundaryTz: "Asia/Kolkata",

  // Open-vocabulary answer pipeline (Step C)
  judgeDailyCallCap: 100,
  judgeTimeoutMs: 4000,
  negativeCacheTtlDays: 7,
  judgeValidConfidence: 0.8,
  judgeReviewConfidence: 0.5,
  neutralPriorRarity: 60,
  maxInputLength: 60,
} as const;

export type GameConfig = typeof GAME;
