import {NextResponse} from "next/server";
import {getCustomerSession} from "../../../../lib/auth";
import {supabaseAdmin} from "../../../../lib/supabase-admin";

export const runtime="nodejs";
export const maxDuration=300;

const STYLE_IDEA_GUIDES:Record<string,string>={
 "minimal-editorial":"Editorial minimalista: titular contundente, aire, grilla limpia y un argumento visual por placa.", "minimal-note-editor":"Editor/nota minimal: pensamientos, manifiestos, recordatorios o microensayos dentro de una ventana de editor.", "native-lockscreen-reminder":"Lockscreen: hora, recordatorios y notificaciones son la mecánica narrativa.", "native-search-intent":"Buscador: consultas, intención de búsqueda, preguntas y descubrimientos organizan la historia.", "physical-daily-plan":"Plan físico: agenda, prioridades, tachados y progreso cotidiano.", "concept-receipt":"Ticket/recibo conceptual: TODAS las ideas nacen de una metáfora transaccional usando slots reales: compra, devolución, reembolso, cargo, crédito, saldo, subtotal, total, descuento, vencimiento, inversión, comprobante o factura. Pensar encabezado, líneas concepto/precio, TOTAL y cierre. Si no necesita ser ticket para funcionar, no sirve.", "metaphorical-map-route":"Mapa/ruta: origen, destino, desvíos, hitos, caminos, coordenadas y navegación organizan la historia.", "native-form-hook":"Formulario: preguntas, campos, opciones, checks, respuestas y envío forman la narrativa.", "comic-pop":"Cómic pop: viñetas, conflicto, reacción, diálogo y progresión.", "animated-3d":"3D animado: objetos/personajes volumétricos, transformaciones físicas y metáforas espaciales.", "game-world":"Game world: niveles, misiones, checkpoints, inventario, boss, recompensa y desbloqueo.", "neo-pop-surreal":"Neo-pop surreal: metáforas imposibles, escala inesperada y objetos transformados.", "focus-arena":"Arena de foco: duelo, presión, objetivo central y distracciones como adversarios.", "gritty-sketch-collage":"Sketch/collage crudo: cada idea debe explotar el lenguaje artesanal de sketchbook — dibujo a mano, grafito/tinta/carboncillo, recortes, capas, flechas, tachones, notas y pequeños chiches visuales— pero con composición, protagonista, metáfora, objetos y distribución NUEVOS según el concepto. Misma familia artística, nunca el mismo dibujo.", "scrapbook-vision":"Scrapbook: aspiraciones, recuerdos, recortes y objetivos en capas.", "hand-drawn-editorial":"Editorial dibujado: explicación mediante doodles, flechas, palabras y objetos simples.", "retro-collage":"Collage retro: épocas, archivo, nostalgia y yuxtaposición editorial.", "cinematic-motivation":"Cinemático motivacional: escenas humanas concretas, tensión, acción y consecuencia.", "urban-editorial":"Editorial urbano: calle, arquitectura, señalética, movimiento y titulares integrados.", "luxury-lifestyle":"Lifestyle premium: hábitos, objetos, espacios y momentos aspiracionales realistas.", "cinematic-threshold":"Umbral cinematográfico: puertas, límites, cruces y decisiones representadas espacialmente.", "editorial-duality":"Dualidad editorial: dos fuerzas, decisiones o interpretaciones enfrentadas.", "mind-cutaway":"Retrato cutaway: mundo interior, capas mentales, pensamientos o sistemas visualizados.", "human-documentary-story":"Humano documental: escenas reales, observación cotidiana, gestos y narrativa auténtica.", "clean-explainer-editorial":"Explainer limpio: pasos, componentes, causa/efecto, datos y diagramas.", "cinematic-human-hook":"Hook humano cinematográfico: una escena humana potente abre y sostiene la historia.", "object-metaphor":"Metáfora de objeto: un objeto central concreto materializa el mensaje y evoluciona."
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
 "gritty-sketch-collage":"Prohibido acabado digital limpio, UI nativa, póster 3D, vector perfecto o estética corporativa. Prohibido copiar el rostro, pose, composición, objetos, lista, paleta exacta o distribución de la miniatura. Puede usar persona, objeto, producto, escena o símbolo como protagonista; debe conservar dibujo manual, textura cruda, collage, anotaciones y riqueza artesanal.",
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
  const visualStyle=String(b.visual_style_id||b.visualStyle||"").trim();
  const conversionGoal=String(b.conversion_goal||b.conversionGoal||"").trim();
  const rawSlideCount=b.slide_count??b.slideCount;
  const parsedSlideCount=Number(rawSlideCount);
  if(rawSlideCount===undefined||rawSlideCount===null||rawSlideCount===""||!Number.isInteger(parsedSlideCount)||parsedSlideCount<1||parsedSlideCount>7)return NextResponse.json({error:"Elegí obligatoriamente una cantidad de placas entre 1 y 7."},{status:400});
  const slideCount=parsedSlideCount;
  const styleGuide=STYLE_IDEA_GUIDES[visualStyle];
  const forbidden=STYLE_IDEA_FORBIDDEN[visualStyle];
  const previousIdeas=Array.isArray(b.previousIdeas)?b.previousIdeas.map((x:any)=>String(x||"").trim()).filter(Boolean).slice(-24):[];
  const variationSeed=String(b.variationSeed||crypto.randomUUID());
  if(brief.length<3)return NextResponse.json({error:"Contame brevemente qué querés vender o comunicar."},{status:400});
  if(!conversionGoal)return NextResponse.json({error:"Definí obligatoriamente el objetivo de conversión o recurso."},{status:400});
  if(!visualStyle||!styleGuide)return NextResponse.json({error:"Primero elegí un estilo visual válido. Las ideas se generan desde ese molde."},{status:400});

  const [{data:businessRow},{data:authUser}]=await Promise.all([
   db.from("vyral_bussines_profile").select("*").eq("user_id",session.userId).maybeSingle(),
   db.auth.admin.getUserById(session.userId)
  ]);
  const legacyBusiness=(authUser.user?.user_metadata?.vyral_business||{}) as Record<string,unknown>;
  const brandBrain={
   business_name:String(businessRow?.business_name||legacyBusiness.name||"").trim(),
   industry:String(businessRow?.industry||legacyBusiness.industry||"").trim(),
   offer:String(businessRow?.offer||legacyBusiness.offer||"").trim(),
   audience:String(businessRow?.audience||legacyBusiness.audience||"").trim(),
   tone:String(businessRow?.tone||legacyBusiness.tone||"").trim(),
   goals:String(businessRow?.goals||legacyBusiness.objective||"").trim(),
   cta:String(businessRow?.cta||legacyBusiness.cta||"").trim(),
   country:String(businessRow?.country||legacyBusiness.location||"").trim(),
   extra_context:String(businessRow?.extra_context||legacyBusiness.notes||"").trim(),
   founder_role:String(businessRow?.founder_role||"").trim(),
   founder_story:String(businessRow?.founder_story||"").trim(),
   service_area:String(businessRow?.service_area||"").trim(),
   products_services:String(businessRow?.products_services||"").trim(),
   pricing:String(businessRow?.pricing||"").trim(),
   revenue_context:String(businessRow?.revenue_context||"").trim(),
   team_context:String(businessRow?.team_context||"").trim(),
   experience:String(businessRow?.experience||"").trim(),
   customer_pains:String(businessRow?.customer_pains||"").trim(),
   customer_desires:String(businessRow?.customer_desires||"").trim(),
   objections:String(businessRow?.objections||"").trim(),
   differentiators:String(businessRow?.differentiators||legacyBusiness.differentiator||"").trim(),
   proof_results:String(businessRow?.proof_results||"").trim(),
   brand_voice:String(businessRow?.brand_voice||"").trim(),
   words_to_use:String(businessRow?.words_to_use||"").trim(),
   words_to_avoid:String(businessRow?.words_to_avoid||"").trim(),
   social_context:String(businessRow?.social_context||"").trim(),
   current_priority:String(businessRow?.current_priority||"").trim()
  };
  const brainText=Object.entries(brandBrain).filter(([,v])=>v).map(([k,v])=>`${k}: ${v}`).join("\n");

  const prompt=`PROMPT MAESTRO — BOT GUIONISTA DE CARRUSELES VIRALES DE INSTAGRAM

Actuás como un estratega creativo senior especializado EXCLUSIVAMENTE en carruseles de Instagram que generan atención, retención, comentarios, guardados, compartidos, leads y ventas. No proponés posteos genéricos: encontrás ángulos que hagan frenar, deslizar y llegar hasta el CTA.

Sos director creativo senior de performance para VYRAL.

BRAND BRAIN PERMANENTE DEL USUARIO (FUENTE DE VERDAD):
${brainText||"El usuario todavía no completó suficiente información en Mi negocio."}

PEDIDO ACTUAL DEL USUARIO:
"${brief}"

REGLAS DE MEMORIA:
- Cruzá SIEMPRE el pedido actual con el Brand Brain antes de idear.
- El pedido actual define QUÉ quiere comunicar/vender hoy; el Brand Brain define QUIÉN es, qué hace, qué vende, a quién, dónde y con qué contexto.
- Priorizá datos concretos del Brand Brain cuando sean relevantes: identidad, rubro, ubicación, oferta, público, resultados, precios, trayectoria, equipo, tono, diferenciadores y objetivos.
- Nunca inventes facturación, edad, clientes, resultados, precios, trayectoria, equipo, ubicaciones ni credenciales que no estén en el Brand Brain o en el pedido actual.
- Si un dato no existe, construí la idea sin ese dato; no rellenes huecos con suposiciones.
- No repitas todo el perfil: seleccioná únicamente los datos que hagan el concepto más específico, creíble y potente.
- Si el pedido actual contradice explícitamente un dato del Brand Brain, para ESTA pieza prevalece el pedido actual.
- Las ideas deben sentirse escritas para ESTE negocio, no para un negocio genérico del mismo rubro.

ESTILO VISUAL YA SELECCIONADO: "${visualStyle}". MOLDE SEMÁNTICO OBLIGATORIO: ${styleGuide}\nRESTRICCIONES ESPECÍFICAS DEL ESTILO: ${forbidden}\n\nFORMATO ADAPTATIVO Y ÁNGULOS UNIVERSALES — OBLIGATORIO:
- Variables activas: user_brain = Brand Brain permanente; slide_count = ${slideCount}; visual_style = "${visualStyle}"; conversion_goal = "${conversionGoal}".
- Estas reglas son AGNÓSTICAS AL NICHO: deben funcionar para cualquier industria, profesión, producto, servicio o marca. No asumas trading, SaaS, ecommerce ni ningún sector salvo que user_brain/brief lo indiquen.
- Si slide_count == 1: cada propuesta es UNA sola imagen fija con Hook visual + Copy. PROHIBIDO escribir "Slide 1", secuencias, carrusel o divisiones.
- Si slide_count >= 2: repartí la narrativa EXACTAMENTE en ${slideCount} diapositivas. El campo angle debe enumerar Slide 1 hasta Slide ${slideCount}, sin agregar ni quitar placas.

GENERÁ EXACTAMENTE ESTOS 4 ÁNGULOS, UNO POR OPCIÓN:
1) TRANSFORMACIÓN Y STORYTELLING PERSONAL
   - Extraé de user_brain el contraste real entre situación inicial/frustración/pasado y estado actual/solución/transformación.
   - Construí un relato humano de cambio, aprendizaje, superación o lección que conecte emocionalmente.
   - PROHIBIDO inventar pasado, fracasos, trabajos, resultados o biografía que user_brain no respalde.

2) PSICOLOGÍA Y FRUSTRACIONES DEL CLIENTE IDEAL
   - Mapeá customer_pains, customer_desires, objections, audience y dudas frecuentes disponibles en user_brain.
   - Elegí un dolor profundo o bloqueo cotidiano y explicá empáticamente por qué una conducta, creencia o método habitual falla.
   - No conviertas esta opción en una explicación del producto desde el comienzo: primero hacé sentir entendido al público.

3) EDUCATIVO / FRAMEWORK / PASO A PASO
   - Detectá el método, proceso, experiencia, diferenciador o pilar útil disponible en user_brain y convertílo en valor práctico.
   - Estructuralo como tutorial, framework, checklist, pasos, errores/soluciones o sistema accionable según lo que mejor encaje.
   - Priorizá claridad, utilidad inmediata y aprendizaje rápido. No dependas de resultados monetarios ni de evidencia técnica específica de un nicho.

4) DISRUPTIVO / ATAQUE A MITOS DEL SECTOR
   - Identificá una creencia popular, consejo repetido, práctica asumida o mito relevante para la industria inferida desde user_brain.
   - Abrí con un hook contundente y defendible que genere curiosidad o debate y después explicá el contraste.
   - PROHIBIDO inventar estadísticas, consensos o afirmaciones falsas sólo para volverlo polémico.

DIVERSIDAD REAL — CERO REPETICIÓN:
- Las 4 opciones deben tener tesis, hook, tensión y estructura narrativa distintas.
- user_brain es materia prima, NO un texto para recitar. No repitas automáticamente los mismos diferenciales, cifras, logros, términos técnicos o mecanismos.
- Si un dato domina una opción, buscá otra arista para las demás.
- No mezcles los cuatro ángulos ni conviertas cuatro opciones en paráfrasis de la misma idea.

MOTORES DE HOOK RECOMENDADOS: contraste disruptivo; resultado fuerte solo si está respaldado; frase literal del mercado; pregunta incómoda; provocación directa; error costoso; secreto/mecanismo; antes vs después; creencia popular vs realidad.
La viralidad debe salir de una tensión REAL del público + especificidad del Brand Brain + claridad. Prohibido clickbait falso.
Las 4 propuestas deben ser conceptos que puedan convertirse inmediatamente en carruseles completos. El campo angle debe describir la progresión narrativa, no solamente una imagen.

OBJETIVO CENTRAL: todo contenido de VYRAL debe detener el scroll, hacerse notar, ser recordado y cumplir el objetivo del usuario. No generes ideas meramente correctas: generá conceptos con una imagen mental instantánea y un hook que invite a leer, compartir, guardar, comentar o comprar según corresponda.

RAZONÁ INTERNAMENTE EN ESTE ORDEN OBLIGATORIO:
1) MENSAJE REAL DEL BRIEF: interpretá qué quiere decir el usuario; no te obsesiones con sustantivos literales.
2) INTENCIÓN: detectá si busca motivar, vender, enseñar, provocar, identificar, demostrar, comparar o entretener.
3) OBJETIVO COMERCIAL: ventas=deseo/problema/prueba/oferta; mensajes=curiosidad/valor y motivo real para comentar; seguidores=identidad/serie/autoridad; tráfico=brecha de información; educar=claridad+descubrimiento memorable.
4) CONCEPTO VIRAL: encontrá una tesis fuerte, contraste, tensión, paradoja, transformación o símbolo visual.
5) METÁFORA/ESCENA: traducí el concepto a una imagen concreta.
6) ESTILO SELECCIONADO: representá esa escena exclusivamente mediante la gramática visual del estilo elegido.
7) HOOK: frase breve, memorable, humana y específica que amplifique la imagen.
8) CTA: conectalo naturalmente con la acción objetivo.

Creá exactamente 4 conceptos realmente diferentes, TODOS nacidos del mensaje del usuario y DESPUÉS traducidos al estilo seleccionado. REGLA CRÍTICA: EL ESTILO DECIDE CÓMO SE VE LA IDEA; NO DECIDE DE QUÉ TRATA LA IDEA. No conviertas palabras del guide como arena, adversario, mapa, ticket, formulario, etc. en el tema de las cuatro ideas: son gramática de representación, no contenido.

RESPETÁ LA IMAGEN MENTAL DEL USUARIO. Si el brief ya contiene una metáfora clara, desarrollala primero en formas visuales directas y potentes. Ejemplo: si pide "sé el lobo distinto a toda la multitud", explorá una manada uniforme con un lobo diferente, una multitud humana uniforme con una persona que rompe el patrón u otros equivalentes claramente conectados. NO reemplaces una metáfora clara por conceptos abstractos sin relación. Si el tono es motivacional, cada propuesta debe incluir un hook/frase motivacional fuerte que exprese la tesis.

DIVERSIDAD REAL: no hagas cuatro paráfrasis de la misma escena. Explorá cuando sean compatibles: metáfora literal potente, equivalente humano, masa/individuo o antes/después, símbolo/objeto, paradoja visual, escena cinematográfica, comparación inesperada y concepto provocador. Son motores de exploración, no nuevos formatos. Cada propuesta debe tener escena central, tesis y hook diferentes.

FILTRO DE VIRALIDAD: rechazá internamente cualquier idea genérica, burocrática, excesivamente explicativa, visualmente difícil de imaginar o repetitiva. Antes de aceptar cada idea preguntate: ¿entiendo la imagen en dos segundos? ¿el hook me haría frenar? ¿representa lo que realmente pidió el usuario? ¿cumple el objetivo? ¿sigue perteneciendo al estilo seleccionado? Si alguna respuesta es no, regenerala.

Cada propuesta debe aprovechar los slots, objetos, UI, metáfora o estructura propios del molde SIN permitir que esos slots secuestren el significado. La creatividad ocurre dentro del lenguaje visual, nunca cambiándolo. NO cambies dirección de arte, formato, tipografía, encuadre ni sistema visual entre ideas. No propongas UGC, chat, revista, checklist, documental u otro formato si el molde no lo contiene.\n\nTEST OBLIGATORIO: antes de devolver cada idea preguntate "¿esto aprovecha específicamente el estilo ${visualStyle}, o es genérico?". Si es genérica, RECHAZALA. Segundo test: "¿esta idea viola alguna restricción específica del estilo?". Si sí, RECHAZALA Y GENERÁ OTRA. Las 4 deben ser distintas entre sí pero nativas del mismo molde.\n\nIdeas/títulos ya mostrados al usuario que NO debés repetir ni parafrasear de cerca: ${previousIdeas.length?previousIdeas.join(" | "):"ninguna"}.
Semilla de variación de esta tanda: ${variationSeed}. Usala solo para forzar una nueva exploración creativa, no la menciones en la respuesta.

No inventes precio, métricas, testimonios ni características ausentes.\nINTEGRACIÓN DE CONVERSIÓN — REGLA DURA:\n- El destino final de las cuatro ideas es: "${conversionGoal}".\n- Tejé ese objetivo de forma orgánica como consecuencia natural de la narrativa.\n- PROHIBIDO mencionar, vender, ofrecer o insinuar el recurso/objetivo de conversión en el hook o en Slide 1.\n- Si slide_count >= 2, la primera aparición explícita del objetivo/recurso sólo puede ocurrir en el SLIDE FINAL / CTA.\n- Si slide_count == 1, mantené el hook principal libre de pitch y reservá la conversión para una línea de CTA claramente separada al cierre de la placa.\n- El campo cta debe ejecutar específicamente "${conversionGoal}". No fuerces comentarios por DM si ese no es el objetivo. Si el objetivo sí requiere entregar un recurso por DM, podés usar una palabra clave corta y natural.\n- El CTA nunca debe contradecir conversion_goal ni convertir una pieza de viralidad/seguidores en una venta artificial. Priorizá ideas vendibles pero genuinamente variadas. Devolvé un objeto JSON con una única clave "ideas". "ideas" debe ser un array de exactamente 4 objetos con: id, name, hook, angle, humanStyle, business, offer, audience, goal, tone, cta, count. goal solo puede ser ventas, mensajes, seguidores, trafico o educar. count debe ser exactamente ${slideCount}. angle debe respetar el formato de ${slideCount===1?'una sola imagen fija sin etiquetas Slide':'exactamente '+slideCount+' slides'}.`;

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
