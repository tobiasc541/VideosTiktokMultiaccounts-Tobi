"use client";

import {useEffect} from "react";

type Lang="es"|"en"|"pt"|"ar"|"fr"|"de"|"it"|"nl"|"ja";
type T={en:string;pt:string;ar:string};

const M:Record<string,T>={
"+ Conectar TikTok":{en:"+ Connect TikTok",pt:"+ Conectar TikTok",ar:"+ ربط TikTok"},
"Conectar TikTok":{en:"Connect TikTok",pt:"Conectar TikTok",ar:"ربط TikTok"},
"3 cuentas conectadas":{en:"3 connected accounts",pt:"3 contas conectadas",ar:"3 حسابات متصلة"},
"Hasta 30 cuentas":{en:"Up to 30 accounts",pt:"Até 30 contas",ar:"حتى 30 حساباً"},
"500 videos por mes":{en:"500 videos per month",pt:"500 vídeos por mês",ar:"500 فيديو شهرياً"},
"Publicación multicuentas":{en:"Multi-account publishing",pt:"Publicação multicontas",ar:"نشر متعدد الحسابات"},
"Historial":{en:"History",pt:"Histórico",ar:"السجل"},
"Soporte 24/7":{en:"24/7 Support",pt:"Suporte 24/7",ar:"دعم 24/7"},
"VYRAL Intelligence avanzado":{en:"Advanced VYRAL Intelligence",pt:"VYRAL Intelligence avançado",ar:"VYRAL Intelligence متقدم"},
"Cambiar plan":{en:"Change plan",pt:"Alterar plano",ar:"تغيير الخطة"},
"Tu audiencia.":{en:"Your audience.",pt:"Sua audiência.",ar:"جمهورك."},
"Tu ingreso recurrente.":{en:"Your recurring income.",pt:"Sua renda recorrente.",ar:"دخلك المتكرر."},
"Compartí VYRAL con tu comunidad y recibí el 10% de cada suscripción activa atribuida a tu código, mes a mes.":{en:"Share VYRAL with your community and earn 10% of every active subscription attributed to your code, month after month.",pt:"Compartilhe o VYRAL com sua comunidade e receba 10% de cada assinatura ativa atribuída ao seu código, mês a mês.",ar:"شارك VYRAL مع مجتمعك واحصل على 10٪ من كل اشتراك نشط منسوب إلى رمزك شهرياً."},
"Código personal":{en:"Personal code",pt:"Código pessoal",ar:"رمز شخصي"},
"Panel de rendimiento":{en:"Performance dashboard",pt:"Painel de desempenho",ar:"لوحة الأداء"},
"Bienvenido al programa.":{en:"Welcome to the program.",pt:"Bem-vindo ao programa.",ar:"مرحباً بك في البرنامج."},
"Tu código ya está activo. Compartilo en tus redes y empezá a construir una comisión recurrente.":{en:"Your code is active. Share it on your channels and start building recurring commission.",pt:"Seu código já está ativo. Compartilhe nas suas redes e comece a construir uma comissão recorrente.",ar:"رمزك نشط الآن. شاركه على شبكاتك وابدأ ببناء عمولة متكررة."},
"TU CÓDIGO":{en:"YOUR CODE",pt:"SEU CÓDIGO",ar:"رمزك"},
"Usuarios con tu código":{en:"Users with your code",pt:"Usuários com seu código",ar:"المستخدمون برمزك"},
"Facturación atribuida":{en:"Attributed revenue",pt:"Faturamento atribuído",ar:"الإيرادات المنسوبة"},
"Comisión acumulada":{en:"Accumulated commission",pt:"Comissão acumulada",ar:"العمولة المتراكمة"},
"KIT DE DIFUSIÓN":{en:"SHARING KIT",pt:"KIT DE DIVULGAÇÃO",ar:"حزمة المشاركة"},
"Beneficio para tu comunidad":{en:"Benefit for your community",pt:"Benefício para sua comunidade",ar:"ميزة لمجتمعك"},
"Tu audiencia podrá acceder a promociones especiales usando":{en:"Your audience can access special promotions using",pt:"Sua audiência poderá acessar promoções especiais usando",ar:"يمكن لجمهورك الوصول إلى عروض خاصة باستخدام"},
"Usá el código":{en:"Use the code",pt:"Use o código",ar:"استخدم الرمز"},
"Publicá una vez. Multiplicá tu alcance.":{en:"Publish once. Multiply your reach.",pt:"Publique uma vez. Multiplique seu alcance.",ar:"انشر مرة واحدة. ضاعف وصولك."},
"SOPORTE 24/7 · ACTUALIZACIÓN AUTOMÁTICA":{en:"24/7 SUPPORT · AUTO REFRESH",pt:"SUPORTE 24/7 · ATUALIZAÇÃO AUTOMÁTICA",ar:"دعم 24/7 · تحديث تلقائي"},
"ASISTENCIA DIRECTA":{en:"DIRECT ASSISTANCE",pt:"ATENDIMENTO DIRETO",ar:"مساعدة مباشرة"},
"Estamos para ayudarte.":{en:"We're here to help.",pt:"Estamos aqui para ajudar.",ar:"نحن هنا لمساعدتك."},
"Sin vueltas.":{en:"Straightforward.",pt:"Sem enrolação.",ar:"بلا تعقيد."},
"Dejanos tu consulta. Esta conversación se actualiza sola cada 5 segundos cuando llega una respuesta.":{en:"Send us your question. This conversation refreshes automatically every 5 seconds when a reply arrives.",pt:"Envie sua dúvida. Esta conversa é atualizada automaticamente a cada 5 segundos quando chega uma resposta.",ar:"أرسل استفسارك. يتم تحديث هذه المحادثة تلقائياً كل 5 ثوانٍ عند وصول رد."},
"Estado":{en:"Status",pt:"Status",ar:"الحالة"},
"Respondido":{en:"Answered",pt:"Respondido",ar:"تم الرد"},
"En revisión":{en:"Under review",pt:"Em análise",ar:"قيد المراجعة"},
"Listo para recibir tu consulta":{en:"Ready for your question",pt:"Pronto para receber sua dúvida",ar:"جاهز لاستقبال استفسارك"},
"NUEVA CONSULTA":{en:"NEW REQUEST",pt:"NOVA SOLICITAÇÃO",ar:"استفسار جديد"},
"Asunto":{en:"Subject",pt:"Assunto",ar:"الموضوع"},
"Ej: Problema al conectar una cuenta":{en:"E.g. Problem connecting an account",pt:"Ex.: Problema ao conectar uma conta",ar:"مثال: مشكلة في ربط حساب"},
"Mensaje":{en:"Message",pt:"Mensagem",ar:"الرسالة"},
"Contanos qué pasó, qué estabas intentando hacer y qué necesitás resolver.":{en:"Tell us what happened, what you were trying to do and what you need resolved.",pt:"Conte o que aconteceu, o que você estava tentando fazer e o que precisa resolver.",ar:"أخبرنا بما حدث وما الذي كنت تحاول فعله وما الذي تحتاج إلى حله."},
"Enviar consulta":{en:"Send request",pt:"Enviar solicitação",ar:"إرسال الاستفسار"},
"Tu consulta queda registrada en tu cuenta y llega al panel interno de soporte.":{en:"Your request is saved to your account and sent to the internal support panel.",pt:"Sua solicitação fica registrada na sua conta e chega ao painel interno de suporte.",ar:"يتم حفظ استفسارك في حسابك وإرساله إلى لوحة الدعم الداخلية."},
"CONVERSACIÓN ACTIVA · LIVE":{en:"ACTIVE CONVERSATION · LIVE",pt:"CONVERSA ATIVA · LIVE",ar:"محادثة نشطة · مباشر"},
"Chat con VYRAL":{en:"Chat with VYRAL",pt:"Chat com VYRAL",ar:"الدردشة مع VYRAL"},
"mensajes":{en:"messages",pt:"mensagens",ar:"رسائل"},
"Todo tu rendimiento, en un solo lugar.":{en:"All your performance, in one place.",pt:"Todo o seu desempenho, em um só lugar.",ar:"كل أدائك في مكان واحد."},
"Vistas combinadas · últimos 30 días":{en:"Combined views · last 30 days",pt:"Visualizações combinadas · últimos 30 dias",ar:"المشاهدات المجمعة · آخر 30 يوماً"},
"¿Qué aportó la distribución?":{en:"What did distribution add?",pt:"O que a distribuição trouxe?",ar:"ماذا أضاف التوزيع؟"},
"Alcance combinado":{en:"Combined reach",pt:"Alcance combinado",ar:"الوصول المجمع"},
"vistas entre 4 cuentas":{en:"views across 4 accounts",pt:"visualizações em 4 contas",ar:"مشاهدات عبر 4 حسابات"},
"Vistas adicionales":{en:"Additional views",pt:"Visualizações adicionais",ar:"مشاهدات إضافية"},
"Multiplicador de distribución":{en:"Distribution multiplier",pt:"Multiplicador de distribuição",ar:"مضاعف التوزيع"},
"Rendimiento por cuenta":{en:"Performance by account",pt:"Desempenho por conta",ar:"الأداء حسب الحساب"},
"CUENTA":{en:"ACCOUNT",pt:"CONTA",ar:"الحساب"},
"VISTAS":{en:"VIEWS",pt:"VISUALIZAÇÕES",ar:"المشاهدات"},
"LIKES":{en:"LIKES",pt:"CURTIDAS",ar:"الإعجابات"},
"COMENTARIOS":{en:"COMMENTS",pt:"COMENTÁRIOS",ar:"التعليقات"}
};

function lang():Lang{try{return (localStorage.getItem("vyral-lang")||"es") as Lang}catch{return"es"}}
function tr(value:string,l:Lang){if(l==="es")return value;const target=l==="pt"?"pt":l==="ar"?"ar":"en";let out=value;const entries=Object.entries(M).sort((a,b)=>b[0].length-a[0].length);for(const [src,t] of entries){if(out.includes(src))out=out.replaceAll(src,t[target]);}return out}
function apply(root:Node,l:Lang){const w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);let n=w.nextNode() as Text|null;while(n){const p=n.parentElement;if(p&&!['SCRIPT','STYLE','TEXTAREA'].includes(p.tagName)){const v=n.nodeValue||'';const nv=tr(v,l);if(nv!==v)n.nodeValue=nv;}n=w.nextNode() as Text|null;}if(root instanceof Element){[root,...Array.from(root.querySelectorAll('*'))].forEach((el:any)=>{for(const a of ['placeholder','aria-label','title']){const v=el.getAttribute?.(a);if(v){const nv=tr(v,l);if(nv!==v)el.setAttribute(a,nv)}}})}}

export default function LocaleResidualFix(){useEffect(()=>{const l=lang();apply(document.body,l);const obs=new MutationObserver(rs=>{const current=lang();for(const r of rs){r.addedNodes.forEach(n=>apply(n,current));if(r.type==='characterData')apply(r.target,current)}});obs.observe(document.body,{childList:true,subtree:true,characterData:true});return()=>obs.disconnect()},[]);return null}
