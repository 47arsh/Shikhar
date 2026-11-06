import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { GameplayScreen } from "@/components/GameplayScreen";
import { GameProvider } from "@/context/GameContext";
import { startClimb, submitAnswer, skipRound } from "@/lib/api";
import { GAME } from "@/config/game";

vi.mock("@/lib/api", () => ({
  startClimb: vi.fn(),
  submitAnswer: vi.fn(),
  skipRound: vi.fn(),
  getResult: vi.fn(),
}));

const mockStartClimb = vi.mocked(startClimb);
const mockSubmitAnswer = vi.mocked(submitAnswer);
const mockSkipRound = vi.mocked(skipRound);

const mockPrompts = Array.from({ length: 10 }, (_, i) => ({
  round: i + 1,
  text: `Prompt ${i + 1}`,
  hint: null,
  category: "geography",
}));

function renderWithProvider(mode: "daily" | "free" = "free") {
  const utils = render(
    <GameProvider>
      <GameplayScreen mode={mode} />
    </GameProvider>
  );
  return utils;
}

beforeEach(() => {
  vi.resetAllMocks();
  mockStartClimb.mockResolvedValue({
    climbId: "c1",
    prompts: mockPrompts,
  });
  mockSubmitAnswer.mockResolvedValue({
    result: "matched",
    canonicalName: "Ganga",
    points: 90,
    tier: "Rare find",
    firstAscent: false,
    attemptsLeft: 5,
    totalPoints: 90,
    altitude: 3120,
    outcome: "in_progress",
    roundsCompleted: 1,
  });
  mockSkipRound.mockResolvedValue({
    result: "skipped",
    skipsLeft: 1,
    roundsCompleted: 1,
    outcome: "in_progress",
  });
});

describe("GameplayScreen round flow", () => {
  it("starts a climb when mounted with a mode", async () => {
    renderWithProvider("free");
    expect(mockStartClimb).toHaveBeenCalledWith("free");
  });

  it("shows loading state while climb is being created", () => {
    mockStartClimb.mockResolvedValueOnce(new Promise(() => {}) as never);
    renderWithProvider("free");
    expect(screen.getByText("Starting climb…")).toBeInTheDocument();
  });

  it("shows prompt and answer input after climb starts", async () => {
    renderWithProvider("free");
    await vi.waitFor(() => {
      expect(screen.getByText("Prompt 1")).toBeInTheDocument();
    });
    expect(screen.getByLabelText("Your answer")).toBeInTheDocument();
    expect(screen.getByText("Submit")).toBeInTheDocument();
  });

  it("submits answer and shows reveal", async () => {
    renderWithProvider("free");
    await vi.waitFor(() => {
      expect(screen.getByText("Prompt 1")).toBeInTheDocument();
    });
    const input = screen.getByLabelText("Your answer");
    fireEvent.change(input, { target: { value: "ganga" } });
    fireEvent.click(screen.getByText("Submit"));
    await vi.waitFor(() => {
      expect(screen.getByText("Ganga")).toBeInTheDocument();
    });
    expect(mockSubmitAnswer).toHaveBeenCalledWith("c1", 1, "ganga");
  });

  it("advances to next round after successful answer", async () => {
    renderWithProvider("free");
    await vi.waitFor(() => {
      expect(screen.getByText("Prompt 1")).toBeInTheDocument();
    });
    fireEvent.change(screen.getByLabelText("Your answer"), { target: { value: "ganga" } });
    fireEvent.click(screen.getByText("Submit"));
    await vi.waitFor(() => {
      expect(screen.getByText("Ganga")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText("Next round"));
    await vi.waitFor(() => {
      expect(screen.getByText("Prompt 2")).toBeInTheDocument();
    });
  });

  it("shows result screen when climb is finished", async () => {
    mockSubmitAnswer.mockResolvedValueOnce({
      result: "matched",
      canonicalName: "Ganga",
      points: 600,
      tier: "Rare find",
      firstAscent: false,
      attemptsLeft: 5,
      totalPoints: 600,
      altitude: GAME.summitAltitudeM,
      outcome: "summited",
      roundsCompleted: 10,
    });

    renderWithProvider("free");
    await vi.waitFor(() => {
      expect(screen.getByText("Prompt 1")).toBeInTheDocument();
    });
    fireEvent.change(screen.getByLabelText("Your answer"), { target: { value: "ganga" } });
    fireEvent.click(screen.getByText("Submit"));
    await vi.waitFor(() => {
      expect(screen.getByText("Summited!")).toBeInTheDocument();
    });
  });

  it("shows skip button and skips a round", async () => {
    renderWithProvider("free");
    await vi.waitFor(() => {
      expect(screen.getByText("Prompt 1")).toBeInTheDocument();
    });
    expect(screen.getByText(/Skip round \(2 left\)/)).toBeInTheDocument();
    fireEvent.click(screen.getByText(/Skip round \(2 left\)/));
    await vi.waitFor(() => {
      expect(mockSkipRound).toHaveBeenCalledWith("c1", 1);
    });
  });

  it("shows error state when start fails", async () => {
    mockStartClimb.mockRejectedValueOnce(new Error("Failed to start"));
    renderWithProvider("free");
    await vi.waitFor(() => {
      expect(screen.getByText(/Failed to start/)).toBeInTheDocument();
    });
  });

  it("restarts climb without stale data", async () => {
    renderWithProvider("free");
    await vi.waitFor(() => {
      expect(screen.getByText("Prompt 1")).toBeInTheDocument();
    });
    fireEvent.change(screen.getByLabelText("Your answer"), { target: { value: "ganga" } });
    fireEvent.click(screen.getByText("Submit"));
    await vi.waitFor(() => {
      expect(screen.getByText("Ganga")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText("Next round"));
    await vi.waitFor(() => {
      expect(screen.getByText("Prompt 2")).toBeInTheDocument();
    });
    // Answer should be cleared
    expect(screen.getByLabelText("Your answer")).toHaveValue("");
  });
});
