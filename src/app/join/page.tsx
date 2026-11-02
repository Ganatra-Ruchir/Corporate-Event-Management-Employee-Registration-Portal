"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, KeyRound } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/components/auth-provider";
import { supabase } from "@/lib/supabase";

export default function JoinOrganization() {
  const [code,setCode]=useState("");const [busy,setBusy]=useState(false);const [error,setError]=useState("");
  const auth=useAuth();const router=useRouter();
  async function submit(e:React.FormEvent){
    e.preventDefault();if(!supabase)return;
    setBusy(true);setError("");
    const {data,error}=await supabase.rpc("join_organization",{p_code:code.trim().toLowerCase()});
    if(error)setError(error.message);
    else {await auth.refresh();auth.chooseOrg(data as string);router.push("/dashboard");}
    setBusy(false);
  }
  return <AppShell><div className="page-header"><div><span className="overline">GET CONNECTED</span><h1>Join your organization</h1><p>Use the invitation code shared by your company administrator.</p></div></div>
    <div className="card card-pad" style={{maxWidth:570}}>
      <div className="kpi-icon"><KeyRound size={22}/></div>
      <h3>Enter invitation code</h3><p className="muted" style={{marginTop:8}}>You will join as an employee and gain access to your organization&apos;s published events.</p>
      <form className="form-stack" onSubmit={submit}>
        <div className="input-group"><label htmlFor="invite">Invitation code</label><input className="field" id="invite" spellCheck={false} autoComplete="off" placeholder="Paste your organization code" minLength={16} maxLength={64} value={code} onChange={e=>setCode(e.target.value)} required/></div>
        {error&&<div className="alert error" role="alert">{error}</div>}
        <button className="btn" disabled={busy||code.trim().length<16}>{busy?"Joining...":"Join organization"} <ArrowRight size={16}/></button>
      </form>
      <div className="divider"/>
      <span className="small muted">Are you a corporate administrator? </span><Link style={{color:"#575bd6",fontWeight:800}} href="/organizations/new">Create a new organization</Link>
    </div>
  </AppShell>;
}