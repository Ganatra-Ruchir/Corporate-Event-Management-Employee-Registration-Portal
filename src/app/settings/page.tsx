"use client";
import { useCallback,useEffect,useState } from "react";
import Link from "next/link";
import { Building2, Copy, Users, ShieldCheck, KeyRound, ArrowRight, Download } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/components/auth-provider";
import { supabase } from "@/lib/supabase";
import { exportCsv,type Profile,type Membership } from "@/lib/types";
type MemberRow={membership:Membership;profile:Profile|null};
export default function Settings(){
 const auth=useAuth();
 const [code,setCode]=useState("");
 const [members,setMembers]=useState<MemberRow[]>([]);
 const [edit,setEdit]=useState<{orgId:string;name:string;description:string}|null>(null);
 const name=edit && edit.orgId===auth.org?.id?edit.name:(auth.org?.name||"");
 const description=edit && edit.orgId===auth.org?.id?edit.description:(auth.org?.description||"");
 const setName=(value:string)=>setEdit({orgId:auth.org?.id||"",name:value,description});
 const setDescription=(value:string)=>setEdit({orgId:auth.org?.id||"",name,description:value});
 const [saving,setSaving]=useState(false);
 const [error,setError]=useState(""),[success,setSuccess]=useState("");
 const isAdmin=auth.role==="admin";
 const load=useCallback(async()=>{
   if(!supabase||!auth.org||!isAdmin)return;
   const [invites,memberships]=await Promise.all([
     supabase.from("organization_invites").select("code").eq("organization_id",auth.org.id).maybeSingle(),
     supabase.from("memberships").select("user_id,organization_id,role").eq("organization_id",auth.org.id)
   ]);
   if(invites.error||memberships.error){setError(invites.error?.message||memberships.error?.message||"Unable to load organization settings.");return;}
   setCode(invites.data?.code||"");
   const values=(memberships.data||[]) as Membership[];
   const profiles=values.length?await supabase.from("profiles").select("id,email,full_name").in("id",values.map(m=>m.user_id)):null;
   if(profiles?.error)setError(profiles.error.message);
   setMembers(values.map(m=>({membership:m,profile:(profiles?.data||[]).find(p=>p.id===m.user_id)||null})));
 },[auth.org?.id,isAdmin]); // eslint-disable-line react-hooks/exhaustive-deps
 useEffect(()=>{void Promise.resolve().then(load);},[load]);
 async function save(e:React.FormEvent){
   e.preventDefault();if(!supabase||!auth.org||!isAdmin)return;
   setSaving(true);setError("");setSuccess("");
   const {error}=await supabase.from("organizations").update({name:name.trim(),description:description.trim()}).eq("id",auth.org.id);
   if(error)setError(error.message);
   else {setSuccess("Organization details updated.");await auth.refresh();}
   setSaving(false);
 }
 return <AppShell>
   <div className="page-header"><div><span className="overline">WORKSPACE SETTINGS</span><h1>Organization settings</h1><p>Manage your company workspace and employee access.</p></div></div>
   {!auth.org?<div className="empty"><Building2 size={33}/><h3>No organization selected</h3><p>Join an existing workspace or create one.</p><Link href="/join" className="btn">Join organization <ArrowRight size={16}/></Link></div>:<>
    {error&&<div className="alert error">{error}</div>}
    {success&&<div className="alert success">{success}</div>}
    <div className="grid grid-2" style={{alignItems:"start"}}>
     <div className="card card-pad">
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:20}}><div className="kpi-icon" style={{margin:0}}><Building2 size={22}/></div><div><h3>Workspace details</h3><div className="small muted">{isAdmin?"Administrator access":"Employee access"}</div></div></div>
      <form onSubmit={save} className="form-stack">
       <div className="input-group"><label htmlFor="org-name">Organization name</label><input id="org-name" className="field" minLength={3} maxLength={120} required value={name} onChange={e=>setName(e.target.value)} disabled={!isAdmin}/></div>
       <div className="input-group"><label htmlFor="org-desc">Description</label><textarea id="org-desc" className="field" maxLength={2000} value={description} onChange={e=>setDescription(e.target.value)} disabled={!isAdmin}/></div>
       {isAdmin&&<button className="btn" disabled={saving||name.trim().length<3}>{saving?"Saving...":"Save changes"}</button>}
      </form>
     </div>
     <div className="card card-pad">
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:20}}><div className="kpi-icon" style={{margin:0}}><ShieldCheck size={22}/></div><div><h3>Organization access</h3><div className="small muted">Invitation and security settings</div></div></div>
      {isAdmin?<><div className="input-group"><label htmlFor="invite-code">Employee invitation code</label><div style={{display:"flex",gap:9}}><input id="invite-code" className="field" readOnly value={code||"Loading..."}/><button className="btn btn-secondary" type="button" disabled={!code} title="Copy invitation code" onClick={async()=>{try{await navigator.clipboard.writeText(code);setSuccess("Invitation code copied.");}catch{setError("Unable to copy. Select the code manually.");}}}><Copy size={16}/></button></div></div>
       <div className="alert info"><KeyRound size={15} style={{verticalAlign:"middle",marginRight:5}}/> Share this code only with verified employees. Anyone with the code and a valid account can join. Manual approval and domain restrictions are recommended before production launch.</div>
      </>:<><p className="muted">Your role is Employee. Contact your organization administrator for new invitations or organization changes.</p><Link href="/join" className="btn btn-secondary">Join another organization</Link></>}
     </div>
    </div>
    {isAdmin&&<div className="card" style={{marginTop:23,overflow:"hidden"}}>
      <div className="card-pad" style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,flexWrap:"wrap"}}><div><h3>Organization members</h3><p className="muted small" style={{margin:0}}>{members.length} team members</p></div>
       <button type="button" className="btn btn-secondary btn-sm" disabled={!members.length} onClick={()=>exportCsv("organization-members.csv",["Name","Email","Role"],members.map(m=>[m.profile?.full_name||"",m.profile?.email||"",m.membership.role]))}><Download size={15}/> Export CSV</button>
      </div>
      {members.length?<div className="table-wrap"><table><thead><tr><th>Employee</th><th>Email</th><th>Role</th></tr></thead><tbody>{members.map(m=><tr key={m.membership.user_id}><td><b>{m.profile?.full_name||"Member"}</b></td><td>{m.profile?.email||"—"}</td><td><span className={"pill "+(m.membership.role==="admin"?"green":"gray")}>{m.membership.role}</span></td></tr>)}</tbody></table></div>:<div className="empty"><Users size={30}/><h3>No members found</h3><p>Invite employees using the code above.</p></div>}
    </div>}
   </>}
 </AppShell>;
}