"use client";
import {useState} from "react";
import {Save,UserRoundPen,X,Shield,ShieldOff} from "lucide-react";
import type {Person} from "@/lib/portal-model";
import {PersonAvatar} from "@/components/person-avatar";

export function EmployeeEditor({person,onSave,onStatus,onClose}:{person:Person;onSave:(details:{userId:string;fullName:string;email:string;department:string;jobTitle:string;phone:string})=>Promise<string|null>;onStatus:(person:Person)=>Promise<string|null>;onClose:()=>void}){
 const [name,setName]=useState(person.fullName);
 const [email,setEmail]=useState(person.email);
 const [department,setDepartment]=useState(person.department);
 const [jobTitle,setJobTitle]=useState(person.jobTitle||"");
 const [phone,setPhone]=useState(person.phone||"");
 const [busy,setBusy]=useState(false),[error,setError]=useState("");
 async function save(e:React.FormEvent){
  e.preventDefault();setBusy(true);setError("");
  try{
   const failure=await onSave({userId:person.id,fullName:name,email,department,jobTitle,phone});
   if(failure)setError(failure);
   else onClose();
  }catch{setError("Unable to update this employee.");}finally{setBusy(false);}
 }
 async function status(){
  setBusy(true);setError("");
  try{
   if(!window.confirm((person.status==="active"?"Suspend":"Reactivate")+" this employee's account?"))return;
   const failure=await onStatus(person);
   if(failure)setError(failure);
   else onClose();
  }finally{setBusy(false);}
 }
 return <section className="em-editor" aria-label={"Edit "+person.fullName}>
  <div className="em-editor-head"><PersonAvatar person={person} size={50}/><div><span className="ed-eyebrow">COMPANY EMPLOYEE</span><h2>Edit {person.fullName}</h2><small>Employee ID: EMP-{person.id.slice(0,8).toUpperCase()}</small></div><button type="button" onClick={onClose} aria-label="Close employee editor"><X size={19}/></button></div>
  <form onSubmit={save}>
   <div className="em-editor-grid">
    <label>Full name<input required minLength={2} maxLength={100} value={name} onChange={e=>setName(e.target.value)}/></label>
    <label>Work email<input required type="email" maxLength={255} value={email} onChange={e=>setEmail(e.target.value)}/></label>
    <label>Department<input maxLength={100} value={department} onChange={e=>setDepartment(e.target.value)}/></label>
    <label>Job title<input maxLength={100} value={jobTitle} onChange={e=>setJobTitle(e.target.value)}/></label>
    <label>Phone (optional)<input type="tel" maxLength={25} value={phone} onChange={e=>setPhone(e.target.value)} placeholder="+91 98765 43210"/></label>
   </div>
   <p className="em-editor-help"><UserRoundPen size={14}/> Only employees from your organization can be edited. Changing an email signs the employee out and requires the new email on their next login.</p>
   {error&&<p className="em-editor-error" role="alert">{error}</p>}
   <div className="em-editor-actions"><button className="aw-primary" type="submit" disabled={busy}><Save size={16}/>Save changes</button>
    <button className="md-outline-action" type="button" disabled={busy} onClick={()=>void status()}>{person.status==="active"?<><ShieldOff size={15}/> Suspend account</>:<><Shield size={15}/> Reactivate</>}</button>
    <button type="button" className="md-outline-action" onClick={onClose}>Cancel</button>
   </div>
  </form>
 </section>;
}
