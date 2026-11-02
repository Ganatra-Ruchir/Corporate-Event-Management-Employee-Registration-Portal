"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, ArrowRight, ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/components/auth-provider";
import { supabase } from "@/lib/supabase";

export default function NewOrganization() {
  const [name,setName]=useState("");
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const auth=useAuth();const router=useRouter();
  async function submit(e:React.FormEvent) {
    e.preventDefault(); if(!supabase)return;
    setBusy(true);setError("");
    const {data,error}=await supabase.rpc("create_organization",{p_name:name.trim()});
    if(error)setError(error.message);
    else {await auth.refresh();auth.chooseOrg(data as string);router.push("/settings");}
    setBusy(false);
  }
  return <AppShell><div className="page-header"><div><span className="overline">GET STARTED</span><h1>Create organization</h1><p>Create a dedicated workspace for your corporate team.</p></div></div>
    <div className="grid grid-2" style={{alignItems:"start",maxWidth:1020}}>
      <div className="card card-pad">
        <form className="form-stack" onSubmit={submit}>
          <div className="input-group"><label htmlFor="org-name">Organization name</label><input id="org-name" className="field" minLength={3} maxLength={120} required placeholder="e.g. Acme Technologies" value={name} onChange={e=>setName(e.target.value)}/></div>
          <div className="alert info">Creating a workspace makes your account its administrator. You will receive an invitation code to share with employees.</div>
          {error&&<div className="alert error">{error}</div>}
          <button className="btn" disabled={busy||name.trim().length<3}>{busy?"Creating...":"Create workspace"} <ArrowRight size={16}/></button>
        </form>
      </div>
      <div className="card card-pad" style={{background:"#f4f3ff"}}><Building2 color="#5558d4" size={34}/><h3 style={{margin:"20px 0 10px"}}>Your company, your community.</h3><p className="muted">Each organization gets isolated events, private employee registration data, and admin-only access to participation records.</p><div style={{display:"flex",gap:8,alignItems:"center",color:"#6265d0",fontWeight:700,marginTop:20}}><ShieldCheck size={18}/> Organization data stays private</div></div>
    </div>
  </AppShell>;
}