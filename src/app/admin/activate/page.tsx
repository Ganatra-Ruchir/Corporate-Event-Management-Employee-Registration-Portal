"use client";
import {Suspense,useState} from "react";
import {useSearchParams} from "next/navigation";
import {ArrowRight,ShieldCheck} from "lucide-react";
import "./activate.css";
function AdminActivation(){
 const params=useSearchParams();
 const token=params.get("token")||"";
 const [name,setName]=useState("");
 const [password,setPassword]=useState("");
 const [confirm,setConfirm]=useState("");
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState("");
 async function submit(e:React.FormEvent){
  e.preventDefault();
  if(password!==confirm){setError("Passwords don't match");return;}
  setBusy(true);setError("");
  try{
   const r=await fetch("/api/portal/activate-admin",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({token,name,password})});
   const result=await r.json();
   if(!r.ok){setError(result.error||"Activation failed");return;}
   window.location.assign("/");
  }catch{setError("Unable to reach the server. Try again.");}
  finally{setBusy(false);}
 }
 return <main className="admin-activation">
  <section className="admin-activation-panel">
   <span className="admin-activation-icon"><ShieldCheck size={24}/></span>
   <span className="admin-activation-eyebrow">ELIXIR EVENTS PORTAL · STAGING</span>
   <h1>Set up Platform Admin</h1>
   <p>Use this one-time invitation to activate the first administrator account. Choose a unique password that you don't use elsewhere.</p>
   {!token?<div className="admin-activation-error" role="alert">This page requires a valid activation link sent to your work email.</div>:
    <form onSubmit={submit}>
     <label>Full name<input required minLength={2} maxLength={100} autoComplete="name" value={name} onChange={e=>setName(e.target.value)} placeholder="Your full name"/></label>
     <label>New password<input required type="password" minLength={14} maxLength={128} autoComplete="new-password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="At least 14 characters"/></label>
     <label>Confirm password<input required type="password" minLength={14} maxLength={128} autoComplete="new-password" value={confirm} onChange={e=>setConfirm(e.target.value)}/></label>
     {error&&<div className="admin-activation-error" role="alert">{error}</div>}
     <button type="submit" disabled={busy}>{busy?"Activating…":"Activate administrator"}<ArrowRight size={17}/></button>
    </form>}
   <small>Single-use link · No demo passwords · Stored securely in PostgreSQL</small>
  </section>
 </main>;
}
export default function Page(){return <Suspense fallback={<main className="admin-activation">Loading activation…</main>}><AdminActivation/></Suspense>;}
