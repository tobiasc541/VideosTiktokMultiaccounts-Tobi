import { NextResponse } from "next/server";
import { getCustomerSession } from "../../../../lib/auth";
import { recordAiUsage } from "../../../../lib/ai-usage";

export const maxDuration = 60;

type Message = { role: "user" | "assistant"; text: string };

function extractText(data: any) {
  if (typeof data?.output_text === "string") return data.output_text;
  for (const item of data?.output || []) for (const c of item?.content || []) if (c?.type === "output_text" && c?.text) return c.text;
  return "";
}

function cleanJson(text: string) {
  const a = text.indexOf("{"); const b = text.lastIndexOf("}");
  if (a < 0 || b < a) throw new Error("VYRAL Agent devolvió una respuesta inválida.");
  return JSON.parse(text.slice(a, b + 1));
}

export async function POST(req: Request) {
  const session = await getCustomerSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const key = process.env.OPENAI_API_KEY;
  if (!key) return NextResponse.json({ error: "OPENAI_API_KEY no está configurada." }, { status: 503 });

  try {
    const body = await req.json();
    const automation = body.automation || {};
    const businessContext = String(body.businessContext || "").slice(0, 8000);
    const publicationContext = String(body.publicationContext || "").slice(0, 4000);
    const username = String(body.username || "").slice(0, 100);
    const incoming = String(body.incoming || "").slice(0, 2500);
    const history: Message[] = Array.isArray(body.history) ? body.history.slice(-20).map((m: any) => ({ role: m.role === "assistant" ? "assistant" : "user", text: String(m.text || "").slice(0, 2500) })) : [];
    if (!incoming) return NextResponse.json({ error: "Falta el mensaje entrante." }, { status: 400 });

    const goal = String(automation.conversationGoal || automation.conversionGoal || "lead");
    const tone = String(automation.aiTone || "Profesional y cercano");
    const instructions = String(automation.aiInstructions || "").slice(0, 3000);
    const model = "gpt-5.6-luna";
    const prompt = `Sos VYRAL Sales Agent, asistente automatizado de una marca. Tu trabajo es conversar de forma natural, útil y breve sin fingir ser una persona.\nOBJETIVO: ${goal}.\nTONO: ${tone}.\nUSUARIO DISPONIBLE: ${username || "desconocido"}. Usá su nombre/usuario solo si aporta naturalidad y nunca inventes identidad.\nCONTEXTO DEL NEGOCIO: ${businessContext || "No provisto"}.\nCONTEXTO DE LA PUBLICACIÓN: ${publicationContext || "No provisto"}.\nINSTRUCCIONES: ${instructions || "Ayudá, calificá intención y avanzá hacia el objetivo sin presionar."}\nHISTORIAL: ${JSON.stringify(history)}\nMENSAJE NUEVO: ${incoming}\n\nClasificá intención e interés y elegí el siguiente mejor paso. Si faltan datos, preguntá una sola cosa por vez. Si hay intención alta, acercá el CTA configurado. Si el usuario está molesto, pide humano, hay una negociación especial o no tenés certeza factual, marcá handoff=true. No inventes precios, stock, políticas ni datos. No digas que sos humano.\nDevolvé SOLO JSON válido: {"reply":"texto listo para enviar","leadStage":"new|curious|qualified|hot|converted|support","intent":"string breve","confidence":0.0,"handoff":false,"goalReached":false,"suggestedAction":"reply|send_link|send_resource|request_whatsapp|handoff|close","usePersonalization":true,"reason":"explicación interna breve"}.`;

    const r = await fetch("https://api.openai.com/v1/responses", { method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" }, body: JSON.stringify({ model, input: [{ role: "user", content: [{ type: "input_text", text: prompt }] }], max_output_tokens: 900 }) });
    const data = await r.json();
    if (!r.ok) throw new Error(data?.error?.message || "No se pudo ejecutar VYRAL Sales Agent.");
    await recordAiUsage(session.userId, "automation-agent", model, data.usage || {});
    return NextResponse.json({ ok: true, result: cleanJson(extractText(data)) });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "No se pudo ejecutar el agente." }, { status: 500 });
  }
}
