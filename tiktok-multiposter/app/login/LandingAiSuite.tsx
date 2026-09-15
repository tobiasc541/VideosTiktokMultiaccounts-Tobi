import Link from "next/link";
import "./landing-ai-suite.css";

const aiTools=[
 {icon:"◈",title:"¿Qué publico hoy?",text:"Ideas concretas según tu negocio, objetivo y contexto de marca."},
 {icon:"✎",title:"Guionista IA",text:"Convierte una idea en un guion claro, natural y listo para grabar."},
 {icon:"⚡",title:"Generador de hooks",text:"Crea aperturas diseñadas para captar atención desde el primer segundo."},
 {icon:"↻",title:"Reutilizador viral",text:"Toma una idea que funcionó y encuentra nuevos ángulos para volver a explotarla."},
 {icon:"▦",title:"Calendario IA",text:"Organiza qué publicar y cuándo con un plan simple, accionable y consistente."},
 {icon:"◇",title:"Asistente de comentarios",text:"Interpreta preguntas, objeciones e intención de compra para ayudarte a responder mejor."}
];

const platform=[
 ["PUBLICACIÓN","Ahora o programada","Publicá al instante o dejá el contenido en cola para que VYRAL lo ejecute cuando llegue el momento."],
 ["ANÁLISIS IA","Antes de publicar","Analiza el contenido y propone caption, hashtags, hook, CTA, fortalezas y mejoras."],
 ["MEMORIA DE MARCA","Tu negocio aprendido","Guardá público, oferta, tono, objetivos y CTA una vez para que la IA trabaje con contexto real."],
 ["HISTORIAL","Todo registrado","Seguí publicaciones, estados, errores y contenido programado desde el mismo sistema."],
 ["ANALYTICS","Decisiones con datos","Leé rendimiento, compará cuentas y detectá qué contenido merece una segunda versión."],
 ["MULTICUENTA","Un video, múltiples destinos","Centralizá la distribución y evitá repetir manualmente la misma carga cuenta por cuenta."]
];

export default function LandingAiSuite(){return <section className="laiSection">
 <div className="laiAura a"/><div className="laiAura b"/><div className="laiGrid"/>
 <div className="laiHead"><div><span className="laiEyebrow">11 / GROWTH STUDIO · EXCLUSIVO ESCALA</span><h2>Tu contenido ya no empieza<br/><em>desde una hoja en blanco.</em></h2></div><p>VYRAL une estrategia, creación, análisis, distribución y aprendizaje en un solo recorrido. La IA entiende tu negocio, convierte ideas en acciones y te ayuda a decidir qué hacer después.</p></div>
 <div className="laiFlow"><div className="laiCore"><small>VYRAL GROWTH AI</small><strong>IDEA</strong><i>→</i><strong>ESTRATEGIA</strong><i>→</i><strong>CONTENIDO</strong><i>→</i><strong>CRECIMIENTO</strong><span>✦ CONTEXTO DE TU MARCA ACTIVO</span></div><div className="laiPulse"/></div>
 <div className="laiTools">{aiTools.map((t,i)=><article key={t.title}><div className="laiToolTop"><span>{t.icon}</span><b>{String(i+1).padStart(2,"0")}</b></div><h3>{t.title}</h3><p>{t.text}</p><small>GROWTH AI ↗</small></article>)}</div>
 <div className="laiIntelligence"><div className="laiIntCopy"><span>INTELIGENCIA APLICADA AL CONTENIDO</span><h3>No sólo genera.<br/><em>Te dice por qué y qué mejorar.</em></h3><p>Antes de publicar, VYRAL puede leer una pieza y devolverte una evaluación accionable: puntuación de potencial, caption sugerido, hashtags, hook, CTA, fortalezas, mejoras y recomendaciones por plataforma.</p><div className="laiChips"><b>Viral Score</b><b>Caption</b><b>Hashtags</b><b>Hook</b><b>CTA</b><b>Fortalezas</b><b>Mejoras</b><b>Tips por red</b></div></div><div className="laiScoreCard"><div><small>CONTENT SIGNAL</small><span>AI ANALYSIS</span></div><strong>87<em>/100</em></strong><p>Hook claro · propuesta visible · CTA mejorable</p><hr/><b>PRÓXIMA ACCIÓN</b><h4>Acortá la apertura y llevá el beneficio al primer segundo.</h4></div></div>
 <div className="laiPlatformHead"><span>TODO CONECTADO</span><h3>De la idea a la publicación.<br/><em>Y de los datos a la próxima idea.</em></h3></div>
 <div className="laiPlatform">{platform.map(([tag,title,text],i)=><article key={tag}><span>{String(i+1).padStart(2,"0")}</span><div><small>{tag}</small><h4>{title}</h4><p>{text}</p></div></article>)}</div>
 <div className="laiMemory"><div className="laiMemoryIcon">✦</div><div><small>MI NEGOCIO · MEMORIA DE MARCA</small><h3>Explicalo una vez. Aprovechalo en cada generación.</h3><p>Growth Studio conserva el contexto que definís para que las ideas, guiones, hooks y calendarios nazcan alineados a tu marca en lugar de responder como una IA genérica.</p></div><div className="laiMemoryStatus"><i/> CONTEXTO LISTO</div></div>
 <div className="laiFinal"><div><small>UN SISTEMA. UNA MEMORIA. SEIS HERRAMIENTAS DE IA.</small><h3>Menos improvisación.<br/><em>Más intención en cada publicación.</em></h3></div><Link href="/registro">Entrar a VYRAL <span>↗</span></Link></div>
 </section>}
