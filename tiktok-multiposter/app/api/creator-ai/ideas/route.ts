import {NextResponse} from "next/server";
import {getCustomerSession} from "../../../../lib/auth";
import {supabaseAdmin} from "../../../../lib/supabase-admin";

export const runtime="nodejs";
export const maxDuration=300;

const STYLE_IDEA_GUIDES:Record<string,string>={
 "minimal-editorial":"Editorial minimalista: titular contundente, aire, grilla limpia y un argumento visual por placa.", "minimal-note-editor":"Editor/nota minimal: pensamientos, manifiestos, recordatorios o microensayos dentro de una ventana de editor.", "native-lockscreen-reminder":"Lockscreen: hora, recordatorios y notificaciones son la mecánica narrativa.", "native-search-intent":"Buscador: consultas, intención de búsqueda, preguntas y descubrimientos organizan la historia.", "physical-daily-plan":"Plan físico: agenda, prioridades, tachados y progreso cotidiano.", "concept-receipt":"Ticket/recibo conceptual: TODAS las ideas nacen de una metáfora transaccional usando slots reales: compra, devolución, reembolso, cargo, crédito, saldo, subtotal, total, descuento, vencimiento, inversión, comprobante o factura. Pensar encabezado, líneas concepto/precio, TOTAL y cierre. Si no necesita ser ticket para funcionar, no sirve.", "metaphorical-map-route":"Mapa/ruta: origen, destino, desvíos, hitos, caminos, coordenadas y navegación organizan la historia.", "native-form-hook":"Formulario: preguntas, campos, opciones, checks, respuestas y envío forman la narrativa.", "comic-pop":"Cómic pop: viñetas, conflicto, reacción, diálogo y progresión.", "animated-3d":"3D animado: objetos/personajes volumétricos, transformaciones físicas y metáforas espaciales.", "game-world":"Game world: niveles, misiones, checkpoints, inventario, boss, recompensa y desbloqueo.", "neo-pop-surreal":"Neo-pop surreal: metáforas imposibles, escala inesperada y objetos transformados.", "focus-arena":"Arena de foco: duelo, presión, objetivo central y distracciones como adversarios.", "gritty-sketch-collage":"Sketch/collage crudo EXACTO: las ideas deben necesitar un collage denso tipo sketchbook con gran titular manuscrito arriba, retrato/figura dibujada como ancla central-inferior y múltiples recortes, miniobjetos, flechas, notas y capas alrededor. El contenido cambia, pero esa arquitectura es fija.", "scrapbook-vision":"Scrapbook: aspiraciones, recuerdos, recortes y objetivos en capas.", "hand-drawn-editorial":"Editorial dibujado: explicación mediante doodles, flechas, palabras y objetos simples.", "retro-collage":"Collage retro: épocas, archivo, nostalgia y yuxtaposición editorial.", "cinematic-motivation":"Cinemático motivacional: escenas humanas concretas, tensión, acción y consecuencia.", "urban-editorial":"Editorial urbano: calle, arquitectura, señalética, movimiento y titulares integrados.", "luxury-lifestyle":"Lifestyle premium: hábitos, objetos, espacios y momentos aspiracionales realistas.", "cinematic-threshold":"Umbral cinematográfico: puertas, límites, cruces y decisiones representadas espacialmente.", "editorial-duality":"Dualidad editorial: dos fuerzas, decisiones o interpretaciones enfrentadas.", "mind-cutaway":"Retrato cutaway: mundo interior, capas mentales, pensamientos o sistemas visualizados.", "human-documentary-story":"Humano documental: escenas reales, observación cotidiana, gestos y narrativa auténtica.", "clean-explainer-editorial":"Explainer limpio: pasos, componentes, causa/efecto, datos y diagramas.", "cinematic-human-hook":"Hook humano cinematográfico: una escena humana potente abre y sostiene la historia.", "object-metaphor":"Metáfora de objeto: un objeto central concreto materializa el mensaje y evoluciona."
};

const STYLE_IDEA_FORBIDDEN:Record<string,string>={
 "minimal-editorial":"Prohibido convertirlo en ticket, chat, lockscreen, buscador, formulario, mapa, videojuego, cómic o escena cinematográfica.",
 "minimal-note-editor":"Prohibido abandonar la ventana de editor/nota o convertirla en ticket, chat, buscador, mapa, formulario o escena fotográfica.",
 "native-lockscreen-reminder":"Prohibido salir de la pantalla de bloqueo o reemplazar notificaciones/hora por otro dispositivo o formato editorial.",
 "native-search-intent":"Prohibido salir del buscador/resultados de búsqueda o convertir la idea en chat, ticket, mapa, nota o formulario.",
 "physical-daily-plan":"Prohibido abandonar el plan/agenda física; nada de chat, ticket, buscador, mapa, formulario o narrativa cinematográfica.",
 "concept-receipt":"Prohibido chat, escalera, documental, revista, checklist, mapa, formulario, buscador o cualquier idea que no necesite estructuralmente un ticket/recibo.",
 "metaphorical-map-route":"Prohibido abandonar el lenguaje cartográfico; nada de ticket, chat, formulario, revista o escena genérica sin ruta/origen/destino.",
 "native-form-hook":"Prohibido abandonar el formulario; nada de ticket, chat, mapa, buscador o editorial genérico sin campos/preguntas/opciones.",
 "comic-pop":"Prohibido resolverlo como foto editorial, ticket, formulario o UI nativa: la idea debe necesitar viñetas y lenguaje de cómic.",
 "animated-3d":"Prohibido reducirlo a póster plano, foto documental o UI: debe existir una acción/transformación tridimensional.",
 "game-world":"Prohibido narrativa genérica sin mecánica de juego; debe necesitar niveles, misión, progreso, recompensa o sistema equivalente.",
 "neo-pop-surreal":"Prohibido una escena cotidiana literal sin giro surrealista; la metáfora imposible debe ser esencial.",
 "focus-arena":"Prohibido una motivación genérica: debe existir oposición visual entre foco/objetivo y distracción/adversario.",
 "gritty-sketch-collage":"Prohibido acabado fotográfico limpio, UI nativa, póster 3D, tarjetas limpias, metáfora de objeto aislado, composición minimalista, gran espacio vacío o reemplazar el retrato+collage central por una hoja/diagrama simple. Debe necesitar la arquitectura densa retrato+recortes+sketch de la referencia.",
 "scrapbook-vision":"Prohibido composición única limpia: debe necesitar capas de recuerdos/objetivos/recortes tipo scrapbook.",
 "hand-drawn-editorial":"Prohibido foto cinematográfica, UI o 3D como lenguaje principal; debe explicarse mediante dibujo editorial y doodles.",
 "retro-collage":"Prohibido visual contemporáneo homogéneo: debe existir yuxtaposición de archivo/épocas/recortes.",
 "cinematic-motivation":"Prohibido UI, ticket, mapa o póster plano como núcleo: debe ser una secuencia de escenas humanas cinematográficas.",
 "urban-editorial":"Prohibido estudio neutro o UI: la calle/arquitectura/señalética urbana debe ser parte indispensable del concepto.",
 "luxury-lifestyle":"Prohibido cómic, ticket, formulario o surrealismo dominante: debe vivir en momentos y objetos lifestyle premium creíbles.",
 "cinematic-threshold":"Prohibido metáfora genérica sin umbral físico: cruzar/no cruzar un límite, puerta o frontera debe organizar el concepto.",
 "editorial-duality":"Prohibido concepto de una sola vía: cada idea debe necesitar dos fuerzas/lados/interpretaciones comparables.",
 "mind-cutaway":"Prohibido retrato normal: la visualización del mundo interior/capas mentales debe ser imprescindible.",
 "human-documentary-story":"Prohibido ilustración, 3D, UI o puesta publicitaria artificial: debe sostenerse con momentos humanos observacionales reales.",
 "clean-explainer-editorial":"Prohibido concepto puramente emocional sin explicación: debe necesitar pasos, componentes, relación causa/efecto o diagrama.",
 "cinematic-human-hook":"Prohibido objeto/UI como protagonista: una persona y una situación humana visualmente potente deben sostener el hook.",
 "object-metaphor":"Prohibido concepto abstracto sin objeto protagonista: el mensaje debe depender de un objeto físico concreto y su evolución."
};

function parseIdeas(value:string){
 const raw=value.trim().replace(/^\`\`\`(?:json)?\s*/i,"").replace(/\s*\`\`\`$/,"");
 if(!raw)throw new Error("La IA devolvió una respuesta vacía.");
 let parsed:any;
 try{parsed=JSON.parse(raw)}catch{
  const start=raw.indexOf("{"),end=raw.lastIndexOf("}");
  if(start<0||end<=start)throw new Error("La IA devolvió ideas en un formato incompleto.");
  parsed=JSON.parse(raw.slice(start,end+1));
 }
 const ideas=Array.isArray(parsed)?parsed:parsed?.ideas;
 if(!Array.isArray(ideas))throw new Error("La IA no devolvió una lista de ideas válida.");
 return ideas.slice(0,8);
}

export async function POST(req:Request){
 const session=await getCustomerSession();
 if(!session)return NextResponse.json({error:"Iniciá sesión."},{status:401});
 const db=supabaseAdmin();
 const {data}=await db.auth.admin.getUserById(session.userId);
 const plan=String(data.user?.user_metadata?.plan||session.plan||"");
 if(plan!=="escala"&&plan!=="ai")return NextResponse.json({error:"Creator IA requiere Escala o VYRAL AI."},{status:403});
 const key=process.env.VYRAL_CREATOR_PRODUCTION;
 if(!key)return NextResponse.json({error:"Falta configurar la IA."},{status:503});

 try{
  const b=await req.json();
  const brief=String(b.brief||"").trim();
  const visualStyle=String(b.visualStyle||"").trim();
  const styleGuide=STYLE_IDEA_GUIDES[visualStyle];
  const forbidden=STYLE_IDEA_FORBIDDEN[visualStyle];
  const previousIdeas=Array.isArray(b.previousIdeas)?b.previousIdeas.map((x:any)=>String(x||"").trim()).filter(Boolean).slice(-24):[];
  const variationSeed=String(b.variationSeed||crypto.randomUUID());
  if(brief.length<3)return NextResponse.json({error:"Contame brevemente qué querés vender o comunicar."},{status:400});
  if(!visualStyle||!styleGuide)return NextResponse.json({error:"Primero elegí un estilo visual válido. Las ideas se generan desde ese molde."},{status:400});

  const prompt=`Sos director creativo senior de performance para VYRAL. Brief: "${brief}". ESTILO VISUAL YA SELECCIONADO: "${visualStyle}". MOLDE SEMÁNTICO OBLIGATORIO: ${styleGuide}\nRESTRICCIONES ESPECÍFICAS DEL ESTILO: ${forbidden}\n\nCreá exactamente 8 conceptos realmente diferentes, pero TODOS concebidos DESDE este estilo visual. El estilo no se agrega al final: organiza la idea desde el comienzo. Si una idea podría funcionar igual sin este estilo, descartala. Cada propuesta debe aprovechar los slots, objetos, UI, metáfora o estructura propios del molde. La creatividad ocurre DENTRO del molde, nunca cambiándolo.

REGLA DE DIVERSIDAD DENTRO DEL MOLDE: no uses ocho variantes de problema→solución ni paráfrasis de la misma moraleja. Variá tesis, hook, mecanismo, progresión, remate y uso de los slots DEL ESTILO SELECCIONADO. Podés explorar historia, mito, comparación, demostración, errores, desafío, objeción, humor, proceso, diagnóstico o aspiración SOLO cuando se traduzcan naturalmente al molde. NO cambies dirección de arte, formato, tipografía, encuadre ni sistema visual entre ideas. No propongas UGC, chat, revista, checklist, documental u otro formato si el molde no lo contiene.\n\nTEST OBLIGATORIO: antes de devolver cada idea preguntate "¿esto aprovecha específicamente el estilo ${visualStyle}, o es genérico?". Si es genérica, RECHAZALA. Segundo test: "¿esta idea viola alguna restricción específica del estilo?". Si sí, RECHAZALA Y GENERÁ OTRA. Las 8 deben ser distintas entre sí pero nativas del mismo molde.\n\nIdeas/títulos ya mostrados al usuario que NO debés repetir ni parafrasear de cerca: ${previousIdeas.length?previousIdeas.join(" | "):"ninguna"}.
Semilla de variación de esta tanda: ${variationSeed}. Usala solo para forzar una nueva exploración creativa, no la menciones en la respuesta.

No inventes precio, métricas, testimonios ni características ausentes. CTA GLOBAL OBLIGATORIO PARA LAS 8 IDEAS: el campo cta SIEMPRE debe ser un CTA de comentario con una sola PALABRA CLAVE corta, en mayúsculas y relacionada específicamente con la idea, pensado para entregar un recurso/archivo/GIF por DM. Formato: "Comentá PALABRA y te mando [recurso] por DM". Elegí automáticamente una palabra distinta y natural según el contenido cuando corresponda. Prohibido usar Conocé más, link en bio, seguime, guardalo, escribime, mandame DM, comprá o CTAs vagos. Priorizá ideas vendibles pero genuinamente variadas. Devolvé un objeto JSON con una única clave "ideas". "ideas" debe ser un array de 8 objetos con: id, name, hook, angle, humanStyle, business, offer, audience, goal, tone, cta, count. goal solo puede ser ventas, mensajes, seguidores, trafico o educar. count debe ser 6.`;

  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),120000);
  let r:Response;
  try{
   r=await fetch("https://api.openai.com/v1/chat/completions",{
    method:"POST",
    signal:controller.signal,
    headers:{Authorization:`Bearer ${key}`,"Content-Type":"application/json"},
    body:JSON.stringify({
     model:process.env.VYRAL_TEXT_MODEL||"gpt-5.6-sol",
     messages:[{role:"user",content:prompt}],
     response_format:{type:"json_object"},
     max_completion_tokens:6000
    })
   });
  }finally{clearTimeout(timer)}

  const raw=await r.text();
  let j:any;
  try{j=JSON.parse(raw)}catch{throw new Error(`El proveedor de IA respondió en un formato inválido (HTTP ${r.status}).`)}
  if(!r.ok)throw new Error(j.error?.message||`No se pudieron crear ideas (HTTP ${r.status}).`);
  const content=String(j.choices?.[0]?.message?.content||"");
  let ideas:any[];
  try{ideas=parseIdeas(content)}catch(firstError:any){
   const retry=await fetch("https://api.openai.com/v1/chat/completions",{method:"POST",headers:{Authorization:`Bearer ${key}`,"Content-Type":"application/json"},body:JSON.stringify({model:process.env.VYRAL_TEXT_MODEL||"gpt-5.6-sol",messages:[{role:"user",content:prompt+"\\n\\nIMPORTANTE: devolvé JSON válido y compacto. No agregues explicaciones fuera del JSON."}],response_format:{type:"json_object"},max_completion_tokens:6000})});
   const retryRaw=await retry.text();let retryJson:any;try{retryJson=JSON.parse(retryRaw)}catch{throw firstError}
   if(!retry.ok)throw firstError;
   ideas=parseIdeas(String(retryJson.choices?.[0]?.message?.content||""));
  }
  return NextResponse.json({ideas});
 }catch(e:any){
  const message=e?.name==="AbortError"?"La IA tardó demasiado en responder. Intentá nuevamente; la solicitud anterior fue cancelada.":e?.message||"No se pudieron crear ideas.";
  return NextResponse.json({error:message},{status:e?.name==="AbortError"?504:500});
 }
}
