import { NextRequest, NextResponse } from "next/server";
import { getCustomerSession } from "../../../lib/auth";
import { supabaseAdmin } from "../../../lib/supabase-admin";

export const dynamic = "force-dynamic";

type AutomationRule = {
  id: string;
  name: string;
  enabled: boolean;
  platforms: ("instagram" | "facebook" | "tiktok")[];
  contentLabel?: string;
  triggerMode: "exact" | "contains" | "ai_intent";
  keywords: string[];
  excludeKeywords?: string[];
  publicReplyEnabled: boolean;
  publicReply: string;
  dmEnabled: boolean;
  dmMessage: string;
  dmLink?: string;
  aiEnabled: boolean;
  aiTone?: string;
  aiInstructions?: string;
  aiConfidence?: number;
  humanHandoff?: boolean;
  collectLead?: boolean;
  leadTag?: string;
  cooldownMinutes?: number;
  maxRepliesPerUser?: number;
  smartGuard?: boolean;
  conversionGoal?: "link_click" | "dm_started" | "lead" | "none";
  createdAt: string;
  updatedAt: string;
};

async function loadUser() {
  const session = await getCustomerSession();
  if (!session) return null;
  const client = supabaseAdmin();
  const { data } = await client.auth.admin.getUserById(session.userId);
  if (!data.user) return null;
  return { session, client, user: data.user };
}

function sanitizeRule(input: any, existing?: AutomationRule): AutomationRule {
  const now = new Date().toISOString();
  const allowedPlatforms = new Set(["instagram", "facebook", "tiktok"]);
  const platforms = Array.isArray(input.platforms)
    ? input.platforms.filter((x: string) => allowedPlatforms.has(x)).slice(0, 3)
    : ["instagram", "facebook"];
  const triggerMode = ["exact", "contains", "ai_intent"].includes(input.triggerMode)
    ? input.triggerMode
    : "contains";
  const goal = ["link_click", "dm_started", "lead", "none"].includes(input.conversionGoal)
    ? input.conversionGoal
    : "dm_started";
  return {
    id: String(input.id || existing?.id || crypto.randomUUID()),
    name: String(input.name || existing?.name || "Nueva automatización").slice(0, 80),
    enabled: Boolean(input.enabled ?? existing?.enabled ?? true),
    platforms,
    contentLabel: String(input.contentLabel || "").slice(0, 160),
    triggerMode,
    keywords: (Array.isArray(input.keywords) ? input.keywords : [])
      .map((x: unknown) => String(x).trim().toLowerCase())
      .filter(Boolean)
      .slice(0, 30),
    excludeKeywords: (Array.isArray(input.excludeKeywords) ? input.excludeKeywords : [])
      .map((x: unknown) => String(x).trim().toLowerCase())
      .filter(Boolean)
      .slice(0, 30),
    publicReplyEnabled: Boolean(input.publicReplyEnabled),
    publicReply: String(input.publicReply || "").slice(0, 500),
    dmEnabled: Boolean(input.dmEnabled ?? true),
    dmMessage: String(input.dmMessage || "").slice(0, 2000),
    dmLink: String(input.dmLink || "").slice(0, 1000),
    aiEnabled: Boolean(input.aiEnabled),
    aiTone: String(input.aiTone || "Profesional y cercano").slice(0, 100),
    aiInstructions: String(input.aiInstructions || "").slice(0, 1500),
    aiConfidence: Math.max(0.5, Math.min(0.99, Number(input.aiConfidence || 0.78))),
    humanHandoff: Boolean(input.humanHandoff ?? true),
    collectLead: Boolean(input.collectLead),
    leadTag: String(input.leadTag || "").slice(0, 80),
    cooldownMinutes: Math.max(0, Math.min(10080, Number(input.cooldownMinutes || 60))),
    maxRepliesPerUser: Math.max(1, Math.min(10, Number(input.maxRepliesPerUser || 1))),
    smartGuard: Boolean(input.smartGuard ?? true),
    conversionGoal: goal,
    createdAt: existing?.createdAt || now,
    updatedAt: now
  };
}

export async function GET() {
  const ctx = await loadUser();
  if (!ctx) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const meta = ctx.user.user_metadata || {};
  return NextResponse.json({ automations: Array.isArray(meta.vyral_automations) ? meta.vyral_automations : [] });
}

export async function POST(req: NextRequest) {
  const ctx = await loadUser();
  if (!ctx) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const meta = ctx.user.user_metadata || {};
  const current: AutomationRule[] = Array.isArray(meta.vyral_automations) ? meta.vyral_automations : [];
  const existing = body.id ? current.find((x) => x.id === String(body.id)) : undefined;
  const rule = sanitizeRule(body, existing);
  if (!rule.keywords.length && rule.triggerMode !== "ai_intent") {
    return NextResponse.json({ error: "Agregá al menos una palabra clave." }, { status: 400 });
  }
  if (!rule.dmEnabled && !rule.publicReplyEnabled) {
    return NextResponse.json({ error: "Activá al menos una acción: respuesta pública o mensaje privado." }, { status: 400 });
  }
  const next = existing
    ? current.map((x) => x.id === rule.id ? rule : x)
    : [rule, ...current].slice(0, 50);
  await ctx.client.auth.admin.updateUserById(ctx.session.userId, {
    user_metadata: { ...meta, vyral_automations: next }
  });
  return NextResponse.json({ ok: true, automation: rule, automations: next });
}

export async function DELETE(req: NextRequest) {
  const ctx = await loadUser();
  if (!ctx) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Falta id" }, { status: 400 });
  const meta = ctx.user.user_metadata || {};
  const current: AutomationRule[] = Array.isArray(meta.vyral_automations) ? meta.vyral_automations : [];
  const next = current.filter((x) => x.id !== id);
  await ctx.client.auth.admin.updateUserById(ctx.session.userId, {
    user_metadata: { ...meta, vyral_automations: next }
  });
  return NextResponse.json({ ok: true, automations: next });
}
