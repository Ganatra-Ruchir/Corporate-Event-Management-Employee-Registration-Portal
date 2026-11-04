"use client";
import {useState} from "react";
import {KeyRound,LogOut,ShieldCheck} from "lucide-react";
import type {Person} from "@/lib/portal-model";
type Props={person:Person;onSave:(password:string)=>Promise<string|null>;onLogout:()=>void};
export function FirstLoginPasswordChange({person,onSave,onLogout}:Props){
 const [password,setPassword]=useState("");
 const [confirm,setConfirm]=useState("");
 const [error,setError]=useState("");
 const [busy,setBusy]=useState(false);
 async function submit(e:React.FormEvent){
  e.preventDefault();setError("");
  if(password.length<12){setError("Choose a password with at least 12 characters.");return;}
  if(password!==confirm){setError("The passwords do not match.");return;}
  setBusy(true);
  try{
   const result=await onSave(password);
   if(result)setError(result);
   else{setPassword("");setConfirm("");}
  }catch{setError("Unable to update your password. Try again.");}
  finally{setBusy(false);}
 }
 return <main style={{minHeight:"100vh",background:"#f4f7fc",display:"grid",placeItems:"center",padding:16,color:"#1b2940"}}>
  <section style={{width:"min(100%,440px)",padding:"clamp(22px,4vw,36px)",borderRadius:16,background:"#fff",boxShadow:"0 10px 30px #1833520d",border:"1px solid #e1e7ef",display:"grid",gap:15}}>
   <span style={{display:"flex",gap:9,alignItems:"center",fontWeight:850,color:"#2659bb"}}><ShieldCheck size={22}/> Elixir Events Portal</span>
   <span style={{fontSize:11,fontWeight:800,letterSpacing:1.2,color:"#315eaa"}}>FIRST SIGN-IN SECURITY</span>
   <h1 style={{margin:0,fontSize:28,letterSpacing:"-.8px"}}>Set your own password</h1>
   <p style={{margin:0,fontSize:13,lineHeight:1.6,color:"#60728c"}}>Welcome, {person.fullName}. Your Company Admin created this account. Replace the temporary password now to start using your company events. No OTP is needed.</p>
   <form onSubmit={submit} style={{display:"grid",gap:13}}>
    <label style={{display:"grid",gap:6,fontWeight:750,fontSize:12}}>New password<input required type="password" autoComplete="new-password" minLength={12} maxLength={128} value={password} onChange={e=>setPassword(e.target.value)} placeholder="At least 12 characters" style={{minHeight:46,padding:"11px",border:"1px solid #cbd6e6",borderRadius:9}}/></label>
    <label style={{display:"grid",gap:6,fontWeight:750,fontSize:12}}>Confirm new password<input required type="password" autoComplete="new-password" minLength={12} maxLength={128} value={confirm} onChange={e=>setConfirm(e.target.value)} style={{minHeight:46,padding:"11px",border:"1px solid #cbd6e6",borderRadius:9}}/></label>
    {error&&<p role="alert" style={{color:"#a82337",fontSize:12,margin:0}}>{error}</p>}
    <button disabled={busy} type="submit" style={{background:"#2054d7",color:"#fff",border:0,borderRadius:9,minHeight:46,fontWeight:850,display:"flex",justifyContent:"center",alignItems:"center",gap:8}}><KeyRound size={16}/>{busy?"Saving…":"Save password and continue"}</button>
   </form>
   <button type="button" onClick={onLogout} style={{border:0,background:"transparent",color:"#62758e",fontSize:12,display:"flex",alignItems:"center",justifyContent:"center",gap:8}}><LogOut size={15}/> Sign out</button>
  </section>
 </main>;
}
