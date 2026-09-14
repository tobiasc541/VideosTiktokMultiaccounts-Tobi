"use client";

import { useState } from "react";

const FAQS = [
  { q: "¿Cómo conecto una cuenta de TikTok?", a: "Entrá a Cuentas o tocá + Conectar TikTok. TikTok te va a pedir autorización y, cuando termine, la cuenta vuelve automáticamente a tu panel VYRAL.", keys:["conectar","cuenta","tiktok"] },
  { q: "¿Cuántos videos puedo publicar?", a: "Inicio incluye 50 videos por mes, Crecimiento 200 y Escala 1.000. Un video cargado consume 1 crédito aunque lo distribuyas a varias cuentas.", keys:["videos","creditos","créditos","limite","límite"] },
  { q: "¿Cómo funciona la publicación multicuentas?", a: "Subís un solo video, elegís las cuentas destino, definís descripción y privacidad y VYRAL distribuye la publicación desde un único flujo.", keys:["publicar","multicuenta","varias","distribuir"] },
  { q: "¿Cómo cancelo mi plan?", a: "Entrá en Mi Plan y tocá Solicitar cancelación. La solicitud llega al soporte y, cuando sea aprobada, conservás acceso hasta la fecha final de tu período.", keys:["cancelar","cancelación","cancelacion","plan"] },
  { q: "¿Cuándo se renuevan mis créditos?", a: "Los créditos se renuevan mensualmente con tu ciclo de plan. En Mi Plan podés ver consumo, saldo restante y estado de la suscripción.", keys:["renuevan","mes","saldo","restantes"] },
  { q: "¿Qué incluye Soporte 24/7?", a: "Podés abrir una consulta desde VYRAL, seguir la conversación en vivo y recibir las respuestas del equipo sin salir de tu cuenta.", keys:["soporte","agente","ayuda"] }
];

function answerFor(text: string) {
  const value = text.toLowerCase();
  let best = FAQS[0]; let score = 0;
  for (const faq of FAQS) {
    const hits = faq.keys.filter(k => value.includes(k)).length;
    if (hits > score) { score = hits; best = faq; }
  }
  return score ? best.a : "No encontré una respuesta suficientemente precisa para eso. Te conviene hablar con Soporte 24/7 para que un agente revise tu caso.";
}

export default function FaqAssistant() {
  const [question,setQuestion] = useState("");
  const [answer,setAnswer] = useState("Elegí una pregunta frecuente o escribí tu duda para recibir una respuesta inmediata.");
  return <div className="faqGrid">
    <section className="faqList"><small>PREGUNTAS FRECUENTES</small>{FAQS.map(f => <button key={f.q} onClick={() => { setQuestion(f.q); setAnswer(f.a); }}>{f.q}<span>↗</span></button>)}</section>
    <section className="faqAssistant"><div className="faqAiTop"><div><small>VYRAL HELP</small><strong>Asistente inmediato</strong></div><span>● ONLINE</span></div><div className="faqAnswer"><small>RESPUESTA</small><p>{answer}</p></div><form onSubmit={(e)=>{e.preventDefault(); if(question.trim()) setAnswer(answerFor(question));}}><input value={question} onChange={e=>setQuestion(e.target.value)} placeholder="Escribí tu pregunta…"/><button>Preguntar ↗</button></form><div className="faqEscalate"><span>¿Necesitás ayuda específica con tu cuenta?</span><a href="/soporte">Hablar con un agente →</a></div></section>
  </div>;
}
