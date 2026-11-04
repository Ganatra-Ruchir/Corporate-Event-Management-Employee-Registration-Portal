"use client";

import {useState} from "react";
import {Check,Copy,Eye,EyeOff,Plus,ShieldCheck,UserPlus,X} from "lucide-react";

export type CreatedEmployee={email:string;employeeId:string;temporaryPassword:string};
type Props={onCreate:(fields:{name:string;email:string;department:string})=>Promise<{result?:CreatedEmployee;error?:string}>};
export function EmployeeProvisioner({onCreate}:Props){
 const [expanded,setExpanded]=useState(false);
 const [name,setName]=useState("");
 const [email,setEmail]=useState("");
 const [department,setDepartment]=useState("");
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState("");
 const [credential,setCredential]=useState<CreatedEmployee|null>(null);
 const [visible,setVisible]=useState(false);
 const [copied,setCopied]=useState(false);
 async function submit(e:React.FormEvent){
  e.preventDefault();setBusy(true);setError("");setCredential(null);setCopied(false);
  const response=await onCreate({name,email,department});
  setBusy(false);
  if(response.error){setError(response.error);return;}
  if(response.result){setCredential(response.result);setName("");setEmail("");setDepartment("");}
 }
 async function copy(){
  if(!credential)return;
  try{
   await navigator.clipboard.writeText("Employee ID: "+credential.employeeId+"\nEmail / Login: "+credential.email+"\nTemporary password: "+credential.temporaryPassword+"\nVerify your work email at: "+window.location.origin+"/signup");
   setCopied(true);
  }catch{setError("Unable to copy. Select the credentials manually.");}
 }
 return <section className="ep-panel" style={{padding:18,marginBottom:18}}>
  <div style={{display:"flex",justifyContent:"space-between",gap:12,alignItems:"center",flexWrap:"wrap"}}>
   <div><strong style={{display:"flex",alignItems:"center",gap:8}}><UserPlus size={18}/>Add employee directly</strong><p style={{margin:"6px 0 0",color:"#6a7a90",fontSize:12,lineHeight:1.6}}>Create an employee ID and a temporary password for a company email address. Email OTP verification is still required before sign-in.</p></div>
   <button type="button" className="aw-primary" onClick={()=>{setExpanded(v=>!v);setCredential(null);setError("");}}>{expanded?<><X size={16}/>Close</>:<><Plus size={16}/>Add employee</>}</button>
  </div>
  {expanded&&<div style={{display:"grid",gap:14,marginTop:18,maxWidth:500}}>
   {!credential&&<form onSubmit={submit} style={{display:"grid",gap:12}}>
    <label style={{display:"grid",gap:5,fontSize:12,fontWeight:750}}>Employee full name<input required minLength={2} maxLength={100} autoComplete="off" value={name} onChange={e=>setName(e.target.value)} placeholder="Full name"/></label>
    <label style={{display:"grid",gap:5,fontSize:12,fontWeight:750}}>Company email<input required type="email" maxLength={255} autoComplete="off" value={email} onChange={e=>setEmail(e.target.value)} placeholder="employee@company.com"/></label>
    <label style={{display:"grid",gap:5,fontSize:12,fontWeight:750}}>Department (optional)<input maxLength={100} value={department} onChange={e=>setDepartment(e.target.value)} placeholder="e.g. Operations"/></label>
    {error&&<p role="alert" style={{color:"#b42339",fontSize:12}}>{error}</p>}
    <button className="aw-primary" type="submit" disabled={busy}>{busy?"Creating…":"Generate ID and temporary password"}</button>
   </form>}
   {credential&&<div style={{display:"grid",gap:10,padding:14,border:"1px solid #badacb",background:"#f1faf5",borderRadius:12}}>
    <strong style={{display:"flex",alignItems:"center",gap:8,color:"#17623c"}}><ShieldCheck size={18}/>Employee credentials created</strong>
    <small>These details are shown once. Store them securely and give them only to this employee.</small>
    <label style={{fontSize:12}}>Employee ID <input readOnly value={credential.employeeId}/></label>
    <label style={{fontSize:12}}>Login email <input readOnly value={credential.email}/></label>
    <label style={{fontSize:12}}>Temporary password <div style={{display:"flex",gap:8}}><input readOnly type={visible?"text":"password"} value={credential.temporaryPassword} style={{flex:1,minWidth:0}}/><button type="button" aria-label={visible?"Hide password":"Show password"} onClick={()=>setVisible(v=>!v)}>{visible?<EyeOff size={17}/>:<Eye size={17}/>}</button></div></label>
    <button type="button" className="aw-primary" onClick={()=>void copy()}>{copied?<Check size={16}/>:<Copy size={16}/>} {copied?"Copied":"Copy credentials once"}</button>
    <small>The employee must open <strong>/signup</strong>, enter their work email, receive a verification code, and set their own password. Admin-created credentials do not bypass email verification.</small>
    <button type="button" onClick={()=>{setCredential(null);setVisible(false);setError("");}}>Add another employee</button>
   </div>}
  </div>}
 </section>;
}
