'use client';

import {useEffect,useRef,useState} from 'react';
import './ebook-circular-showcase.css';

type Item={src:string;alt:string;label:string};

const items:Item[]=[
 {src:'https://cdn.simpleicons.org/instagram/E4405F',alt:'Instagram',label:'Instagram'},
 {src:'https://cdn.simpleicons.org/facebook/1877F2',alt:'Facebook',label:'Facebook'},
 {src:'https://cdn.simpleicons.org/tiktok/ffffff',alt:'TikTok',label:'TikTok'},
 {src:'https://cdn.simpleicons.org/whatsapp/25D366',alt:'WhatsApp',label:'WhatsApp'},
 {src:'https://cdn.simpleicons.org/youtube/FF0000',alt:'YouTube',label:'YouTube'},
 {src:'https://cdn.simpleicons.org/shopify/7AB55C',alt:'Shopify',label:'Shopify'},
 {src:'https://cdn.simpleicons.org/canva/00C4CC',alt:'Canva',label:'Canva'},
 {src:'https://cdn.simpleicons.org/meta/0081FB',alt:'Meta',label:'Meta'}
];

export default function EbookCircularShowcase(){
 const root=useRef<HTMLDivElement>(null);
 const [dragging,setDragging]=useState(false);
 const angle=useRef(0);
 const velocity=useRef(-27);
 const pointer=useRef<{x:number;angle:number}|null>(null);
 const hover=useRef(false);

 useEffect(()=>{
  let raf=0,last=performance.now();
  const frame=(now:number)=>{
   const dt=Math.min((now-last)/1000,.05);last=now;
   if(!dragging&&!hover.current) velocity.current+=( -27-velocity.current)*(1-Math.exp(-dt/1.1));
   else if(!dragging) velocity.current*=Math.exp(-dt*2.4);
   angle.current+=velocity.current*dt;
   if(root.current) root.current.style.setProperty('--ebook-ring-angle',`${angle.current}deg`);
   raf=requestAnimationFrame(frame);
  };
  raf=requestAnimationFrame(frame);
  return()=>cancelAnimationFrame(raf);
 },[dragging]);

 const down=(e:React.PointerEvent)=>{if(e.button!==0)return;pointer.current={x:e.clientX,angle:angle.current};velocity.current=0;setDragging(true);e.currentTarget.setPointerCapture(e.pointerId)};
 const move=(e:React.PointerEvent)=>{if(!pointer.current)return;const delta=e.clientX-pointer.current.x;angle.current=pointer.current.angle+delta*.24;velocity.current=delta*.45};
 const up=()=>{pointer.current=null;setDragging(false)};

 return <section className="ebookCarouselShell" aria-label="Ecosistema de contenido VYRAL">
  <div className="ebookCarouselGlow"/>
  <div className="ebookCarouselCopy"><small>VYRAL · DIGITAL PRODUCT ENGINE</small><h2>Convertí tus ideas en productos que <em>venden.</em></h2><p>Contenido, audiencia y distribución girando alrededor de una misma oferta.</p></div>
  <div className="ebookCarouselViewport" ref={root} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onPointerEnter={()=>hover.current=true} onPointerLeave={()=>{hover.current=false;up()}} data-dragging={dragging?'':undefined}>
   <div className="ebookCarouselStage"><div className="ebookCarouselCamera"><div className="ebookCarouselRing">
    {items.map((item,i)=><article className="ebookCarouselCard" key={item.label} style={{'--i':i,'--count':items.length} as React.CSSProperties}>
      <div className="ebookCarouselCardInner"><img src={item.src} alt={item.alt} draggable={false}/><span>{item.label}</span></div>
    </article>)}
   </div></div></div>
  </div>
  <div className="ebookCarouselHint">ARRASTRÁ PARA EXPLORAR · AUTOPLAY</div>
 </section>;
}
