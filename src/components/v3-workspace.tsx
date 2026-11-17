"use client";
import {useEffect,useState} from "react";
import type {Person,PortalData} from "@/lib/portal-model";
type Row=Record<string,string|number|null>;
type Workspace={level:"root"|"country_admin"|"state_admin"|"employee";scope?:Row|null;countries?:Row[];states?:Row[];branches?:Row[];members?:Row[];attendance?:Row[];contributions?:Row[]};
const str=(v:unknown)=>String(v??"");
export default function V3Workspace({user,data,remote,onEvent}:{user:Person;data:PortalData;remote:boolean;onEvent:(id:string)=>void}){
 const [workspace,setWorkspace]=useState<Workspace|null>(null),[issue,setIssue]=useState(""),[success,setSuccess]=useState(""),[busy,setBusy]=useState(false),[credentials,setCredentials]=useState<Row|null>(null);
 const [org,setOrg]=useState(""),[country,setCountry]=useState(""),[state,setState]=useState(""),[branch,setBranch]=useState(""),[name,setName]=useState(""),[email,setEmail]=useState(""),[department,setDepartment]=useState(""),[action,setAction]=useState(""),[countryName,setCountryName]=useState("");
 const [selected,setSelected]=useState(""),[minutes,setMinutes]=useState(""),[contribution,setContribution]=useState("");
 async function load(){
  const r=await fetch("/api/v3",{cache:"no-store"});if(r.status===404)return;
  const j=await r.json();if(!r.ok)throw Error(j.error||"Workspace unavailable");setWorkspace(j);
 }
 useEffect(()=>{if(!remote)return;let active=true;fetch("/api/v3",{cache:"no-store"}).then(async r=>{if(r.status===404)return;const j=await r.json();if(!r.ok)throw Error(j.error);if(active)setWorkspace(j);}).catch(e=>{if(active)setIssue(e.message);});return()=>{active=false;};},[remote,user.id]);
 const level=workspace?.level,scope=workspace?.scope;
 const root=level==="root",countryAdmin=level==="country_admin",stateAdmin=level==="state_admin";
 const orgId=root?org:str(scope?.organization_id),countryCode=root?country:str(scope?.country_code),stateId=stateAdmin?str(scope?.state_id):state;
 const states=(workspace?.states||[]).filter(r=>r.organization_id===orgId&&r.country_code===countryCode);
 const branches=(workspace?.branches||[]).filter(r=>r.state_id===stateId);
 const attendance=workspace?.attendance||[];
 const upcoming=data.events.filter(e=>e.companyId===user.companyId&&e.status==="published"&&Date.parse(e.startsAt)>Date.now()).sort((a,b)=>Date.parse(a.startsAt)-Date.parse(b.startsAt));
 const registered=new Set(data.registrations.filter(r=>r.userId===user.id&&r.status==="going").map(r=>r.eventId));
 const verified=workspace?.contributions||[];
 const hours=verified.reduce((sum,r)=>sum+Number(r.volunteer_minutes||0),0)/60;
 async function submit(e:React.FormEvent){
  e.preventDefault();setBusy(true);setIssue("");setSuccess("");setCredentials(null);
  const row=attendance[Number(selected)];
  const base={action,organization_id:orgId,country_code:countryCode,state_id:stateId,branch_id:action==="state_admin"?null:branch,name:action==="country"?countryName:name,email,department};
  const payload=action==="state_admin"||action==="employee"?{...base,action:"provision",level:action}:action==="verify"?{...base,event_id:row?.event_id,user_id:row?.user_id,volunteer_minutes:Number(minutes),contribution}:base;
  try{const r=await fetch("/api/v3",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});const j=await r.json();if(!r.ok)throw Error(j.error||"Unable to save");if(j.temporaryPassword)setCredentials(j);setSuccess("Changes saved.");setName("");setEmail("");setDepartment("");await load();}catch(e){setIssue(e instanceof Error?e.message:"Unable to save");}finally{setBusy(false);}
 }
 if(user.role!=="employee"&&!workspace&&!issue)return null;
 return <section className="ep-panel v3-workspace">
  {user.role==="employee"&&!stateAdmin&&<><div className="ed-eyebrow">MY VOLUNTEERING JOURNEY</div><h2>My impact dashboard</h2>
   <div className="v3-metrics"><div><strong>{workspace?verified.length:"—"}</strong><span>Verified events attended</span></div><div><strong>{workspace?Number(hours.toFixed(2)):"—"}</strong><span>Verified volunteer hours</span></div><div><strong>{upcoming.filter(e=>registered.has(e.id)).length}</strong><span>Upcoming registrations</span></div></div>
   {!workspace&&<p>Verified attendance is unavailable. Registrations are not counted as attendance.</p>}
   <h3>Upcoming events for me</h3>{upcoming.length?<div className="v3-list">{upcoming.slice(0,5).map(e=><button type="button" key={e.id} onClick={()=>onEvent(e.id)}><strong>{e.title}</strong><span>{new Date(e.startsAt).toLocaleDateString()} · {registered.has(e.id)?"Registered":"Explore event"}</span></button>)}</div>:<p>No upcoming company events.</p>}
   {verified.length>0&&<><h3>My verified contributions</h3><div className="v3-list">{verified.map(r=><div key={str(r.id)}><strong>{r.title} · {Number(r.volunteer_minutes)/60} hours</strong><span>{r.contribution||"Attendance verified"}</span></div>)}</div></>}
  </>}
  {(root||countryAdmin||stateAdmin)&&<><div className="ed-eyebrow">V3 MANAGEMENT WORKSPACE</div><h2>{root?"Global hierarchy":countryAdmin?"Country management":"State management"}</h2>
  <div className="v3-metrics"><div><strong>{workspace?.states?.length||0}</strong><span>States</span></div><div><strong>{workspace?.branches?.length||0}</strong><span>Branches</span></div><div><strong>{workspace?.members?.length||0}</strong><span>Assigned accounts</span></div></div>
  <form className="v3-form" onSubmit={submit}>
   <label>Action<select required value={action} onChange={e=>{setAction(e.target.value);setCredentials(null);}}><option value="">Choose action</option>{root?<><option value="country">Add country</option><option value="assignCountryAdmin">Assign existing company admin</option></>:<>{countryAdmin&&<><option value="state">Create state</option><option value="branch">Create branch</option><option value="state_admin">Create state admin</option></>}<option value="employee">Create employee</option><option value="verify">Verify attendance and contribution</option></>}</select></label>
   {root&&<><label>Company<select required value={org} onChange={e=>{setOrg(e.target.value);setCountry("");}}><option value="">Select company</option>{data.companies.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>{action==="country"?<><label>Country code<input required minLength={2} maxLength={2} value={country} onChange={e=>setCountry(e.target.value.toUpperCase())} placeholder="IN"/></label><label>Country name<input required value={countryName} onChange={e=>setCountryName(e.target.value)}/></label></>:<label>Country<select required value={country} onChange={e=>setCountry(e.target.value)}><option value="">Select country</option>{(workspace?.countries||[]).filter(c=>c.organization_id===org).map(c=><option key={str(c.code)} value={str(c.code)}>{c.name}</option>)}</select></label>}</>}
   {countryAdmin&&["branch","state_admin","employee"].includes(action)&&<label>State<select required value={state} onChange={e=>{setState(e.target.value);setBranch("");}}><option value="">Select state</option>{states.map(s=><option key={str(s.id)} value={str(s.id)}>{s.name}</option>)}</select></label>}
   {action==="employee"&&<label>Branch<select required value={branch} onChange={e=>setBranch(e.target.value)}><option value="">Select branch</option>{branches.map(b=><option key={str(b.id)} value={str(b.id)}>{b.name}</option>)}</select></label>}
   {["state","branch","state_admin","employee"].includes(action)&&<label>Name<input required value={name} onChange={e=>setName(e.target.value)}/></label>}
   {["assignCountryAdmin","state_admin","employee"].includes(action)&&<label>Work email<input type="email" required value={email} onChange={e=>setEmail(e.target.value)}/></label>}
   {["state_admin","employee"].includes(action)&&<label>Department<input value={department} onChange={e=>setDepartment(e.target.value)}/></label>}
   {action==="verify"&&<><label>Completed-event registration<select required value={selected} onChange={e=>{setSelected(e.target.value);const r=attendance[Number(e.target.value)];setMinutes(str(r?.volunteer_minutes));setContribution(str(r?.contribution));}}><option value="">Select registration</option>{attendance.map((r,i)=><option key={str(r.event_id)+":"+str(r.user_id)} value={i}>{r.full_name} · {r.title}</option>)}</select></label><label>Volunteer minutes<input required type="number" min={0} max={10080} step={1} value={minutes} onChange={e=>setMinutes(e.target.value)}/></label><label>Verified contribution<textarea maxLength={1000} value={contribution} onChange={e=>setContribution(e.target.value)}/></label></>}
   <button className="ep-button" disabled={!action||busy} type="submit">{busy?"Saving…":"Save"}</button>
  </form>
  {credentials&&<div className="ep-info"><strong>One-time account credentials</strong><p>Employee ID: {credentials.employeeId}</p><p>Login email: {credentials.email}</p><p>Temporary password: <code>{credentials.temporaryPassword}</code></p><p>Expires in 24 hours. Share privately.</p><button type="button" onClick={()=>setCredentials(null)}>Hide credentials</button></div>}
  <h3>Assigned accounts</h3><div className="v3-list">{(workspace?.members||[]).map(m=><div key={str(m.user_id)}><strong>{m.full_name}</strong><span>{m.level} · {m.country_code} · {workspace?.states?.find(s=>s.id===m.state_id)?.name||"Country level"} {workspace?.branches?.find(b=>b.id===m.branch_id)?.name||""}</span></div>)}</div>
  </>}
  {issue&&<p role="alert" className="ep-error">{issue}</p>}{success&&<p role="status" className="ep-success">{success}</p>}
 </section>;
}
