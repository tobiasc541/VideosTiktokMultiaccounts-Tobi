"use client";

import {useEffect,useMemo,useState} from "react";

type Lang="es"|"en"|"ar"|"pt"|"fr"|"de"|"it"|"nl"|"ja";
type Faq={q:string;a:string;keys:string[]};

const FAQS_ES:Faq[]=[
{q:"¿Cómo conecto una cuenta de TikTok?",a:"Entrá a Cuentas o tocá + Conectar TikTok. TikTok te va a pedir autorización y, cuando termine, la cuenta vuelve automáticamente a tu panel VYRAL.",keys:["conectar","cuenta","tiktok"]},
{q:"¿Cuántos videos puedo publicar?",a:"Inicio incluye 50 videos por mes, Crecimiento 200 y Escala 500. Un video cargado consume 1 crédito aunque lo distribuyas a varias cuentas.",keys:["videos","creditos","créditos","limite","límite"]},
{q:"¿Cómo funciona la publicación multicuentas?",a:"Subís un solo video, elegís las cuentas destino, definís descripción y privacidad y VYRAL distribuye la publicación desde un único flujo.",keys:["publicar","multicuenta","varias","distribuir"]},
{q:"¿Cómo cancelo mi plan?",a:"Entrá en Tu cuenta y tocá Solicitar cancelación. La solicitud llega al soporte y, cuando sea aprobada, conservás acceso hasta la fecha final de tu período.",keys:["cancelar","cancelación","cancelacion","plan"]},
{q:"¿Cuándo se renuevan mis créditos?",a:"Los créditos se renuevan mensualmente con tu ciclo de plan. En Tu cuenta podés ver consumo, saldo restante y estado de la suscripción.",keys:["renuevan","mes","saldo","restantes"]},
{q:"¿Qué incluye Soporte 24/7?",a:"Podés abrir una consulta desde VYRAL, seguir la conversación y recibir las respuestas del equipo sin salir de tu cuenta.",keys:["soporte","agente","ayuda"]}
];
const FAQS_EN:Faq[]=[
{q:"How do I connect a TikTok account?",a:"Open Accounts or click + Connect TikTok. TikTok will ask for authorization and, when it finishes, the account returns automatically to your VYRAL dashboard.",keys:["connect","account","tiktok"]},
{q:"How many videos can I publish?",a:"Starter includes 50 videos per month, Growth 200 and Scale 500. One uploaded video uses 1 credit even when you distribute it to multiple accounts.",keys:["videos","credits","limit"]},
{q:"How does multi-account publishing work?",a:"Upload one video, choose the destination accounts, set the caption and privacy, and VYRAL distributes it from one workflow.",keys:["publish","multi","accounts","distribute"]},
{q:"How do I cancel my plan?",a:"Open Your account and click Request cancellation. Support receives the request and, once approved, you keep access until the end of your current period.",keys:["cancel","plan"]},
{q:"When do my credits renew?",a:"Credits renew monthly with your plan cycle. In Your account you can see usage, remaining balance and subscription status.",keys:["renew","credits","balance"]},
{q:"What does 24/7 Support include?",a:"You can open a request from VYRAL, follow the conversation and receive team replies without leaving your account.",keys:["support","agent","help"]}
];
const FAQS_PT:Faq[]=[
{q:"Como conecto uma conta do TikTok?",a:"Abra Contas ou clique em + Conectar TikTok. O TikTok pedirá autorização e, ao finalizar, a conta volta automaticamente ao seu painel VYRAL.",keys:["conectar","conta","tiktok"]},
{q:"Quantos vídeos posso publicar?",a:"Inicial inclui 50 vídeos por mês, Crescimento 200 e Escala 500. Um vídeo enviado consome 1 crédito mesmo quando é distribuído para várias contas.",keys:["vídeos","videos","créditos","creditos","limite"]},
{q:"Como funciona a publicação multicontas?",a:"Envie um único vídeo, escolha as contas de destino, defina a descrição e a privacidade e o VYRAL distribui tudo a partir de um único fluxo.",keys:["publicar","multicontas","distribuir"]},
{q:"Como cancelo meu plano?",a:"Abra Sua conta e clique em Solicitar cancelamento. O suporte recebe a solicitação e, depois da aprovação, você mantém o acesso até o fim do período atual.",keys:["cancelar","plano"]},
{q:"Quando meus créditos são renovados?",a:"Os créditos são renovados mensalmente com o ciclo do seu plano. Em Sua conta você vê consumo, saldo restante e status da assinatura.",keys:["renovados","créditos","saldo"]},
{q:"O que inclui o Suporte 24/7?",a:"Você pode abrir uma solicitação pelo VYRAL, acompanhar a conversa e receber respostas da equipe sem sair da sua conta.",keys:["suporte","agente","ajuda"]}
];
const FAQS_AR:Faq[]=[
{q:"كيف أربط حساب TikTok؟",a:"افتح قسم الحسابات أو اضغط على + ربط TikTok. سيطلب TikTok التفويض، وبعد الانتهاء سيعود الحساب تلقائياً إلى لوحة VYRAL.",keys:["tiktok","حساب","ربط"]},
{q:"كم فيديو يمكنني نشره؟",a:"تتضمن خطة البداية 50 فيديو شهرياً، والنمو 200، والتوسع 500. يستهلك الفيديو المرفوع رصيداً واحداً حتى لو تم توزيعه على عدة حسابات.",keys:["فيديو","رصيد","نشر"]},
{q:"كيف يعمل النشر متعدد الحسابات؟",a:"ارفع فيديو واحداً، واختر الحسابات المستهدفة، وحدد الوصف والخصوصية، ثم يقوم VYRAL بالتوزيع من مسار واحد.",keys:["نشر","حسابات","توزيع"]},
{q:"كيف ألغي خطتي؟",a:"افتح حسابك واضغط على طلب الإلغاء. يصل الطلب إلى الدعم، وبعد الموافقة يستمر وصولك حتى نهاية الفترة الحالية.",keys:["إلغاء","خطة"]},
{q:"متى يتم تجديد رصيدي؟",a:"يتم تجديد الرصيد شهرياً مع دورة خطتك. في حسابك يمكنك رؤية الاستهلاك والرصيد المتبقي وحالة الاشتراك.",keys:["تجديد","رصيد"]},
{q:"ماذا يشمل دعم 24/7؟",a:"يمكنك فتح طلب من داخل VYRAL ومتابعة المحادثة واستلام ردود الفريق دون مغادرة حسابك.",keys:["دعم","مساعدة"]}
];

function copy(lang:Lang){if(lang==="es")return FAQS_ES;if(lang==="pt")return FAQS_PT;if(lang==="ar")return FAQS_AR;return FAQS_EN}
function ui(lang:Lang){if(lang==="ar")return{faq:"الأسئلة الشائعة",assistant:"مساعد فوري",answer:"الإجابة",placeholder:"اكتب سؤالك…",ask:"اسأل ↗",specific:"هل تحتاج إلى مساعدة خاصة بحسابك؟",agent:"تحدث مع وكيل →",initial:"اختر سؤالاً شائعاً أو اكتب سؤالك لتحصل على إجابة فورية.",fallback:"لم أجد إجابة دقيقة بما يكفي. تواصل مع دعم 24/7 ليقوم أحد أعضاء الفريق بمراجعة حالتك."};if(lang==="pt")return{faq:"PERGUNTAS FREQUENTES",assistant:"Assistente imediato",answer:"RESPOSTA",placeholder:"Escreva sua pergunta…",ask:"Perguntar ↗",specific:"Precisa de ajuda específica com sua conta?",agent:"Falar com um agente →",initial:"Escolha uma pergunta frequente ou escreva sua dúvida para receber uma resposta imediata.",fallback:"Não encontrei uma resposta precisa o suficiente. Fale com o Suporte 24/7 para que a equipe analise seu caso."};if(lang==="es")return{faq:"PREGUNTAS FRECUENTES",assistant:"Asistente inmediato",answer:"RESPUESTA",placeholder:"Escribí tu pregunta…",ask:"Preguntar ↗",specific:"¿Necesitás ayuda específica con tu cuenta?",agent:"Hablar con un agente →",initial:"Elegí una pregunta frecuente o escribí tu duda para recibir una respuesta inmediata.",fallback:"No encontré una respuesta suficientemente precisa para eso. Te conviene hablar con Soporte 24/7 para que un agente revise tu caso."};return{faq:"FREQUENTLY ASKED QUESTIONS",assistant:"Instant assistant",answer:"ANSWER",placeholder:"Type your question…",ask:"Ask ↗",specific:"Need specific help with your account?",agent:"Talk to an agent →",initial:"Choose a common question or type yours to get an instant answer.",fallback:"I could not find a precise enough answer. Contact 24/7 Support so the team can review your case."}}

export default function FaqAssistant(){
 const[lang,setLang]=useState<Lang>(()=>{if(typeof window==="undefined")return"es";try{return(localStorage.getItem("vyral-lang")||"es") as Lang}catch{return"es"}});const[question,setQuestion]=useState("");const[answer,setAnswer]=useState("");
 useEffect(()=>{const handler=(e:Event)=>{const next=((e as CustomEvent<{lang:Lang}>).detail?.lang||"es") as Lang;setLang(next);setQuestion("");setAnswer("")};window.addEventListener("vyral:locale",handler as EventListener);return()=>window.removeEventListener("vyral:locale",handler as EventListener)},[]);
 const faqs=useMemo(()=>copy(lang),[lang]);const labels=ui(lang);const visibleAnswer=answer||labels.initial;
 function answerFor(text:string){const value=text.toLowerCase();let best=faqs[0],score=0;for(const faq of faqs){const hits=faq.keys.filter(k=>value.includes(k.toLowerCase())).length;if(hits>score){score=hits;best=faq}}return score?best.a:labels.fallback}
 return <div className="faqGrid">
  <section className="faqList"><small>{labels.faq}</small>{faqs.map(f=><button key={f.q} onClick={()=>{setQuestion(f.q);setAnswer(f.a)}}>{f.q}<span>↗</span></button>)}</section>
  <section className="faqAssistant"><div className="faqAiTop"><div><small>VYRAL HELP</small><strong>{labels.assistant}</strong></div><span>● ONLINE</span></div><div className="faqAnswer"><small>{labels.answer}</small><p>{visibleAnswer}</p></div><form onSubmit={e=>{e.preventDefault();if(question.trim())setAnswer(answerFor(question))}}><input value={question} onChange={e=>setQuestion(e.target.value)} placeholder={labels.placeholder}/><button>{labels.ask}</button></form><div className="faqEscalate"><span>{labels.specific}</span><a href="/soporte">{labels.agent}</a></div></section>
 </div>
}
