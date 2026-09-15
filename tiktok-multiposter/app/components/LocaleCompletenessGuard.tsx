"use client";

import { useEffect, useRef } from "react";

type Lang = "es" | "en" | "pt" | "ar" | "fr" | "de" | "it" | "nl" | "ja";
type Entry = Record<Exclude<Lang, "es">, string>;

const P: Record<string, Entry> = {
  "cuentas conectadas": { en: "connected accounts", pt: "contas conectadas", ar: "حسابات متصلة", fr: "comptes connectés", de: "verbundene Konten", it: "account collegati", nl: "verbonden accounts", ja: "接続済みアカウント" },
  "actividades recientes": { en: "recent activities", pt: "atividades recentes", ar: "أنشطة حديثة", fr: "activités récentes", de: "letzte Aktivitäten", it: "attività recenti", nl: "recente activiteiten", ja: "最近のアクティビティ" },
  "vistas combinadas": { en: "combined views", pt: "visualizações combinadas", ar: "مشاهدات مجمعة", fr: "vues combinées", de: "kombinierte Aufrufe", it: "visualizzazioni combinate", nl: "gecombineerde weergaven", ja: "合計視聴回数" },
  "CRÉDITOS DE VIDEO": { en: "VIDEO CREDITS", pt: "CRÉDITOS DE VÍDEO", ar: "أرصدة الفيديو", fr: "CRÉDITS VIDÉO", de: "VIDEO-GUTHABEN", it: "CREDITI VIDEO", nl: "VIDEOCREDITS", ja: "動画クレジット" },
  "restantes": { en: "remaining", pt: "restantes", ar: "متبقية", fr: "restants", de: "verbleibend", it: "rimanenti", nl: "resterend", ja: "残り" },
  "usados este mes": { en: "used this month", pt: "usados este mês", ar: "مستخدمة هذا الشهر", fr: "utilisés ce mois-ci", de: "diesen Monat verwendet", it: "usati questo mese", nl: "deze maand gebruikt", ja: "今月使用" },
  "vs. período anterior": { en: "vs. previous period", pt: "vs. período anterior", ar: "مقارنة بالفترة السابقة", fr: "vs. période précédente", de: "vs. vorheriger Zeitraum", it: "vs. periodo precedente", nl: "vs. vorige periode", ja: "前期間比" },
  "Vs. mejor cuenta individual": { en: "Vs. best individual account", pt: "Vs. melhor conta individual", ar: "مقارنة بأفضل حساب فردي", fr: "Vs. meilleur compte individuel", de: "Vs. bestes Einzelkonto", it: "Vs. miglior account singolo", nl: "Vs. beste individuele account", ja: "最高の個別アカウント比" },
  "sobre vistas": { en: "of views", pt: "sobre visualizações", ar: "من المشاهدات", fr: "des vues", de: "der Aufrufe", it: "delle visualizzazioni", nl: "van de weergaven", ja: "視聴回数に対して" },
  "Ir a Publicar": { en: "Go to Publish", pt: "Ir para Publicar", ar: "الذهاب إلى النشر", fr: "Aller à Publier", de: "Zum Veröffentlichen", it: "Vai a Pubblica", nl: "Naar Publiceren", ja: "投稿へ" },
  "Ver Cuentas": { en: "View Accounts", pt: "Ver contas", ar: "عرض الحسابات", fr: "Voir les comptes", de: "Konten anzeigen", it: "Vedi account", nl: "Accounts bekijken", ja: "アカウントを見る" },
  "Ver Historial": { en: "View History", pt: "Ver histórico", ar: "عرض السجل", fr: "Voir l’historique", de: "Verlauf anzeigen", it: "Vedi cronologia", nl: "Geschiedenis bekijken", ja: "履歴を見る" },
  "Abrir Analytics": { en: "Open Analytics", pt: "Abrir análises", ar: "فتح التحليلات", fr: "Ouvrir Analytics", de: "Analytics öffnen", it: "Apri Analytics", nl: "Analytics openen", ja: "分析を開く" },
  "PUBLICAR": { en: "PUBLISH", pt: "PUBLICAR", ar: "النشر", fr: "PUBLIER", de: "VERÖFFENTLICHEN", it: "PUBBLICA", nl: "PUBLICEREN", ja: "投稿" },
  "HISTORIAL": { en: "HISTORY", pt: "HISTÓRICO", ar: "السجل", fr: "HISTORIQUE", de: "VERLAUF", it: "CRONOLOGIA", nl: "GESCHIEDENIS", ja: "履歴" },
  "RENDIMIENTO": { en: "PERFORMANCE", pt: "DESEMPENHO", ar: "الأداء", fr: "PERFORMANCE", de: "LEISTUNG", it: "PRESTAZIONI", nl: "PRESTATIES", ja: "パフォーマンス" },
  "EJEMPLO": { en: "EXAMPLE", pt: "EXEMPLO", ar: "مثال", fr: "EXEMPLE", de: "BEISPIEL", it: "ESEMPIO", nl: "VOORBEELD", ja: "例" },
  "DATOS DE EJEMPLO": { en: "EXAMPLE DATA", pt: "DADOS DE EXEMPLO", ar: "بيانات تجريبية", fr: "DONNÉES D’EXEMPLE", de: "BEISPIELDATEN", it: "DATI DI ESEMPIO", nl: "VOORBEELDGEGEVENS", ja: "サンプルデータ" },
  "Vistas": { en: "Views", pt: "Visualizações", ar: "المشاهدات", fr: "Vues", de: "Aufrufe", it: "Visualizzazioni", nl: "Weergaven", ja: "視聴回数" },
  "Seguidores": { en: "Followers", pt: "Seguidores", ar: "المتابعون", fr: "Abonnés", de: "Follower", it: "Follower", nl: "Volgers", ja: "フォロワー" },
  "Compartidos": { en: "Shares", pt: "Compartilhamentos", ar: "المشاركات", fr: "Partages", de: "Geteilt", it: "Condivisioni", nl: "Gedeeld", ja: "シェア" },
  "IMPACTO VYRAL": { en: "VYRAL IMPACT", pt: "IMPACTO VYRAL", ar: "تأثير VYRAL", fr: "IMPACT VYRAL", de: "VYRAL-WIRKUNG", it: "IMPATTO VYRAL", nl: "VYRAL-IMPACT", ja: "VYRALの効果" },
  "Distribución multicuentas": { en: "Multi-account distribution", pt: "Distribuição multicontas", ar: "توزيع متعدد الحسابات", fr: "Distribution multi-comptes", de: "Multi-Account-Verteilung", it: "Distribuzione multi-account", nl: "Multi-accountdistributie", ja: "複数アカウント配信" },
  "Mejor cuenta individual": { en: "Best individual account", pt: "Melhor conta individual", ar: "أفضل حساب فردي", fr: "Meilleur compte individuel", de: "Bestes Einzelkonto", it: "Miglior account singolo", nl: "Beste individuele account", ja: "最高の個別アカウント" },
  "Vistas adicionales": { en: "Additional views", pt: "Visualizações adicionais", ar: "مشاهدات إضافية", fr: "Vues supplémentaires", de: "Zusätzliche Aufrufe", it: "Visualizzazioni aggiuntive", nl: "Extra weergaven", ja: "追加視聴回数" },
  "Multiplicador": { en: "Multiplier", pt: "Multiplicador", ar: "المضاعف", fr: "Multiplicateur", de: "Multiplikator", it: "Moltiplicatore", nl: "Vermenigvuldiger", ja: "倍率" },
  "CUENTAS · EJEMPLO": { en: "ACCOUNTS · EXAMPLE", pt: "CONTAS · EXEMPLO", ar: "الحسابات · مثال", fr: "COMPTES · EXEMPLE", de: "KONTEN · BEISPIEL", it: "ACCOUNT · ESEMPIO", nl: "ACCOUNTS · VOORBEELD", ja: "アカウント · 例" },
  "Rendimiento por cuenta": { en: "Performance by account", pt: "Desempenho por conta", ar: "الأداء حسب الحساب", fr: "Performance par compte", de: "Leistung nach Konto", it: "Prestazioni per account", nl: "Prestaties per account", ja: "アカウント別パフォーマンス" },
  "Cuenta": { en: "Account", pt: "Conta", ar: "الحساب", fr: "Compte", de: "Konto", it: "Account", nl: "Account", ja: "アカウント" },
  "Me gusta": { en: "Likes", pt: "Curtidas", ar: "الإعجابات", fr: "J’aime", de: "Likes", it: "Mi piace", nl: "Likes", ja: "いいね" },
  "Comentarios": { en: "Comments", pt: "Comentários", ar: "التعليقات", fr: "Commentaires", de: "Kommentare", it: "Commenti", nl: "Reacties", ja: "コメント" },
  "API conectada": { en: "API connected", pt: "API conectada", ar: "API متصلة", fr: "API connectée", de: "API verbunden", it: "API collegata", nl: "API verbonden", ja: "API接続済み" },
  "PRÓX.": { en: "SOON", pt: "EM BREVE", ar: "قريباً", fr: "BIENTÔT", de: "BALD", it: "PRESTO", nl: "BINNENKORT", ja: "近日" },
  "Próximamente": { en: "Coming soon", pt: "Em breve", ar: "قريباً", fr: "Bientôt", de: "Demnächst", it: "Prossimamente", nl: "Binnenkort", ja: "近日公開" },
  "Conectada": { en: "Connected", pt: "Conectada", ar: "متصل", fr: "Connecté", de: "Verbunden", it: "Collegato", nl: "Verbonden", ja: "接続済み" },
  "Desconectar": { en: "Disconnect", pt: "Desconectar", ar: "قطع الاتصال", fr: "Déconnecter", de: "Trennen", it: "Disconnetti", nl: "Verbinding verbreken", ja: "切断" },
  "Cerrar": { en: "Close", pt: "Fechar", ar: "إغلاق", fr: "Fermer", de: "Schließen", it: "Chiudi", nl: "Sluiten", ja: "閉じる" }
};

const ordered = Object.entries(P).sort((a, b) => b[0].length - a[0].length);

function getLang(): Lang {
  try { return (localStorage.getItem("vyral-lang") || "es") as Lang; }
  catch { return "es"; }
}

function translate(value: string, lang: Lang) {
  if (lang === "es" || !value.trim()) return value;
  let out = value;
  for (const [source, targets] of ordered) {
    if (out.includes(source)) out = out.replaceAll(source, targets[lang]);
  }
  return out;
}

function translateTextNode(node: Text, lang: Lang) {
  const value = node.nodeValue || "";
  const next = translate(value, lang);
  if (next !== value) node.nodeValue = next;
}

function apply(root: Node, lang: Lang) {
  if (root.nodeType === Node.TEXT_NODE) {
    const text = root as Text;
    const parent = text.parentElement;
    if (parent && !parent.closest(".vyralLocaleDock") && !["SCRIPT", "STYLE"].includes(parent.tagName)) {
      translateTextNode(text, lang);
    }
    return;
  }

  if (!(root instanceof Element) && root !== document.body) return;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node = walker.nextNode() as Text | null;
  while (node) {
    const parent = node.parentElement;
    if (parent && !parent.closest(".vyralLocaleDock") && !["SCRIPT", "STYLE", "TEXTAREA"].includes(parent.tagName)) {
      translateTextNode(node, lang);
    }
    node = walker.nextNode() as Text | null;
  }

  const elements = root instanceof Element
    ? [root, ...Array.from(root.querySelectorAll<HTMLElement>("[placeholder],[aria-label],[title]"))]
    : Array.from(document.querySelectorAll<HTMLElement>("[placeholder],[aria-label],[title]"));

  for (const el of elements as HTMLElement[]) {
    if (el.closest(".vyralLocaleDock")) continue;
    for (const attr of ["placeholder", "aria-label", "title"]) {
      const value = el.getAttribute(attr);
      if (!value) continue;
      const next = translate(value, lang);
      if (next !== value) el.setAttribute(attr, next);
    }
  }
}

export default function LocaleCompletenessGuard() {
  const applying = useRef(false);

  useEffect(() => {
    const run = (root: Node = document.body) => {
      if (applying.current) return;
      applying.current = true;
      const lang = getLang();
      apply(root, lang);
      applying.current = false;
    };

    run();
    const observer = new MutationObserver((mutations) => {
      if (applying.current) return;
      for (const mutation of mutations) {
        if (mutation.type === "characterData") run(mutation.target);
        mutation.addedNodes.forEach((node) => run(node));
      }
    });
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });

    return () => observer.disconnect();
  }, []);

  return null;
}
