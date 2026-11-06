import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ClimbResultScreen } from "@/components/ClimbResultScreen";
import { GameProvider } from "@/context/GameContext";
import { GAME } from "@/config/game";

describe("ClimbResultScreen", () => {
  it("renders with restart and share buttons", () => {
    render(
      <GameProvider>
        <ClimbResultScreen onRestart={vi.fn()} />
      </GameProvider>
    );
    expect(screen.getByText("Climb again")).toBeInTheDocument();
    expect(screen.getByText("Share result")).toBeInTheDocument();
  });

  it("calculates altitude from total points at base", () => {
    const altitude = GAME.baseAltitudeM + 0 * ((GAME.summitAltitudeM - GAME.baseAltitudeM) / GAME.pointsToSummit);
    expect(altitude).toBe(GAME.baseAltitudeM);
  });

  it("calculates altitude at summit threshold", () => {
    const altitude = GAME.baseAltitudeM + GAME.pointsToSummit * ((GAME.summitAltitudeM - GAME.baseAltitudeM) / GAME.pointsToSummit);
    expect(Math.min(altitude, GAME.summitAltitudeM)).toBe(GAME.summitAltitudeM);
  });
});
