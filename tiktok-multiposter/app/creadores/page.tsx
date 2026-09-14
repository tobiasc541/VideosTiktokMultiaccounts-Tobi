import Link from "next/link";
import { getCustomerSession } from "../../lib/auth";
import { supabaseAdmin } from "../../lib/supabase-admin";
import "./creator.css";

export const dynamic = "force-dynamic";

export default async function CreatorPage({ searchParams }: { searchParams: Promise<{ sent?: string }> }) {
  const session = await getCustomerSession();
  const q = await searchParams;
  let meta: Record<string, any> = {};
  if (session) {
    const client = supabaseAdmin();
    const { data } = await client.auth.admin.getUserById(session.userId);
    meta = data.user?.user_metadata || {};
  }
  const status = String(meta.creator_status || "none");
  const code = String(meta.creator_code || "");
  const referrals = Number(meta.creator_referrals || 0);
  const revenue = Number(meta.creator_revenue || 0);
  const commission = Number(meta.creator_commission || 0);

  return <main className="creatorPage"><div className="creatorGlow"/><section className="creatorShell">
    <header><div className="creatorBrand">V<span>Y</span>RAL</div><Link href={session ? "/" : "/login"}>← Volver</Link></header>
    <div className="creatorHero"><small>VYRAL CREATOR PROGRAM</small><h1>Tu audiencia.<br/><em>Tu ingreso recurrente.</em></h1><p>Compartí VYRAL con tu comunidad y recibí el 10% de cada suscripción activa atribuida a tu código, mes a mes.</p><div className="creatorPills"><span>10% recurrente</span><span>Código personal</span><span>Panel de rendimiento</span></div></div>

    {!session ? <section className="creatorGate"><h2>Convertite en Creator Viral.</h2><p>Primero necesitás una cuenta VYRAL para solicitar tu código promocional.</p><div><Link href="/registro">Crear cuenta →</Link><Link href="/login" className="ghost">Ya tengo cuenta</Link></div></section> : status === "approved" ? <>
      <section className="creatorApproved"><div><small>CREATOR VIRAL · APROBADO</small><h2>Bienvenido al programa.</h2><p>Tu código ya está activo. Compartilo en tus redes y empezá a construir una comisión recurrente.</p></div><div className="creatorCode"><span>TU CÓDIGO</span><strong>{code}</strong></div></section>
      <section className="creatorStats"><article><span>Usuarios con tu código</span><strong>{referrals}</strong></article><article><span>Facturación atribuida</span><strong>US$ {revenue.toFixed(2)}</strong></article><article><span>Comisión acumulada</span><strong>US$ {commission.toFixed(2)}</strong><small>10% recurrente</small></article></section>
      <section className="creatorShare"><small>KIT DE DIFUSIÓN</small><h2>Beneficio para tu comunidad</h2><p>Tu audiencia podrá acceder a promociones especiales usando <b>{code}</b>. El descuento vigente se mostrará y validará en el checkout.</p><div className="creatorShareCard"><span>VYRAL CREATOR</span><h3>50% OFF</h3><p>Usá el código</p><strong>{code}</strong><small>Publicá una vez. Multiplicá tu alcance.</small></div></section>
    </> : status === "pending" ? <section className="creatorGate pending"><h2>Solicitud en revisión.</h2><p>Recibimos tu solicitud. Cuando sea aprobada o rechazada vas a verlo automáticamente en tu panel.</p></section> : status === "rejected" ? <section className="creatorGate rejected"><h2>Solicitud no aprobada.</h2><p>Por el momento no pudimos activar tu código. Podés volver a solicitarlo más adelante cuando tu perfil tenga más actividad.</p><form action="/api/creator/request" method="post"><button>Solicitar nuevamente →</button></form></section> : <section className="creatorApply"><div><small>SOLICITUD</small><h2>Solicitá tu código promocional.</h2><p>Contanos dónde creás contenido. Revisaremos tu perfil y, si es aprobado, VYRAL te asignará un código corto basado en tu nombre.</p></div>{q.sent === "1" && <div className="creatorNotice">Solicitud enviada correctamente.</div>}<form action="/api/creator/request" method="post"><label>Usuario / nombre público</label><input name="handle" placeholder="Ej: @tobiascarrizo" required maxLength={60}/><label>Red principal</label><select name="platform" defaultValue="instagram"><option value="instagram">Instagram</option><option value="tiktok">TikTok</option><option value="youtube">YouTube</option><option value="other">Otra</option></select><label>Contanos brevemente sobre tu audiencia</label><textarea name="note" placeholder="Temática, comunidad, alcance aproximado..." maxLength={500}/><button>Enviar solicitud →</button></form></section>}
  </section></main>;
}
