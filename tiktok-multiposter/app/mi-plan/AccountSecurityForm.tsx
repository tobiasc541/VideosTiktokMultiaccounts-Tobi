"use client";
import {useState} from "react";

export default function AccountSecurityForm({email}:{email:string}){
 const[currentPassword,setCurrentPassword]=useState("");
 const[newPassword,setNewPassword]=useState("");
 const[confirm,setConfirm]=useState("");
 const[loading,setLoading]=useState(false);
 const[msg,setMsg]=useState("");
 const[ok,setOk]=useState(false);
 async function submit(e:React.FormEvent){
  e.preventDefault();setMsg("");setOk(false);
  if(newPassword!==confirm){setMsg("Las nuevas contraseñas no coinciden.");return}
  setLoading(true);
  try{
   const res=await fetch("/api/account/change-password",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({currentPassword,newPassword})});
   const data=await res.json().catch(()=>({}));
   if(!res.ok)throw new Error(data.error||"No se pudo actualizar la contraseña.");
   setOk(true);setMsg("Contraseña actualizada correctamente.");setCurrentPassword("");setNewPassword("");setConfirm("");
  }catch(err:any){setMsg(err.message||"No se pudo actualizar la contraseña.")}finally{setLoading(false)}
 }
 return <section className="myAccountSecurity">
   <div className="myAccountIdentity"><div><small>CUENTA</small><h2>Acceso y seguridad</h2><p>Administrá los datos esenciales de tu cuenta VYRAL.</p></div><div className="myAccountEmail"><span>CORREO ASOCIADO</span><strong>{email}</strong><small>Este correo identifica tu cuenta.</small></div></div>
   <form onSubmit={submit} className="myPasswordForm">
     <div><label>Contraseña actual</label><input type="password" value={currentPassword} onChange={e=>setCurrentPassword(e.target.value)} autoComplete="current-password" required/></div>
     <div><label>Nueva contraseña</label><input type="password" value={newPassword} onChange={e=>setNewPassword(e.target.value)} autoComplete="new-password" minLength={8} required/><small>Mínimo 8 caracteres.</small></div>
     <div><label>Repetir nueva contraseña</label><input type="password" value={confirm} onChange={e=>setConfirm(e.target.value)} autoComplete="new-password" minLength={8} required/></div>
     <button type="submit" disabled={loading}>{loading?"Actualizando…":"Cambiar contraseña ↗"}</button>
   </form>
   {msg&&<div className={`myPasswordMessage ${ok?"ok":"err"}`}>{msg}</div>}
 </section>
}
