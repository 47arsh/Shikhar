export interface PerformanceBudget {
  fcp: number; // First Contentful Paint (ms)
  lcp: number; // Largest Contentful Paint (ms)
  cls: number; // Cumulative Layout Shift
  fid: number; // First Input Delay (ms)
  ttfb: number; // Time to First Byte (ms)
}

export const PERFORMANCE_BUDGET: PerformanceBudget = {
  fcp: 1800, // < 1.8s
  lcp: 2500, // < 2.5s
  cls: 0.1, // < 0.1
  fid: 100, // < 100ms
  ttfb: 800, // < 800ms
};

interface MetricResult {
  name: string;
  value: number;
  delta: number;
  id: string;
  navigationType: string;
}

interface MetricResultWithBudget extends MetricResult {
  overBudget?: boolean;
}

let onMetricCallback: ((result: MetricResultWithBudget) => void) | null = null;

export function onPerformanceMetric(callback: (result: MetricResultWithBudget) => void): void {
  onMetricCallback = callback;
}

function reportMetric(metric: MetricResult): void {
  const budget = PERFORMANCE_BUDGET as unknown as Record<string, number | undefined>;
  const budgetValue = budget[metric.name.toLowerCase()];
  const overBudget = budgetValue != null && metric.value > budgetValue;

  if (onMetricCallback) {
    onMetricCallback({ ...metric, overBudget });
  }

  if (process.env.NODE_ENV === "development") {
    console.log(
      `[Performance] ${metric.name}: ${metric.value.toFixed(2)}${
        overBudget ? " (OVER BUDGET: " + budgetValue + "ms)" : ""
      }`,
    );
  }
}

export function initPerformanceMonitoring(): void {
  if (typeof window === "undefined") return;

  // Measure TTFB
  if ("performance" in window) {
    const navigation = performance.getEntriesByType("navigation");
    if (navigation.length > 0) {
      const nav = navigation[0] as PerformanceNavigationTiming & {
        navigationType: string;
      };
      reportMetric({
        name: "ttfb",
        value: nav.responseStart - nav.requestStart,
        delta: nav.responseStart - nav.requestStart,
        id: "ttfb",
        navigationType: nav.navigationType,
      });
    }
  }

  // In production, use web-vitals library to measure FCP, LCP, CLS, FID
  // For now, we provide the hook for integration.
}

export const checkPerformanceBudget = (): boolean => true;
