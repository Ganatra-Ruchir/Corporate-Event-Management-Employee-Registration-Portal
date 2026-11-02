"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CalendarDays, Plus, Users, Ticket, CheckCircle2, Search, ArrowRight, Building2, CalendarRange } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { EventCard } from "@/components/event-card";
import { useAuth } from "@/components/auth-provider";
import { supabase } from "@/lib/supabase";
import type { EventRecord, Registration } from "@/lib/types";

type Filter = "upcoming" | "all" | "past";
export default function Dashboard() {
  const auth=useAuth();
  const [events,setEvents]=useState<EventRecord[]>([]);
  const [registrations,setRegistrations]=useState<Registration[]>([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");
  const [search,setSearch]=useState("");
  const [filter,setFilter]=useState<Filter>("upcoming");
  const load=useCallback(async()=>{
    if(!supabase||!auth.org){setEvents([]);setRegistrations([]);setLoading(false);return;}
    setLoading(true);setError("");
    const {data,error}=await supabase.from("events").select("*").eq("organization_id",auth.org.id).order("start_at",{ascending:true});
    if(error){setError(error.message);setLoading(false);return;}
    const list=(data||[]) as EventRecord[];
    setEvents(list);
    if(list.length){
      const result=await supabase.from("registrations").select("id,event_id,user_id,status,registered_at,attended_at").in("event_id",list.map(e=>e.id));
      if(result.error)setError(result.error.message);
      setRegistrations((result.data||[]) as Registration[]);
    }else setRegistrations([]);
    setLoading(false);
  },[auth.org?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(()=>{void load();},[load]);

  const now=Date.now();
  const visible=useMemo(()=>events.filter(e=>{
    const isPast=new Date(e.end_at).getTime()<now;
    const match=filter==="all"|| (filter==="past"?isPast:!isPast);
    const text=(e.title+" "+e.category+" "+e.location).toLowerCase();
    return match&&text.includes(search.toLowerCase().trim());
  }),[events,filter,search,now]);
  const registered=registrations.filter(r=>r.status==="registered");
  const upcoming=events.filter(e=>e.status==="published"&&new Date(e.start_at).getTime()>now).length;
  const attended=registered.filter(r=>r.attended_at).length;
  const mine=registered.filter(r=>r.user_id===auth.user?.id).length;

  return <AppShell>
    {!auth.org?<div className="card card-pad" style={{maxWidth:760,margin:"32px auto"}}>
      <div className="kpi-icon"><Building2/></div>
      <h2>Welcome to Gatherly!</h2>
      <p className="muted" style={{marginTop:12}}>You are signed in. To view events, join an existing corporate organization using its invitation code, or create a workspace if you are an organization administrator.</p>
      <div style={{display:"flex",gap:12,flexWrap:"wrap",marginTop:24}}><Link className="btn" href="/join">Join an organization <ArrowRight size={16}/></Link><Link className="btn btn-secondary" href="/organizations/new">Create a workspace</Link></div>
    </div>:<>
      <div className="page-header">
        <div><div className="overline">YOUR ORGANIZATION WORKSPACE</div><h1 style={{marginTop:7}}>Good to see you{auth.profile?.full_name?", "+auth.profile.full_name.split(" ")[0]:""} 👋</h1>
          <p>Here&apos;s what&apos;s happening at {auth.org.name}.</p></div>
        {auth.role==="admin"&&<Link href="/events/new" className="btn"><Plus size={18}/> Create event</Link>}
      </div>
      <div className="grid grid-4" style={{marginBottom:29}}>
        {[
          {label:"Total events",value:events.length,detail:"In this workspace",icon:CalendarDays},
          {label:"Upcoming events",value:upcoming,detail:"Published and scheduled",icon:CalendarRange},
          {label:auth.role==="admin"?"Registrations":"My registrations",value:auth.role==="admin"?registered.length:mine,detail:"Active registrations",icon:Ticket},
          {label:auth.role==="admin"?"Attended":"My attendance",value:auth.role==="admin"?attended:registered.filter(r=>r.user_id===auth.user?.id&&r.attended_at).length,detail:"Confirmed check-ins",icon:CheckCircle2}
        ].map(k=><div key={k.label} className="card kpi"><div className="kpi-icon"><k.icon size={21}/></div><div className="kpi-label">{k.label}</div><div className="kpi-number">{loading?"—":k.value}</div><div className="kpi-detail">{k.detail}</div></div>)}
      </div>
      <div className="section-title">
        <div><h2 style={{fontSize:21}}>Explore events</h2><p className="muted">Discover opportunities to connect and contribute.</p></div>
        {auth.role==="admin"&&<span className="pill"><Users size={13}/> Administrator view</span>}
      </div>
      <div className="filter-row">
        <div className="search-input"><Search size={18} color="#8b97aa"/><input aria-label="Search events" placeholder="Search events..." value={search} onChange={e=>setSearch(e.target.value)}/></div>
        <div className="tabs" role="tablist" aria-label="Event time filter">
          {(["upcoming","all","past"] as const).map(item=><button role="tab" aria-selected={filter===item} className={"tab"+(filter===item?" active":"")} key={item} onClick={()=>setFilter(item)}>{item==="all"?"All events":item==="past"?"Past":"Upcoming"}</button>)}
        </div>
      </div>
      {error&&<div className="alert error" role="alert">{error} <button className="btn btn-sm btn-secondary" onClick={()=>void load()}>Retry</button></div>}
      {loading?<div className="grid grid-3">{[1,2,3].map(x=><div className="skeleton" style={{height:325}} key={x}/>)}</div>
      :visible.length?<div className="event-grid">{visible.map(event=><EventCard key={event.id} event={event} registrations={registered.filter(r=>r.event_id===event.id).length}/>)}</div>
      :<div className="empty"><CalendarDays size={32}/><h3>{search?"No matching events":"No events here yet"}</h3><p>{search?"Try a different search.":"Your organization has no events in this view. Admins can publish a new event to get started."}</p>{auth.role==="admin"&&<Link className="btn" href="/events/new">Create an event <Plus size={16}/></Link>}</div>}
    </>}
  </AppShell>;
}