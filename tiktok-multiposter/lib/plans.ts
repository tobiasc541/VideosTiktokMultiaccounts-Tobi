export const PLAN_CONFIG = {
  inicio: { name: "Inicio", price: "US$ 1,99", accounts: 2, monthlyVideos: 50, analytics: false, advancedAnalytics: false, ai: false },
  pro: { name: "Crecimiento", price: "US$ 6,99", accounts: 5, monthlyVideos: 200, analytics: true, advancedAnalytics: false, ai: true },
  escala: { name: "Escala", price: "US$ 19,99", accounts: 30, monthlyVideos: 1000, analytics: true, advancedAnalytics: true, ai: true }
} as const;

export type PlanId = keyof typeof PLAN_CONFIG;

export function isPlanId(value: unknown): value is PlanId {
  return typeof value === "string" && value in PLAN_CONFIG;
}

export function currentUsageMonth() {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}
