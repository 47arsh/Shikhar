import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MountainScene } from "@/components/MountainScene";
import { GAME } from "@/config/game";

describe("MountainScene", () => {
  it("renders with base altitude showing starting position", () => {
    render(<MountainScene altitude={GAME.baseAltitudeM} roundsCompleted={0} />);
    expect(screen.getByText(`${GAME.baseAltitudeM} m`)).toBeInTheDocument();
    expect(screen.getByText("Valley")).toBeInTheDocument();
  });

  it("renders summit altitude at the top", () => {
    render(<MountainScene altitude={GAME.summitAltitudeM} roundsCompleted={10} />);
    expect(screen.getByText(`${GAME.summitAltitudeM} m`)).toBeInTheDocument();
    expect(screen.getByText("Death zone")).toBeInTheDocument();
  });

  it("shows correct zone label for intermediate altitude", () => {
    render(<MountainScene altitude={4500} roundsCompleted={0} />);
    expect(screen.getByText("Alpine")).toBeInTheDocument();
  });

  it("shows prayer flags for completed rounds", () => {
    render(<MountainScene altitude={GAME.baseAltitudeM} roundsCompleted={3} />);
    const flags = document.querySelectorAll('[aria-label^="Round "]');
    expect(flags.length).toBe(10);
  });

  it("has accessible altitude label", () => {
    render(<MountainScene altitude={2000} roundsCompleted={0} />);
    const section = screen.getByRole("region");
    expect(section).toHaveAttribute("aria-label", expect.stringContaining("2000 meters"));
  });

  it("shows camp labels", () => {
    render(<MountainScene altitude={GAME.baseAltitudeM} roundsCompleted={0} />);
    expect(screen.getByText("Yuksom")).toBeInTheDocument();
    expect(screen.getByText("Summit")).toBeInTheDocument();
  });
});
