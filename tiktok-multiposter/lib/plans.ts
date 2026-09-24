export const PLAN_CONFIG = {
  inicio: { name: "Inicio", price: "US$ 4,99", accounts: 2, monthlyVideos: 50, analytics: false, advancedAnalytics: false, ai: false, aiReels: 0 },
  pro: { name: "Crecimiento", price: "US$ 9,99", accounts: 5, monthlyVideos: 200, analytics: true, advancedAnalytics: false, ai: true, aiReels: 0 },
  escala: { name: "Escala", price: "US$ 19,99", accounts: 30, monthlyVideos: 500, analytics: true, advancedAnalytics: true, ai: true, aiReels: 0 },
  ai: { name: "VYRAL AI", price: "US$ 99,99", accounts: 50, monthlyVideos: 500, analytics: true, advancedAnalytics: true, ai: true, aiReels: 10 }
} as const;

export type PlanId = keyof typeof PLAN_CONFIG;

export function isPlanId(value: unknown): value is PlanId {
  return typeof value === "string" && value in PLAN_CONFIG;
}

export function currentUsageMonth() {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}
