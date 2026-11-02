"use client";
import { useCallback,useEffect,useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { CalendarDays, MapPin, Users, ArrowLeft, Pencil, Clock, CheckCircle2, Download, Ticket, HeartHandshake, ShieldAlert } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/components/auth-provider";
import { supabase } from "@/lib/supabase";
import { exportCsv,niceDate,type EventRecord,type Registration,type Profile } from "@/lib/types";

export default function EventDetails(){
 const {id}=useParams<{id:string}>();const router=useRouter();const auth=useAuth();
 const [event,setEvent]=useState<EventRecord|null>(null);
 const [registrations,setRegistrations]=useState<Registration[]>([]);
 const [people,setPeople]=useState<Record<string,Profile>>({});
 const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false);
 const [now,setNow]=useState(0);
 const [error,setError]=useState(""),[message,setMessage]=useState("");
 const load=useCallback(async()=>{
   if(!supabase||!auth.user||!auth.org)return;
   setLoading(true);setError("");
   const {data,error}=await supabase.from("events").select("*").eq("id",id).eq("organization_id",auth.org.id).maybeSingle();
   if(error||!data){setError(error?.message||"Event not found or not available to your organization.");setLoading(false);return;}
   const record=data as EventRecord;setEvent(record);
   const result=await supabase.from("registrations").select("id,event_id,user_id,status,registered_at,attended_at").eq("event_id",id).order("registered_at",{ascending:false});
   if(result.error)setError(result.error.message);
   const regs=(result.data||[]) as Registration[];setRegistrations(regs);
   if(auth.role==="admin"&&regs.length){
     const ids=[...new Set(regs.map(x=>x.user_id))];
     const response=await supabase.from("profiles").select("id,email,full_name").in("id",ids);
     if(response.error)setError(response.error.message);
     const map:Record<string,Profile>={};(response.data||[]).forEach(p=>map[p.id]=p as Profile);setPeople(map);
   }else setPeople({});
   setNow(Date.now());
   setLoading(false);
 },[id,auth.user?.id,auth.org?.id,auth.role]); // eslint-disable-line react-hooks/exhaustive-deps
 useEffect(()=>{void Promise.resolve().then(load);},[load]);
 const active=registrations.filter(r=>r.status==="registered");
 const mine=registrations.find(r=>r.user_id===auth.user?.id);
 const mineRegistered=mine?.status==="registered";
 const isAdmin=auth.role==="admin"&&event?.organization_id===auth.org?.id;
 const started=event?new Date(event.start_at).getTime()<=now:false;
 const canJoin=event?.status==="published"&&!started&&!mineRegistered&&active.length<(event?.capacity||0);
 async function register(cancel:boolean){
   if(!supabase||!event)return;
   setBusy(true);setError("");setMessage("");
   const result=await supabase.rpc(cancel?"cancel_registration":"register_for_event",{p_event_id:event.id});
   if(result.error)setError(result.error.message);
   else {setMessage(cancel?"Registration cancelled.":"You are registered! See you there.");await load();}
   setBusy(false);
 }
 async function attendance(userId:string,present:boolean){
   if(!supabase||!event)return;
   setBusy(true);setError("");setMessage("");
   const result=await supabase.rpc("set_attendance",{p_event_id:event.id,p_user_id:userId,p_present:present});
   if(result.error)setError(result.error.message);
   else {setMessage("Attendance updated.");await load();}
   setBusy(false);
 }
 const canDownload=isAdmin&&active.length>0;
 return <AppShell>
  <Link href="/dashboard" className="small muted" style={{display:"inline-flex",alignItems:"center",gap:7,marginBottom:18}}><ArrowLeft size={16}/> Back to events</Link>
  {error&&<div className="alert error" role="alert">{error}</div>}
  {message&&<div className="alert success" role="status">{message}</div>}
  {loading&&!event?<div className="skeleton" style={{height:440}}/>:event?<>
   <div className="detail-banner"><HeartHandshake size={100} strokeWidth={1}/></div>
   <div className="page-header">
    <div style={{maxWidth:760}}><span className="pill">{event.category}</span><h1 style={{marginTop:12}}>{event.title}</h1><p>{event.description||"Join us for this opportunity to connect and contribute."}</p></div>
    {isAdmin&&<Link href={"/events/"+event.id+"/edit"} className="btn btn-secondary"><Pencil size={16}/> Edit event</Link>}
   </div>
   <div className="grid grid-3" style={{alignItems:"start"}}>
    <div className="card card-pad" style={{gridColumn:"span 2"}}>
      <h3>Event information</h3>
      <div className="grid grid-2" style={{marginTop:20}}>
       <div style={{display:"flex",gap:12}}><CalendarDays size={21} color="#6166d9"/><div><div className="small muted">Starts</div><b>{niceDate(event.start_at)}</b></div></div>
       <div style={{display:"flex",gap:12}}><Clock size={21} color="#6166d9"/><div><div className="small muted">Ends</div><b>{niceDate(event.end_at)}</b></div></div>
       <div style={{display:"flex",gap:12}}><MapPin size={21} color="#6166d9"/><div><div className="small muted">Location</div><b style={{overflowWrap:"anywhere"}}>{event.location}</b></div></div>
       <div style={{display:"flex",gap:12}}><Users size={21} color="#6166d9"/><div><div className="small muted">Available capacity</div><b>{active.length} registered / {event.capacity} total</b></div></div>
      </div>
      <div className="divider"/>
      <h3>About this experience</h3><p className="muted" style={{whiteSpace:"pre-line",marginTop:12}}>{event.description||"This event has no additional description."}</p>
    </div>
    <div className="card card-pad">
     <span className={"pill "+(event.status==="published"?"green":event.status==="cancelled"?"red":"gray")}>{event.status}</span>
     <h3 style={{margin:"16px 0 5px"}}>{active.length} of {event.capacity} spots filled</h3>
     <div style={{height:8,background:"#edf0f6",borderRadius:10,overflow:"hidden",margin:"15px 0 20px"}}><div style={{height:"100%",width:(100*Math.min(1,active.length/event.capacity))+"%",background:"#6266da",borderRadius:10}}/></div>
     {mineRegistered?<div className="alert success"><CheckCircle2 size={16} style={{verticalAlign:"middle",marginRight:5}}/> You are registered for this event.</div>:<p className="small muted">{canJoin?"Registration is open. Reserve your place today.":event.status!=="published"?"This event is not open for registration.":started?"Registration is closed because the event has started.":"This event is at full capacity."}</p>}
     {!isAdmin&&<button disabled={busy||(!mineRegistered&&!canJoin)} onClick={()=>void register(mineRegistered)} className={"btn btn-full "+(mineRegistered?"btn-danger":"")}>{mineRegistered?"Cancel my registration":"Register for event"} <Ticket size={17}/></button>}
     {isAdmin&&<p className="muted small">Employees register from this page. Use the participant list below to manage attendance.</p>}
    </div>
   </div>
   {isAdmin&&<div className="card" style={{marginTop:25,overflow:"hidden"}}>
     <div className="card-pad" style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:15,flexWrap:"wrap"}}>
       <div><h3>Participant management</h3><p className="muted small" style={{margin:0}}>Active registrations and attendance records</p></div>
       <button className="btn btn-secondary btn-sm" disabled={!canDownload} onClick={()=>exportCsv("event-"+event.id+"-participants.csv",["Name","Email","Registered at","Attended"],active.map(r=>[people[r.user_id]?.full_name||"Unknown",people[r.user_id]?.email||"",niceDate(r.registered_at),r.attended_at?"Yes":"No"]))}><Download size={15}/> Export CSV</button>
     </div>
     {active.length?<div className="table-wrap"><table><thead><tr><th>Participant</th><th>Registered</th><th>Status</th><th>Attendance</th></tr></thead><tbody>
       {active.map(r=><tr key={r.id}><td><b>{people[r.user_id]?.full_name||"Member"}</b><div className="small muted">{people[r.user_id]?.email||""}</div></td><td>{niceDate(r.registered_at)}</td><td><span className={"pill "+(r.attended_at?"green":"orange")}>{r.attended_at?"Attended":"Registered"}</span></td><td><button disabled={busy} className="btn btn-sm btn-secondary" onClick={()=>void attendance(r.user_id,!r.attended_at)}>{r.attended_at?"Undo check-in":"Mark attended"}</button></td></tr>)}
     </tbody></table></div>:<div className="empty" style={{border:0,borderRadius:0}}><Users size={29}/><h3>No registrations yet</h3><p>Share this event with employees of your organization.</p></div>}
   </div>}
   </>:!loading?<div className="empty"><ShieldAlert size={34}/><h3>Event unavailable</h3><p>It may not exist, or you may not have permission to see it.</p><button className="btn" onClick={()=>router.push("/dashboard")}>Back to dashboard</button></div>:null}
 </AppShell>;
}