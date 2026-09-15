import { NextResponse } from "next/server";

const allowed = new Set(["es", "en", "pt", "ar", "fr", "de", "it", "nl", "ja"]);
const cache = new Map<string, string>();

async function googleTranslate(text: string, target: string) {
  const key = `${target}:${text}`;
  const hit = cache.get(key);
  if (hit !== undefined) return hit;

  const params = new URLSearchParams({ client: "gtx", sl: "auto", tl: target, dt: "t", q: text });
  const response = await fetch("https://translate.googleapis.com/translate_a/single", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded;charset=UTF-8" },
    body: params.toString(),
    cache: "no-store"
  });
  if (!response.ok) throw new Error(`translate_${response.status}`);
  const data = await response.json();
  const translated = Array.isArray(data?.[0])
    ? data[0].map((part: unknown) => Array.isArray(part) ? String(part[0] || "") : "").join("")
    : text;
  cache.set(key, translated || text);
  if (cache.size > 4000) {
    const first = cache.keys().next().value;
    if (first) cache.delete(first);
  }
  return translated || text;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const target = String(body?.target || "es").toLowerCase();
    const texts = Array.isArray(body?.texts) ? body.texts : [];
    if (!allowed.has(target)) return NextResponse.json({ error: "unsupported_language" }, { status: 400 });
    if (target === "es") return NextResponse.json({ translations: texts.map((x: unknown) => String(x || "")) });

    const clean = texts.slice(0, 50).map((x: unknown) => String(x || "").slice(0, 2500));
    const translations = await Promise.all(clean.map(async (text: string) => {
      if (!text.trim()) return text;
      try { return await googleTranslate(text, target); }
      catch { return text; }
    }));
    return NextResponse.json({ translations });
  } catch {
    return NextResponse.json({ error: "translation_failed" }, { status: 500 });
  }
}
