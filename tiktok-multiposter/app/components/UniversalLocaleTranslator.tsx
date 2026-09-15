"use client";

import { useEffect, useRef } from "react";

type Lang = "es" | "en" | "pt" | "ar" | "fr" | "de" | "it" | "nl" | "ja";
const supported = new Set<Lang>(["es","en","pt","ar","fr","de","it","nl","ja"]);
const translatedCache = new Map<string,string>();
const pending = new Map<string, Set<(value:string)=>void>>();
let timer: ReturnType<typeof setTimeout> | null = null;

function language(): Lang {
  try {
    const value = (localStorage.getItem("vyral-lang") || "es") as Lang;
    return supported.has(value) ? value : "es";
  } catch { return "es"; }
}

function shouldTranslate(value:string) {
  const s = value.trim();
  if (!s || s.length < 2) return false;
  if (/^(VYRAL|TikTok|Instagram|Facebook|Tobias Carrizo|ONLINE|TOP 5|VYRAL AI)$/i.test(s)) return false;
  if (/^[\d\s.,:%+\-/$€£¥→↗←⌄✓✦∞·|()]+$/.test(s)) return false;
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)) return false;
  if (/^https?:\/\//i.test(s)) return false;
  return /[A-Za-zÀ-ÿ\u0600-\u06ff\u3040-\u30ff\u3400-\u9fff]/.test(s);
}

async function flush(lang:Lang) {
  timer = null;
  const keys = Array.from(pending.keys()).filter(k => k.startsWith(`${lang}\u0000`)).slice(0,50);
  if (!keys.length) return;
  const texts = keys.map(k => k.slice(k.indexOf("\u0000") + 1));
  try {
    const r = await fetch("/api/translate", { method:"POST", headers:{"content-type":"application/json"}, body:JSON.stringify({target:lang,texts}) });
    if (!r.ok) throw new Error("translation request failed");
    const data = await r.json();
    const values:string[] = Array.isArray(data?.translations) ? data.translations : texts;
    keys.forEach((key,i) => {
      const value = String(values[i] ?? texts[i]);
      translatedCache.set(key,value);
      const callbacks = pending.get(key);
      pending.delete(key);
      callbacks?.forEach(cb => cb(value));
    });
  } catch {
    keys.forEach((key,i) => {
      const callbacks = pending.get(key);
      pending.delete(key);
      callbacks?.forEach(cb => cb(texts[i]));
    });
  }
  if (pending.size) timer = setTimeout(() => flush(lang), 80);
}

function requestTranslation(value:string, lang:Lang, cb:(value:string)=>void) {
  const key = `${lang}\u0000${value}`;
  const cached = translatedCache.get(key);
  if (cached !== undefined) { cb(cached); return; }
  const set = pending.get(key) || new Set<(value:string)=>void>();
  set.add(cb); pending.set(key,set);
  if (!timer) timer = setTimeout(() => flush(lang), 40);
}

export default function UniversalLocaleTranslator() {
  const originals = useRef(new WeakMap<Node,string>());
  const attrOriginals = useRef(new WeakMap<Element,Map<string,string>>());
  const applying = useRef(false);

  useEffect(() => {
    const lang = language();
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
    if (lang === "es") return;

    const translateText = (node:Text) => {
      const parent = node.parentElement;
      if (!parent || parent.closest(".vyralLocaleDock") || ["SCRIPT","STYLE","TEXTAREA","CODE","PRE"].includes(parent.tagName)) return;
      const current = node.nodeValue || "";
      if (!shouldTranslate(current)) return;
      if (!originals.current.has(node)) originals.current.set(node,current);
      const source = originals.current.get(node) || current;
      requestTranslation(source,lang,(translated) => {
        if (!node.isConnected || translated === (node.nodeValue || "")) return;
        applying.current = true;
        const lead = source.match(/^\s*/)?.[0] || "";
        const trail = source.match(/\s*$/)?.[0] || "";
        node.nodeValue = lead + translated.trim() + trail;
        applying.current = false;
      });
    };

    const translateAttrs = (el:Element) => {
      if (el.closest(".vyralLocaleDock")) return;
      for (const attr of ["placeholder","aria-label","title"]) {
        const current = el.getAttribute(attr);
        if (!current || !shouldTranslate(current)) continue;
        let map = attrOriginals.current.get(el);
        if (!map) { map = new Map(); attrOriginals.current.set(el,map); }
        if (!map.has(attr)) map.set(attr,current);
        const source = map.get(attr) || current;
        requestTranslation(source,lang,(translated) => {
          if (!el.isConnected) return;
          applying.current = true; el.setAttribute(attr,translated); applying.current = false;
        });
      }
    };

    const scan = (root:Node) => {
      if (root.nodeType === Node.TEXT_NODE) { translateText(root as Text); return; }
      if (!(root instanceof Element) && root !== document.body) return;
      const walker = document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
      let n = walker.nextNode() as Text | null;
      while (n) { translateText(n); n = walker.nextNode() as Text | null; }
      if (root instanceof Element) translateAttrs(root);
      const base = root instanceof Element ? root : document.body;
      base.querySelectorAll("[placeholder],[aria-label],[title]").forEach(translateAttrs);
    };

    const initial = setTimeout(() => scan(document.body), 250);
    const observer = new MutationObserver((records) => {
      if (applying.current) return;
      for (const record of records) {
        if (record.type === "characterData") scan(record.target);
        record.addedNodes.forEach(scan);
      }
    });
    observer.observe(document.body,{childList:true,subtree:true,characterData:true});
    return () => { clearTimeout(initial); observer.disconnect(); };
  },[]);

  return null;
}
