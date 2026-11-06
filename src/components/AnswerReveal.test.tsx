import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AnswerReveal } from "@/components/AnswerReveal";
import { GameProvider } from "@/context/GameContext";

const baseResult = {
  result: "matched",
  canonicalName: "Ganga",
  points: 90,
  tier: "Rare find",
  firstAscent: false,
  attemptsLeft: 5,
  totalPoints: 90,
};

function renderReveal(props: Parameters<typeof AnswerReveal>[0]) {
  return render(
    <GameProvider>
      <AnswerReveal {...props} />
    </GameProvider>
  );
}

describe("AnswerReveal", () => {
  it("shows canonical answer, points, and tier for a valid answer", () => {
    renderReveal({
      result: baseResult,
      attemptsLeft: 5,
      skipsLeft: 2,
      onNext: vi.fn(),
      onSkip: vi.fn(),
      finished: false,
    });
    expect(screen.getByText("Ganga")).toBeInTheDocument();
    expect(screen.getByText("+90")).toBeInTheDocument();
    expect(screen.getByText("Rare find")).toBeInTheDocument();
  });

  it("shows First ascent badge when firstAscent is true", () => {
    renderReveal({
      result: { ...baseResult, firstAscent: true },
      attemptsLeft: 5,
      skipsLeft: 2,
      onNext: vi.fn(),
      onSkip: vi.fn(),
      finished: false,
    });
    expect(screen.getByText("First ascent")).toBeInTheDocument();
  });

  it("shows Next round button for successful non-finished answer", () => {
    const onNext = vi.fn();
    renderReveal({
      result: baseResult,
      attemptsLeft: 5,
      skipsLeft: 2,
      onNext,
      onSkip: vi.fn(),
      finished: false,
    });
    expect(screen.getByText("Next round")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Next round"));
    expect(onNext).toHaveBeenCalled();
  });

  it("shows See results button when climb is finished", () => {
    const onNext = vi.fn();
    renderReveal({
      result: { ...baseResult, outcome: "summited" },
      attemptsLeft: 5,
      skipsLeft: 2,
      onNext,
      onSkip: vi.fn(),
      finished: true,
    });
    expect(screen.getByText("See results")).toBeInTheDocument();
    expect(screen.queryByText("Next round")).not.toBeInTheDocument();
    fireEvent.click(screen.getByText("See results"));
    expect(onNext).toHaveBeenCalled();
  });

  it("shows message and attempts left for invalid answer", () => {
    renderReveal({
      result: {
        ...baseResult,
        result: "invalid",
        message: "We couldn't verify that one. Try another answer or skip.",
        attemptsLeft: 3,
      },
      attemptsLeft: 3,
      skipsLeft: 2,
      onNext: vi.fn(),
      onSkip: vi.fn(),
      finished: false,
    });
    expect(
      screen.getByText("We couldn't verify that one. Try another answer or skip.")
    ).toBeInTheDocument();
    expect(screen.getByText(/3 attempt/)).toBeInTheDocument();
  });

  it("shows Try again and Skip round buttons for failed non-finished answer", () => {
    const onSkip = vi.fn();
    renderReveal({
      result: {
        ...baseResult,
        result: "invalid",
        message: "We couldn't verify that one. Try another answer or skip.",
        attemptsLeft: 3,
      },
      attemptsLeft: 3,
      skipsLeft: 2,
      onNext: vi.fn(),
      onSkip,
      finished: false,
    });
    expect(screen.getByText("Try again")).toBeInTheDocument();
    expect(screen.getByText("Skip round (2 left)")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Skip round (2 left)"));
    expect(onSkip).toHaveBeenCalled();
  });

  it("hides Skip round button when no skips left", () => {
    renderReveal({
      result: {
        ...baseResult,
        result: "invalid",
        message: "We couldn't verify that one. Try another answer or skip.",
        attemptsLeft: 3,
      },
      attemptsLeft: 3,
      skipsLeft: 0,
      onNext: vi.fn(),
      onSkip: vi.fn(),
      finished: false,
    });
    expect(screen.queryByText(/Skip round/)).not.toBeInTheDocument();
    expect(screen.getByText("No skips remaining")).toBeInTheDocument();
  });

  it("disables Try again when no attempts left", () => {
    renderReveal({
      result: {
        ...baseResult,
        result: "invalid",
        message: "We couldn't verify that one. Try another answer or skip.",
        attemptsLeft: 0,
      },
      attemptsLeft: 0,
      skipsLeft: 0,
      onNext: vi.fn(),
      onSkip: vi.fn(),
      finished: false,
    });
    const tryAgain = screen.getByText("Try again");
    expect(tryAgain).toBeDisabled();
  });
});
