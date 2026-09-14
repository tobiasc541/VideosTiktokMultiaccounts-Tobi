import Link from "next/link";

const plans=[
 {name:"Inicio",price:"US$ 1,99",tag:"OPERACIÓN",items:["2 cuentas","50 videos / mes","Publicación multicuentas","Historial","Soporte 24/7"],off:["Analytics","VYRAL AI"]},
 {name:"Crecimiento",price:"US$ 6,99",tag:"CRECIMIENTO",items:["5 cuentas","200 videos / mes","Top 5 contenido","Analytics por red y período","Comparativas por cuenta","VYRAL AI","Soporte 24/7"],off:[]},
 {name:"Escala",price:"US$ 19,99",tag:"INTELLIGENCE",items:["30 cuentas","1.000 videos / mes","Todo Crecimiento","Viral Momentum Score","Content Intelligence","Recomendaciones accionables","Predicción de crecimiento","Patrones de captions y formatos"],off:[]}
];

export default function LandingExpansion(){
 return <div className="vyralLandingNext">
   <section className="nextSignal"><span>VYRAL / 2026</span><p>Distribución · Analytics · Intelligence · Creator Program · Soporte 24/7</p><i>LIVE SYSTEM</i></section>

   <section className="nextSection nextOS">
     <div className="nextIndex">06 / OPERATING SYSTEM</div>
     <div className="nextSplit"><div><small>TODO TU CRECIMIENTO EN UN SOLO LUGAR</small><h2>No es otro panel.<br/><em>Es tu sistema operativo de contenido.</em></h2><p>Publicá, medí, detectá patrones, administrá tu plan, hablá con soporte y convertí resultados en próximas acciones sin salir de VYRAL.</p></div><div className="nextConsole"><div className="nextConsoleTop"><span>VYRAL CORE</span><b>ONLINE</b></div><div className="nextConsoleGrid"><article><small>DISTRIBUCIÓN</small><strong>1 → N</strong><i>Multicuenta</i></article><article><small>CONTENIDO</small><strong>TOP 5</strong><i>Ranking viral</i></article><article><small>ANALYTICS</small><strong>4 REDES</strong><i>Filtros unificados</i></article><article><small>INTELLIGENCE</small><strong>AI READY</strong><i>Próxima acción</i></article></div><div className="nextConsoleLine"><i/><span>Un solo flujo. Menos fricción. Más alcance.</span></div></div></div>
   </section>

   <section className="nextSection nextIntelligence">
     <div><div className="nextIndex">07 / VYRAL INTELLIGENCE</div><small>EXCLUSIVO ESCALA</small><h2>Los números importan.<br/><em>Saber qué hacer después, más.</em></h2><p>VYRAL Intelligence está diseñado para analizar el rendimiento de tus últimos contenidos y transformar métricas en decisiones: qué hook repetir, qué caption funcionó, qué formato aceleró más y dónde está la próxima oportunidad.</p><div className="nextPills"><span>Viral Momentum</span><span>Content Intelligence</span><span>Predicción</span><span>Recomendaciones</span></div></div>
     <div className="nextIntelligenceCard"><div className="nextScore"><span>VIRAL MOMENTUM</span><strong>87<small>/100</small></strong><i>↑ +14 pts</i></div><div className="nextRecommendation"><small>PRÓXIMA ACCIÓN</small><h3>Repetí el formato, no el video.</h3><p>Tu combinación de hook visual + demostración está superando la media. Creá una segunda variante con una apertura más corta.</p><button>✦ Recomendación VYRAL AI</button></div></div>
   </section>

   <section className="nextSection nextCreator"><div className="nextCreatorGlow"/><div><div className="nextIndex">08 / CREATOR PROGRAM</div><small>CRECÉ CON VYRAL</small><h2>Tu audiencia también<br/><em>puede convertirse en negocio.</em></h2><p>Solicitá tu código Creator, compartí un beneficio para tu comunidad y acumulá comisiones recurrentes mientras las suscripciones sigan activas.</p></div><div className="nextCreatorStats"><article><span>BENEFICIO</span><strong>50% OFF</strong><small>para seguidores con código vigente</small></article><article><span>COMISIÓN</span><strong>10%</strong><small>recurrente sobre suscripciones atribuidas</small></article><article><span>PANEL</span><strong>LIVE</strong><small>usuarios, facturación y comisión</small></article></div></section>

   <section className="nextSection nextPlans"><div className="nextPlansHead"><div><div className="nextIndex">09 / PLANES</div><small>EMPEZÁ SIMPLE. ESCALÁ CUANDO QUIERAS.</small><h2>Tres niveles.<br/><em>Una misma obsesión: crecer.</em></h2></div><p>El plan cambia la profundidad del sistema. Inicio distribuye. Crecimiento distribuye y mide. Escala distribuye, mide y te ayuda a decidir qué hacer después.</p></div><div className="nextPlanGrid">{plans.map((p,i)=><article className={i===2?"hero":""} key={p.name}><span>{p.tag}</span><h3>{p.name}</h3><strong>{p.price}<small>/ mes</small></strong><div>{p.items.map(x=><p key={x}>✓ {x}</p>)}{p.off.map(x=><p className="off" key={x}>× {x}</p>)}</div><Link href="/registro">Empezar con {p.name} ↗</Link></article>)}</div></section>

   <section className="nextSection nextSupport"><div><div className="nextIndex">10 / SOPORTE 24/7</div><small>NO TE DEJAMOS SOLO CON UN DASHBOARD</small><h2>Preguntá. Resolvé.<br/><em>Seguí creciendo.</em></h2><p>Centro de ayuda, respuestas rápidas, seguimiento de consultas y atención directa desde tu propia cuenta.</p></div><div className="nextSupportChat"><div><span>VYRAL SUPPORT</span><i>ONLINE</i></div><p className="user">Necesito ayuda con una publicación.</p><p className="agent">Recibido. Ya estamos revisando tu cuenta y te respondemos desde acá.</p><small>La conversación se actualiza automáticamente.</small></div></section>

   <section className="nextFinal"><div className="nextFinalGrid"/><small>VYRAL · CONTENT DISTRIBUTION SYSTEM</small><h2>Creá una vez.<br/><em>Multiplicá todo lo demás.</em></h2><p>Tu contenido, tus cuentas, tus métricas y tu próxima decisión dentro del mismo sistema.</p><Link href="/registro">Crear mi cuenta <span>↗</span></Link></section>
   <footer className="nextFooter"><b>VYRAL</b><span>Distribución · Analytics · Intelligence</span><div><Link href="/terms">Términos</Link><Link href="/privacy">Privacidad</Link></div></footer>
 </div>
}
