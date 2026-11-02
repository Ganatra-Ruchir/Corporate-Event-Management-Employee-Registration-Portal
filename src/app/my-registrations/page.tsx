"use client";
import { useEffect,useState } from "react";
import Link from "next/link";
import { Ticket, CalendarDays, MapPin, ArrowUpRight } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/components/auth-provider";
import { supabase } from "@/lib/supabase";
import { niceDate,type EventRecord,type Registration } from "@/lib/types";
export default function MyRegistrations(){
 const auth=useAuth();const [rows,setRows]=useState<(Registration&{event:EventRecord|null})[]>([]);
 const [loading,setLoading]=useState(true),[error,setError]=useState("");
 useEffect(()=>{
   if(!supabase||!auth.user)return;
   let active=true;
   const fetchData=async()=>{
     setLoading(true);
     const {data,error}=await supabase!.from("registrations").select("id,event_id,user_id,status,registered_at,attended_at,event:events(*)").eq("user_id",auth.user!.id).order("registered_at",{ascending:false});
     if(!active)return;
     if(error)setError(error.message);
     else setRows((data||[]).map((r)=>({...r,event:Array.isArray(r.event)?r.event[0]||null:r.event})) as (Registration&{event:EventRecord|null})[]);
     setLoading(false);
   };
   void fetchData();
   return()=>{active=false;};
 },[auth.user?.id]); // eslint-disable-line react-hooks/exhaustive-deps
 const list=rows.filter(x=>x.event?.organization_id===auth.org?.id);
 return <AppShell>
   <div className="page-header"><div><span className="overline">YOUR ACTIVITIES</span><h1>My registrations</h1><p>All the events you&apos;ve joined and your attendance history.</p></div><Link href="/dashboard" className="btn btn-secondary">Explore events <ArrowUpRight size={16}/></Link></div>
   {error&&<div className="alert error">{error}</div>}
   {loading?<div className="skeleton" style={{height:290}}/>:list.length?<div className="card table-wrap"><table>
    <thead><tr><th>Event</th><th>Schedule</th><th>Status</th><th>Attendance</th><th></th></tr></thead>
    <tbody>{list.map(r=><tr key={r.id}>
      <td><b>{r.event?.title}</b><div className="small muted"><MapPin size={12} style={{verticalAlign:"middle"}}/> {r.event?.location}</div></td>
      <td><CalendarDays size={13} style={{verticalAlign:"middle",marginRight:5}}/>{niceDate(r.event!.start_at)}</td>
      <td><span className={"pill "+(r.status==="registered"?"green":"red")}>{r.status}</span></td>
      <td>{r.attended_at?<span className="pill green">Attended</span>:<span className="small muted">—</span>}</td>
      <td><Link className="btn btn-secondary btn-sm" href={"/events/"+r.event_id}>View <ArrowUpRight size={14}/></Link></td>
    </tr>)}</tbody>
   </table></div>:<div className="empty"><Ticket size={35}/><h3>No registrations yet</h3><p>Browse your organization&apos;s events and register for a cause you care about.</p><Link className="btn" href="/dashboard">Explore events</Link></div>}
 </AppShell>;
}