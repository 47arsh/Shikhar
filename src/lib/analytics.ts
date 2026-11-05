export interface AnalyticsEvent {
  name: string;
  properties?: Record<string, string | number | boolean>;
}

let initialized = false;

export function initAnalytics(): void {
  if (initialized || typeof window === "undefined") return;
  initialized = true;

  // In production, this would initialize Google Analytics, Plausible, etc.
  // For now, we log to console in development.
  if (process.env.NODE_ENV === "development") {
    console.log("[Analytics] Initialized");
  }
}

export function track(event: AnalyticsEvent): void {
  if (typeof window === "undefined") return;

  if (process.env.NODE_ENV === "development") {
    console.log("[Analytics]", event.name, event.properties);
  }

  // In production, send to analytics provider:
  // window.gtag?.("event", event.name, event.properties);
  // window.plausible?.(event.name, { props: event.properties });
}

export function trackPageView(path: string): void {
  track({ name: "page_view", properties: { path } });
}

export function trackAnswerSubmit(
  promptId: string,
  result: string,
  points: number,
  isJudged: boolean,
): void {
  track({
    name: "answer_submit",
    properties: { promptId, result, points, isJudged },
  });
}

export function trackClimbComplete(
  totalPoints: number,
  outcome: string,
  rounds: number,
): void {
  track({
    name: "climb_complete",
    properties: { totalPoints, outcome, rounds },
  });
}

export function trackFirstAscent(promptId: string, answer: string): void {
  track({
    name: "first_ascent",
    properties: { promptId, answer },
  });
}

export function trackSkip(round: number): void {
  track({ name: "skip", properties: { round } });
}
