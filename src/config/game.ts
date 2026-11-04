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
} as const;

export type GameConfig = typeof GAME;
