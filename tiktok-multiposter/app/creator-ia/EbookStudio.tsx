"use client";
import {useMemo,useState} from "react";
type PagePlan={number:number;type:string;section:string;title:string;subtitle?:string;body:string;objective:string;visual:string;visualFunction:string;composition:string;textVisualRatio:string;imagePrompt:string;image?:string;storagePath?:string;status?:"pending"|"generating"|"done"|"error";error?:string};
const AI_BRIEF_PROMPT=`Quiero que actúes como estratega editorial y director creativo de ebooks profesionales. Necesito que me prepares UN ÚNICO BRIEF COMPLETO, listo para copiar y pegar en un generador de ebooks. No me expliques el proceso y no incluyas instrucciones técnicas sobre cómo generar imágenes, páginas o PDFs. Si te falta información importante, haceme primero las preguntas mínimas necesarias; si podés inferir algo razonablemente, proponelo y marcá la decisión con claridad.

Completá y desarrollá TODOS estos campos con suficiente detalle para que otra IA pueda crear un ebook profesional:

TÍTULO DEL EBOOK:
Proponé un título claro, atractivo, específico y comercial.

SUBTÍTULO:
Una frase que amplíe la promesa principal y deje claro el beneficio.

NICHO / TEMA:
Definí con precisión el tema, subnicho y contexto del ebook.

PÚBLICO / AVATAR:
Describí quién lo va a leer: perfil, nivel de experiencia, situación actual, necesidades, deseos y contexto relevante.

PROBLEMA PRINCIPAL:
Explicá qué problema concreto tiene hoy el lector, por qué le importa y qué consecuencias genera.

TRANSFORMACIÓN PROMETIDA:
Definí claramente desde qué situación parte el lector y a qué resultado concreto debería poder llegar gracias al ebook.

OBJETIVO DEL EBOOK:
Explicá qué debe conseguir el lector y qué función debe cumplir el ebook.

CONTENIDO PRINCIPAL / TEMAS QUE DEBE ENSEÑAR:
Armá una lista completa y lógica de temas, subtemas, conceptos, pasos, técnicas o recetas según corresponda. Priorizá profundidad útil, progresión y aplicación práctica.

TONO:
Definí voz, personalidad, nivel de formalidad, idioma/variante y cosas que deben evitarse.

NIVEL DEL LECTOR:
Principiante, intermedio, avanzado o combinación, indicando qué conocimientos se pueden asumir.

ESTILO DEL CONTENIDO:
Indicá cómo presentar la información: profundidad, extensión, ejemplos, pasos, ejercicios, checklists, comparaciones, frameworks, tablas, casos, recetas u otros recursos pertinentes.

DIRECCIÓN VISUAL:
Definí una dirección de arte profesional y específica para este tema: sensación general, universo visual, tipo de fotografía o ilustración, iluminación, texturas, fondos y recursos gráficos.

PALETA VISUAL:
Proponé colores principales, secundarios, acentos, fondo y texto. Incluí códigos HEX cuando sea útil.

TIPOGRAFÍA:
Describí el estilo de tipografía ideal para titulares, subtítulos y cuerpo, priorizando jerarquía y legibilidad.

ESTILO DE IMÁGENES:
Explicá qué imágenes deberían aparecer, qué deben comunicar, qué sujetos/objetos/escenas son relevantes y qué recursos visuales deberían evitarse.

COHERENCIA VISUAL:
Definí qué elementos deben mantenerse consistentes en todo el ebook y cuáles pueden variar para evitar monotonía.

PORTADA:
Proponé el concepto de portada: título exacto, escena o recurso visual protagonista, composición, sensación, jerarquía y nivel de impacto esperado.

RECURSOS VISUALES RECOMENDADOS:
Elegí los recursos que mejor enseñen este tema: fotografías, diagramas, flowcharts, checklists, comparaciones, tablas, mockups, timelines, mapas, frameworks, infografías, ilustraciones, antes/después u otros.

ESTRUCTURA DE APRENDIZAJE / PROGRESIÓN:
Explicá cómo debería avanzar el lector desde el punto inicial hasta el resultado final.

MARCA:
Indicá nombre de marca, logo, colores o lineamientos si existen. Si no existen, escribí claramente “Sin marca definida”. No inventes testimonios, resultados, certificaciones ni evidencia real.

CALIDAD / POSICIONAMIENTO:
Definí cómo debe percibirse el producto: gratuito, lead magnet, premium, producto digital pago, manual profesional, recetario, guía técnica, etc.

OBSERVACIONES Y RESTRICCIONES:
Agregá cualquier requisito importante específico del tema: exactitud, seguridad, datos que no deben inventarse, elementos obligatorios, cosas que deben evitarse y preferencias especiales.

IMPORTANTE: tu respuesta final debe contener únicamente el brief terminado, con estos encabezados y contenido listo para copiar y pegar. No agregues reglas sobre “una imagen por página”, llamadas de generación, grids, collages, calidad de modelos, PDF ni otras instrucciones internas del software: eso ya lo resuelve el generador.`;
export default function EbookStudio(){
 const [brief,setBrief]=useState("");const [requestedPages,setRequestedPages]=useState(15);const [plan,setPlan]=useState<any>(null);const [pages,setPages]=useState<PagePlan[]>([]);const [planning,setPlanning]=useState(false);const [running,setRunning]=useState(false);const [exporting,setExporting]=useState(false);const [error,setError]=useState("");const [current,setCurrent]=useState(0);const [pdfUrl,setPdfUrl]=useState("");const [helperOpen,setHelperOpen]=useState(false);const [copied,setCopied]=useState(false);
 const done=useMemo(()=>pages.filter(p=>p.status==="done").length,[pages]);const allDone=pages.length>0&&done===pages.length;
 async function copyHelper(){try{await navigator.clipboard.writeText(AI_BRIEF_PROMPT);setCopied(true);setTimeout(()=>setCopied(false),1800)}catch{setError("No se pudo copiar automáticamente. Seleccioná el prompt y copialo manualmente.")}}
 async function createPlan(){setPlanning(true);setError("");setPdfUrl("");setPlan(null);setPages([]);try{const r=await fetch("/api/creator-ai/ebook/plan",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({brief,requestedPages})});const raw=await r.text();let j:any;try{j=JSON.parse(raw)}catch{throw new Error("El servidor no devolvió un plan válido.")}if(!r.ok)throw new Error(j.error||"No se pudo planificar el ebook.");setPlan(j);setPages((j.pages||[]).map((p:PagePlan)=>({...p,status:"pending"})));}catch(e:any){setError(e.message)}finally{setPlanning(false)}}
 function pagePrompt(p:PagePlan){const s=plan?.styleBible||{};return `EBOOK: ${plan?.title||""}. STYLE BIBLE BLOQUEADA: concepto ${s.concept||"editorial premium"}; paleta ${s.primary||""} ${s.secondary||""} ${s.accent||""}; fondo ${s.background||""}; texto ${s.text||""}; tipografía display ${s.displayFont||"editorial"}; cuerpo ${s.bodyFont||"legible"}; fotografía ${s.photography||""}; diagramas ${s.diagrams||""}; composición ${s.composition||""}. Mantener el mismo ADN visual y variar el layout según el contenido. PÁGINA ${p.number}. Tipo: ${p.type}. Sección: ${p.section}. TÍTULO EXACTO: ${p.title}. SUBTÍTULO EXACTO: ${p.subtitle||""}. CUERPO EXACTO: ${p.body||""}. Objetivo: ${p.objective}. Visual: ${p.visual}. Función visual: ${p.visualFunction}. Composición: ${p.composition}. Relación texto/visual: ${p.textVisualRatio}. ${p.imagePrompt}`}
 async function generatePage(index:number){const p=pages[index];if(!p)return null;setCurrent(index+1);setPages(x=>x.map((q,i)=>i===index?{...q,status:"generating",error:""}:q));try{const r=await fetch("/api/creator-ai/ebook/image",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({page:p.number,total:pages.length,prompt:pagePrompt(p)})});const raw=await r.text();let j:any;try{j=JSON.parse(raw)}catch{throw new Error(`Respuesta inválida al generar página ${p.number}.`)}if(!r.ok)throw new Error(j.error||`No se pudo generar página ${p.number}.`);setPages(x=>x.map((q,i)=>i===index?{...q,image:j.image,storagePath:j.storagePath,status:"done"}:q));return j;}catch(e:any){setPages(x=>x.map((q,i)=>i===index?{...q,status:"error",error:e.message}:q));return null}}
 async function generateAll(){if(!pages.length||running)return;setRunning(true);setError("");setPdfUrl("");try{for(let i=0;i<pages.length;i++){if(pages[i]?.status==="done")continue;await generatePage(i)}}finally{setRunning(false);setCurrent(0)}}
 async function regen(i:number){if(running)return;setRunning(true);setPdfUrl("");try{await generatePage(i)}finally{setRunning(false);setCurrent(0)}}
 async function exportPdf(){const ready=pages.filter(p=>p.status==="done"&&p.storagePath&&p.image);if(ready.length!==pages.length){setError("Primero tienen que estar listas todas las páginas.");return}setExporting(true);setError("");try{const r=await fetch("/api/creator-ai/ebook/pdf",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({title:plan?.title||"ebook",storagePaths:ready.map(p=>p.storagePath),imageUrls:ready.map(p=>p.image)})});const raw=await r.text();let j:any;try{j=JSON.parse(raw)}catch{throw new Error("El servidor no devolvió una respuesta válida al crear el PDF.")}if(!r.ok)throw new Error(j.error||"No se pudo crear el PDF.");setPdfUrl(j.url);window.open(j.url,"_blank")}catch(e:any){setError(e.message)}finally{setExporting(false)}}
 async function downloadImage(p:PagePlan){if(!p.image)return;try{const r=await fetch(p.image);const b=await r.blob();const u=URL.createObjectURL(b);const a=document.createElement("a");a.href=u;a.download=`${String(p.number).padStart(3,"0")}_${p.type||"pagina"}.webp`;a.click();URL.revokeObjectURL(u)}catch{window.open(p.image,"_blank")}}
 return <section style={{maxWidth:1400,margin:"0 auto",padding:"24px 18px 80px"}}>
  <div style={{border:"1px solid #252535",borderRadius:24,padding:24,background:"linear-gradient(135deg,#11111b,#0b0b12)"}}><small style={{color:"#9b87ff",fontWeight:800}}>VYRAL · EBOOK ENGINE · CALIDAD MEDIA</small><h2 style={{fontSize:"clamp(28px,4vw,52px)",margin:"8px 0"}}>Pegá una sola vez. VYRAL arma el ebook completo.</h2><p style={{color:"#aaa",maxWidth:850}}>Un único brief. Blueprint, dirección de arte y una generación independiente por página. Calidad de imagen fija en Medium para equilibrar resultado, velocidad y costo. Al finalizar, VYRAL une las páginas sin remaquetarlas y entrega el PDF.</p>
   <div style={{display:"grid",gridTemplateColumns:"minmax(0,1fr) auto",gap:12,alignItems:"stretch",marginTop:18}}><textarea value={brief} onChange={e=>setBrief(e.target.value)} placeholder={"Pegá acá toda la información junta:\nTítulo, nicho, avatar, problema, transformación, subtemas, tono, marca, estética, colores, referencias y observaciones."} style={{width:"100%",minHeight:240,borderRadius:16,padding:18,background:"#09090f",color:"white",border:"1px solid #303044",fontSize:15,lineHeight:1.55}}/><button onClick={()=>setHelperOpen(true)} title="Obtener prompt para completar el brief con cualquier IA" style={{width:190,border:"1px solid rgba(151,113,255,.5)",borderRadius:18,padding:"18px 16px",background:"radial-gradient(circle at 30% 15%,rgba(124,92,255,.28),transparent 45%),linear-gradient(145deg,#171125,#0d0b14)",color:"white",cursor:"pointer",display:"flex",flexDirection:"column",justifyContent:"space-between",textAlign:"left",boxShadow:"0 0 34px rgba(124,92,255,.10)"}}><span style={{width:42,height:42,borderRadius:13,display:"grid",placeItems:"center",background:"#7c5cff",fontSize:20}}>✦</span><span><b style={{display:"block",fontSize:17,lineHeight:1.1}}>¿No sabés qué poner?</b><small style={{display:"block",color:"#aaa",marginTop:8,lineHeight:1.35}}>Pedile a cualquier IA que arme tu brief completo.</small></span><span style={{color:"#b9aaff",fontWeight:900,fontSize:12}}>OBTENER PROMPT →</span></button></div>
   <div style={{display:"flex",gap:12,alignItems:"end",flexWrap:"wrap",marginTop:14}}><label style={{display:"grid",gap:6}}><span style={{fontSize:12,color:"#aaa"}}>PÁGINAS</span><select value={requestedPages} onChange={e=>setRequestedPages(Number(e.target.value))} style={{background:"#09090f",color:"white",border:"1px solid #303044",borderRadius:12,padding:"12px 14px"}}>{Array.from({length:41},(_,i)=>i+5).map(n=><option key={n}>{n}</option>)}</select></label><button onClick={createPlan} disabled={planning||brief.trim().length<20} style={{border:0,borderRadius:14,padding:"13px 22px",fontWeight:900}}>{planning?"Creando Blueprint…":"✦ Crear estructura"}</button>{plan&&<button onClick={generateAll} disabled={running} style={{border:0,borderRadius:14,padding:"13px 22px",fontWeight:900,background:"#7c5cff",color:"white"}}>{running?`Generando ${current||done+1}/${pages.length}…`:`Generar ${pages.length} páginas`}</button>}{allDone&&<button onClick={exportPdf} disabled={exporting||running} style={{border:0,borderRadius:14,padding:"13px 22px",fontWeight:900,background:"#fff",color:"#09090f"}}>{exporting?"Armando PDF…":"↓ Descargar ebook PDF"}</button>}{pdfUrl&&<a href={pdfUrl} target="_blank" rel="noreferrer" style={{padding:"12px 16px",color:"#b9ffbf",fontWeight:800}}>PDF listo ✓</a>}</div>{error&&<p style={{color:"#ff7474",fontWeight:700}}>{error}</p>}
  </div>
  {helperOpen&&<div onClick={()=>setHelperOpen(false)} style={{position:"fixed",inset:0,zIndex:1000,background:"rgba(0,0,0,.78)",backdropFilter:"blur(10px)",display:"grid",placeItems:"center",padding:20}}><div onClick={e=>e.stopPropagation()} style={{width:"min(900px,96vw)",maxHeight:"88vh",overflow:"hidden",border:"1px solid #33285a",borderRadius:24,background:"linear-gradient(145deg,#12101b,#08080d)",boxShadow:"0 30px 100px rgba(0,0,0,.65)"}}><div style={{padding:"22px 24px 16px",display:"flex",justifyContent:"space-between",gap:20,borderBottom:"1px solid #24202f"}}><div><small style={{color:"#9b87ff",fontWeight:900}}>ASISTENTE DE BRIEF</small><h3 style={{fontSize:26,margin:"5px 0 4px"}}>Pedíselo a la IA que quieras.</h3><p style={{color:"#999",margin:0}}>Copiá este prompt en ChatGPT, Claude, Gemini o cualquier otra IA. Después pegá acá el brief que te devuelva.</p></div><button onClick={()=>setHelperOpen(false)} style={{alignSelf:"start",border:"1px solid #333",background:"#15151d",color:"white",borderRadius:12,width:38,height:38,cursor:"pointer"}}>×</button></div><div style={{padding:20}}><textarea readOnly value={AI_BRIEF_PROMPT} style={{width:"100%",height:"min(52vh,520px)",resize:"none",border:"1px solid #2c2940",borderRadius:16,padding:16,background:"#08080d",color:"#ddd",fontSize:13,lineHeight:1.55}}/><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,marginTop:14,flexWrap:"wrap"}}><small style={{color:"#777"}}>Incluye título, avatar, problema, transformación, contenido, tono, dirección visual, paleta, portada, recursos, marca y restricciones.</small><button onClick={copyHelper} style={{border:0,borderRadius:13,padding:"12px 20px",background:copied?"#33c878":"#7c5cff",color:"white",fontWeight:900,cursor:"pointer"}}>{copied?"✓ Copiado":"Copiar prompt completo"}</button></div></div></div></div>}
  {plan&&<><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:12,margin:"18px 0"}}><div style={{padding:16,border:"1px solid #252535",borderRadius:16}}><small>PROMESA</small><b style={{display:"block",marginTop:6}}>{plan.promise}</b></div><div style={{padding:16,border:"1px solid #252535",borderRadius:16}}><small>TRANSFORMACIÓN</small><b style={{display:"block",marginTop:6}}>{plan.transformation}</b></div><div style={{padding:16,border:"1px solid #252535",borderRadius:16}}><small>PROGRESO</small><b style={{display:"block",marginTop:6}}>{done}/{pages.length} páginas listas</b></div></div><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(240px,1fr))",gap:14}}>{pages.map((p,i)=><article key={p.number} style={{border:"1px solid #252535",borderRadius:18,overflow:"hidden",background:"#101018"}}>{p.image?<img src={p.image} alt={p.title} style={{width:"100%",aspectRatio:"4/5",objectFit:"contain",background:"#07070b"}}/>:<div style={{aspectRatio:"4/5",display:"grid",placeItems:"center",padding:20,textAlign:"center",background:"#09090f"}}><div><b style={{fontSize:36,opacity:.3}}>{String(p.number).padStart(2,"0")}</b><h3>{p.title}</h3><small style={{color:p.status==="error"?"#ff7474":"#999"}}>{p.status==="generating"?"GENERANDO…":p.status==="error"?p.error:"EN COLA"}</small></div></div>}<div style={{padding:14}}><small style={{color:"#8d7aff"}}>PÁGINA {p.number} · {p.type}</small><b style={{display:"block",margin:"5px 0 10px"}}>{p.title}</b><div style={{display:"flex",gap:8}}><button disabled={running} onClick={()=>regen(i)} style={{padding:"8px 10px",borderRadius:10,border:"1px solid #333",background:"#181824",color:"white"}}>{p.image?"Regenerar":"Generar"}</button>{p.image&&<button onClick={()=>downloadImage(p)} style={{padding:"8px 10px",borderRadius:10,border:"1px solid #333",background:"#181824",color:"white"}}>Descargar</button>}</div></div></article>)}</div></>}
 </section>
}
