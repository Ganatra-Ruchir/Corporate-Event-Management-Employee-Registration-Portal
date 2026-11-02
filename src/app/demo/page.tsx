"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Activity, ArrowDownToLine, ArrowLeft, ArrowRight, Bell, Building2, CalendarCheck2,
  CalendarDays, ChartNoAxesCombined, Check, CheckCircle2, ChevronDown, ChevronRight,
  ClipboardList, Clock3, Compass, Download, HandHeart, LayoutDashboard, Leaf, LogOut,
  MapPin, Menu, MoreHorizontal, Pencil, Plus, Search, Settings2, ShieldCheck, Sparkles,
  Ticket, TrendingUp, Users, UserRound, X
} from "lucide-react";
import "./demo.css";

type Role="admin"|"employee";
type Section="overview"|"events"|"registrations"|"analytics"|"team";
type Status="published"|"draft"|"cancelled";
type EventItem={
  id:string; org:string;title:string;category:string; description:string;
  date:string;time:string;location:string;capacity:number;status:Status;accent:string;
};
type Person={id:string;name:string;email:string;department:string};
type DemoData={
  events:EventItem[];
  registrations:Record<string,string[]>;
  attendance:Record<string,string[]>;
};
const ORGS=[
  {id:"aster",name:"Aster Technologies",short:"AT",color:"#756be7"},
  {id:"northstar",name:"Northstar Industries",short:"NI",color:"#14a792"}
];
const PEOPLE:Person[]=[
  {id:"self",name:"Alex Morgan",email:"alex.morgan@example.com",department:"Operations"},
  {id:"p2",name:"Priya Shah",email:"priya.shah@example.com",department:"Human Resources"},
  {id:"p3",name:"Rahul Mehta",email:"rahul.mehta@example.com",department:"Engineering"},
  {id:"p4",name:"Aisha Khan",email:"aisha.khan@example.com",department:"Marketing"},
  {id:"p5",name:"Neha Patel",email:"neha.patel@example.com",department:"Finance"},
  {id:"p6",name:"Arjun Desai",email:"arjun.desai@example.com",department:"Operations"}
];
const SAMPLE_EVENTS:EventItem[]=[
  {id:"e1",org:"aster",title:"Green City Plantation Drive",category:"Environment",date:"2026-11-18",time:"09:00",location:"Riverfront Park, Ahmedabad",capacity:40,status:"published",accent:"green",description:"A community-led tree plantation initiative to build greener neighborhoods. Meet the volunteer coordinator at the entrance and bring a reusable water bottle."},
  {id:"e2",org:"aster",title:"Skills for Tomorrow Workshop",category:"Education",date:"2026-11-24",time:"10:30",location:"Aster Training Center",capacity:30,status:"published",accent:"violet",description:"Spend a morning helping young learners build essential digital skills. Volunteers will support small groups during guided hands-on activities."},
  {id:"e3",org:"aster",title:"Community Health Awareness Day",category:"Health",date:"2026-12-03",time:"11:00",location:"Community Center, Gota",capacity:25,status:"published",accent:"coral",description:"Help the organizing team with awareness sessions, registration and visitor assistance at a community health outreach activity."},
  {id:"e4",org:"aster",title:"Winter Essentials Collection",category:"Community",date:"2026-12-12",time:"10:00",location:"Aster HQ, Ahmedabad",capacity:50,status:"draft",accent:"blue",description:"An upcoming winter collection and distribution initiative for community partners."},
  {id:"e5",org:"aster",title:"Employee Volunteer Meetup",category:"Volunteering",date:"2026-11-08",time:"16:00",location:"Aster HQ, Ahmedabad",capacity:60,status:"published",accent:"violet",description:"Meet employee volunteers and learn about the coming months of community events."},
  {id:"e6",org:"northstar",title:"Clean Lakes Initiative",category:"Environment",date:"2026-11-21",time:"08:30",location:"Thol Lake, Gujarat",capacity:35,status:"published",accent:"green",description:"Work together to clean shared natural spaces and promote responsible environmental practices."},
  {id:"e7",org:"northstar",title:"Career Mentoring Saturday",category:"Education",date:"2026-11-28",time:"10:00",location:"Northstar Office",capacity:24,status:"published",accent:"violet",description:"A one-day mentoring program for early-career students with corporate volunteers."}
];
const INITIAL_DATA:DemoData={
  events:SAMPLE_EVENTS,
  registrations:{e1:["self","p2","p3","p4","p5"],e2:["p2","p3","p6"],e3:["p5","p6"],e5:["self","p3","p4"],e6:["p2","p5"],e7:["p4"]},
  attendance:{e5:["p3","p4"]}
};
const STORAGE_KEY="gatherly-interactive-draft-v1";
const categories=["All","Environment","Education","Health","Community","Volunteering","Other"];
const colorFor=(category:string)=>category==="Environment"?"green":category==="Health"?"coral":category==="Education"?"violet":category==="Community"?"blue":"violet";
function initialData():DemoData {return JSON.parse(JSON.stringify(INITIAL_DATA)) as DemoData;}
function prettyDate(date:string){const d=new Date(date+"T12:00:00");return d.toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"});}
function niceMonth(date:string){return new Date(date+"T12:00:00").toLocaleDateString("en-IN",{month:"short"});}
function downloadCsv(filename:string,head:string[],rows:string[][]){
 const safe=(v:string)=>'"'+(/^[\s]*[=+\-@]/.test(v)?"'"+v:v).replaceAll('"','""')+'"';
 const csv=[head,...rows].map(r=>r.map(safe).join(",")).join("\r\n");
 const blob=new Blob(["\uFEFF",csv],{type:"text/csv;charset=utf-8"});
 const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);
}
const iconFor=(category:string)=>category==="Environment"?Leaf:category==="Education"?ClipboardList:category==="Health"?HandHeart:category==="Community"?Users:Sparkles;
function EventArtwork({event,large=false}:{event:EventItem;large?:boolean}){
 const Icon=iconFor(event.category);
 return <div className={"demo-event-art art-"+event.accent+(large?" artwork-large":"")}>
   <div className="art-orbit one"/><div className="art-orbit two"/>
   <Icon size={large?88:53} strokeWidth={1.25}/>
   <span className="art-category">{event.category}</span>
 </div>;
}
function Metric({icon:Icon,value,label,sub}:{icon:typeof Users,value:number|string,label:string,sub:string}){
 return <div className="demo-stat">
   <div className="demo-stat-icon"><Icon size={20}/></div>
   <div className="demo-stat-label">{label}</div>
   <div className="demo-stat-value">{value}</div>
   <div className="demo-stat-sub"><TrendingUp size={12}/>{sub}</div>
 </div>;
}
function Badge({status}:{status:Status}){return <span className={"demo-badge "+status}><span className="status-dot"/>{status}</span>;}
function initials(name:string){return name.split(" ").map(s=>s[0]).slice(0,2).join("").toUpperCase();}
function DemoEventCard({event,count,registered,onOpen}:{event:EventItem;count:number;registered:boolean;onOpen:()=>void}){
 return <button type="button" className="demo-event-card" onClick={onOpen}>
   <div className="demo-card-art"><EventArtwork event={event}/><span className="demo-card-status"><Badge status={event.status}/></span></div>
   <div className="demo-card-copy">
     <div className="demo-card-eyebrow">{event.category.toUpperCase()}</div>
     <h3>{event.title}</h3>
     <div className="demo-card-meta"><CalendarDays size={15}/>{prettyDate(event.date)} · {event.time}</div>
     <div className="demo-card-meta"><MapPin size={15}/>{event.location}</div>
     <div className="demo-card-bottom"><span>{registered?<span className="demo-registered"><CheckCircle2 size={13}/> Registered</span>:count+" of "+event.capacity+" joined"}</span><span className="demo-card-arrow"><ArrowRight size={16}/></span></div>
   </div>
 </button>;
}
function Blank({title,message,action}:{title:string;message:string;action?:React.ReactNode}){
 return <div className="demo-empty"><CalendarDays size={33}/><h3>{title}</h3><p>{message}</p>{action}</div>;
}
function EventEditor({current,org,onClose,onSave}:{current:EventItem|null;org:string;onClose:()=>void;onSave:(event:EventItem)=>void}){
 const [title,setTitle]=useState(current?.title||"");
 const [desc,setDesc]=useState(current?.description||"");
 const [category,setCategory]=useState(current?.category||"Volunteering");
 const [date,setDate]=useState(current?.date||"2026-12-18");
 const [time,setTime]=useState(current?.time||"09:00");
 const [location,setLocation]=useState(current?.location||"");
 const [capacity,setCapacity]=useState(current?.capacity||30);
 const [status,setStatus]=useState<Status>(current?.status||"draft");
 const [error,setError]=useState("");
 function save(e:React.FormEvent){
   e.preventDefault();
   if(title.trim().length<3||!location.trim()||!date||capacity<1){setError("Add a title, date, location and valid participant limit.");return;}
   onSave({id:current?.id||"demo-"+Math.random().toString(36).slice(2,12),org,title:title.trim(),category,description:desc.trim(),date,time,location:location.trim(),capacity,status,accent:colorFor(category)});
 }
 return <div className="demo-overlay" onClick={onClose} role="presentation">
  <section className="demo-modal demo-form-modal" role="dialog" aria-modal="true" aria-label={current?"Edit event":"Create event"} onClick={e=>e.stopPropagation()}>
   <div className="demo-modal-head"><div><div className="demo-overline">EVENT MANAGER</div><h2>{current?"Edit event":"Create an event"}</h2><p>Fill in the details your employees will see.</p></div><button className="demo-icon-button" aria-label="Close" onClick={onClose}><X size={20}/></button></div>
   <form className="demo-form" onSubmit={save}>
    <label>Event title<input required minLength={3} maxLength={160} value={title} onChange={e=>setTitle(e.target.value)} placeholder="e.g. Community Volunteer Day"/></label>
    <label>Description<textarea maxLength={2000} value={desc} onChange={e=>setDesc(e.target.value)} placeholder="What will participants do? Why does this event matter?"/></label>
    <div className="demo-form-grid">
      <label>Category<select value={category} onChange={e=>setCategory(e.target.value)}>{categories.slice(1).map(cat=><option key={cat}>{cat}</option>)}</select></label>
      <label>Participant limit<input type="number" required min={1} max={1000} value={capacity} onChange={e=>setCapacity(Number(e.target.value))}/></label>
      <label>Date<input required type="date" value={date} onChange={e=>setDate(e.target.value)}/></label>
      <label>Start time<input required type="time" value={time} onChange={e=>setTime(e.target.value)}/></label>
    </div>
    <label>Venue / Location<input required value={location} onChange={e=>setLocation(e.target.value)} placeholder="Location or meeting venue"/></label>
    <label>Visibility<select value={status} onChange={e=>setStatus(e.target.value as Status)}><option value="draft">Draft — visible to admins only</option><option value="published">Published — employees can register</option><option value="cancelled">Cancelled</option></select></label>
    {error&&<div className="demo-notice error">{error}</div>}
    <div className="demo-form-actions"><button type="button" className="demo-button ghost" onClick={onClose}>Cancel</button><button className="demo-button primary"><Check size={16}/> {current?"Save changes":"Create event"}</button></div>
   </form>
  </section>
 </div>;
}
function EventDetail({event,role,count,registrations,attended,onClose,onRegister,onCancel,onEdit,onCheck}:{event:EventItem;role:Role;count:number;registrations:string[];attended:string[];onClose:()=>void;onRegister:()=>void;onCancel:()=>void;onEdit:()=>void;onCheck:(userId:string)=>void}){
 const joined=registrations.includes("self");
 const full=count>=event.capacity;
 return <div className="demo-overlay" onClick={onClose} role="presentation">
  <section className="demo-modal detail-modal" role="dialog" aria-modal="true" aria-label={event.title} onClick={e=>e.stopPropagation()}>
   <div className="demo-detail-banner"><EventArtwork event={event} large/><button className="demo-close-float" onClick={onClose} aria-label="Close"><X size={20}/></button></div>
   <div className="demo-detail-content">
    <div className="demo-detail-top"><div><div className="demo-overline">{event.category}</div><h2>{event.title}</h2></div><Badge status={event.status}/></div>
    <p className="demo-detail-intro">{event.description||"An exciting community experience with your organization."}</p>
    <div className="demo-detail-facts">
     <div><CalendarDays size={19}/><span><b>{prettyDate(event.date)}</b><small>{event.time} onwards</small></span></div>
     <div><MapPin size={19}/><span><b>{event.location}</b><small>Event venue</small></span></div>
     <div><Users size={19}/><span><b>{count} / {event.capacity} registered</b><small>{Math.max(event.capacity-count,0)} available spots</small></span></div>
    </div>
    {role==="employee"?<div className="demo-detail-actions">{joined?<><span className="demo-inline-success"><CheckCircle2 size={18}/> You are registered</span><button className="demo-button outline" onClick={onCancel}>Cancel registration</button></>:<button disabled={full||event.status!=="published"} className="demo-button primary" onClick={onRegister}>{full?"Event is full":event.status!=="published"?"Registration closed":"Register for this event"} <ArrowRight size={17}/></button>}</div>:<>
      <div className="demo-detail-actions"><button className="demo-button outline" onClick={onEdit}><Pencil size={16}/> Edit event</button><button className="demo-button outline" disabled={!registrations.length} onClick={()=>downloadCsv("event-participants.csv",["Name","Email","Department","Attendance"],registrations.map(id=>{const p=PEOPLE.find(x=>x.id===id);return[p?.name||"Guest",p?.email||"",p?.department||"",attended.includes(id)?"Attended":"Registered"];}))}><Download size={16}/> Export attendees</button></div>
      <h3 className="demo-section-h3">Participants <span className="demo-dim">({count})</span></h3>
      {registrations.length?<div className="demo-participant-list">{registrations.map(id=>{const p=PEOPLE.find(x=>x.id===id);return <div key={id} className="demo-participant"><span className="demo-person-avatar">{initials(p?.name||"Guest")}</span><div><b>{p?.name||"Guest"}</b><small>{p?.department||"Employee"}</small></div><button className={"demo-small-button "+(attended.includes(id)?"checked":"")} onClick={()=>onCheck(id)}>{attended.includes(id)?<><Check size={13}/> Checked in</>:<>Mark attended</>}</button></div>;})}</div>:<p className="demo-dim">No employees have registered yet.</p>}
    </>}
   </div>
  </section>
 </div>;
}
export default function DemoPage(){
 const [data,setData]=useState<DemoData>(initialData);
 const [section,setSection]=useState<Section>("overview");
 const [role,setRole]=useState<Role>("admin");
 const [org,setOrg]=useState("aster");
 const [search,setSearch]=useState("");
 const [filter,setFilter]=useState("All");
 const [statusFilter,setStatusFilter]=useState("All events");
 const [selectedId,setSelectedId]=useState<string|null>(null);
 const [editing,setEditing]=useState<EventItem|null|undefined>(undefined);
 const [mobileNav,setMobileNav]=useState(false);
 const [toast,setToast]=useState("");
 const [loaded,setLoaded]=useState(false);
 useEffect(()=>{void Promise.resolve().then(()=>{
   try{const saved=localStorage.getItem(STORAGE_KEY);if(saved){const d=JSON.parse(saved) as DemoData;if(Array.isArray(d?.events)&&d?.registrations&&d?.attendance)setData(d);}}catch{}
   setLoaded(true);
 });},[]);
 const apply=(next:DemoData)=>{setData(next);try{localStorage.setItem(STORAGE_KEY,JSON.stringify(next));}catch{}};
 const notify=(message:string)=>setToast(message);
 const orgData=ORGS.find(o=>o.id===org)||ORGS[0];
 const orgEvents=data.events.filter(event=>event.org===org);
 const published=orgEvents.filter(event=>event.status==="published");
 const activeRegistrations=(id:string)=>data.registrations[id]||[];
 const myEvents=published.filter(e=>activeRegistrations(e.id).includes("self"));
 const activeCount=orgEvents.reduce((n,e)=>n+activeRegistrations(e.id).length,0);
 const attendanceCount=orgEvents.reduce((n,e)=>n+(data.attendance[e.id]||[]).length,0);
 const filtered=useMemo(()=>orgEvents.filter(e=>{
    if(role==="employee"&&e.status!=="published")return false;
    if(filter!=="All"&&e.category!==filter)return false;
    if(statusFilter==="Published"&&e.status!=="published")return false;
    if(statusFilter==="Drafts"&&e.status!=="draft")return false;
    const text=[e.title,e.description,e.location,e.category].join(" ").toLowerCase();
    return text.includes(search.trim().toLowerCase());
 }),[orgEvents,role,filter,statusFilter,search]);
 const selected=data.events.find(e=>e.id===selectedId)||null;
 const chooseSection=(next:Section)=>{setSection(next);setMobileNav(false);setSearch("");setFilter("All");setStatusFilter("All events");};
 const openCreate=()=>setEditing(null);
 const saveEvent=(event:EventItem)=>{
    const exists=data.events.some(x=>x.id===event.id);
    apply({...data,events:exists?data.events.map(x=>x.id===event.id?event:x):[event,...data.events]});
    setEditing(undefined);setSelectedId(event.id);notify(exists?"Event updated in this demo.":"Sample event created in this demo.");
 };
 const register=(event:EventItem)=>{
   const users=activeRegistrations(event.id);
   if(event.status!=="published"||users.includes("self")||users.length>=event.capacity)return;
   apply({...data,registrations:{...data.registrations,[event.id]:[...users,"self"]}});
   notify("Registration saved in this browser demo.");
 };
 const cancel=(event:EventItem)=>{
   apply({...data,registrations:{...data.registrations,[event.id]:activeRegistrations(event.id).filter(id=>id!=="self")},
     attendance:{...data.attendance,[event.id]:(data.attendance[event.id]||[]).filter(id=>id!=="self")}});
   notify("Sample registration cancelled.");
 };
 const toggleAttendance=(event:EventItem,id:string)=>{
   const old=data.attendance[event.id]||[];const next=old.includes(id)?old.filter(x=>x!==id):[...old,id];
   apply({...data,attendance:{...data.attendance,[event.id]:next}});notify("Sample attendance updated.");
 };
 const reset=()=>{const fresh=initialData();apply(fresh);setSelectedId(null);chooseSection("overview");notify("Demo sample data has been reset.");};
 const downloadAll=()=>downloadCsv("demo-event-summary.csv",["Event","Category","Date","Location","Status","Registrations","Attendance"],orgEvents.map(e=>[e.title,e.category,e.date,e.location,e.status,String(activeRegistrations(e.id).length),String((data.attendance[e.id]||[]).length)]));
 const navigation:{id:Section;label:string;icon:typeof Users}[]=[
  {id:"overview",label:"Dashboard",icon:LayoutDashboard},
  {id:"events",label:"Discover events",icon:Compass},
  {id:"registrations",label:role==="admin"?"Registrations":"My registrations",icon:Ticket},
  {id:"analytics",label:"Impact analytics",icon:ChartNoAxesCombined},
  {id:"team",label:"People & workspace",icon:Users}
 ];
 const pageLabels:Record<Section,string>={overview:"Dashboard",events:"Events",registrations:"Registrations",analytics:"Impact analytics",team:"People & workspace"};
 const cardGrid=(events:EventItem[])=>events.length?<div className="demo-event-grid">{events.map(e=><DemoEventCard key={e.id} event={e} count={activeRegistrations(e.id).length} registered={activeRegistrations(e.id).includes("self")} onOpen={()=>setSelectedId(e.id)}/>)}</div>:<Blank title="No matching events" message="Try another category, search or organization." action={<button className="demo-button outline" onClick={()=>{setSearch("");setFilter("All");setStatusFilter("All events");}}>Clear filters</button>}/>;
 return <div className="draft-app">
  <aside className={"draft-sidebar "+(mobileNav?"opened":"")}>
   <div className="draft-brand"><span className="draft-brand-mark"><CalendarCheck2 size={22}/></span><span>gatherly<span className="brand-dot">.</span><small>EVENT MANAGEMENT</small></span></div>
   <div className="draft-sidebar-label">WORKSPACE</div>
   <nav className="draft-nav">{navigation.map(nav=>{const Icon=nav.icon;return <button key={nav.id} onClick={()=>chooseSection(nav.id)} className={"draft-nav-link "+(section===nav.id?"active":"")}><Icon size={19}/><span>{nav.label}</span>{section===nav.id&&<i/>}</button>;})}</nav>
   <div className="draft-sidebar-label" style={{marginTop:27}}>QUICK ACTIONS</div>
   <nav className="draft-nav">
    {role==="admin"&&<button onClick={openCreate} className="draft-nav-link"><Plus size={19}/><span>Create new event</span></button>}
    <button onClick={reset} className="draft-nav-link"><Settings2 size={19}/><span>Reset demo data</span></button>
   </nav>
   <div className="draft-sidebar-bottom">
     <div className="draft-impact-card"><div className="draft-impact-symbol"><Sparkles size={20}/></div><b>Small actions.<br/>Big difference.</b><p>Every event is an opportunity to make an impact.</p></div>
     <div className="draft-user"><span className="draft-avatar">AM</span><div><b>Alex Morgan</b><small>{role==="admin"?"Organization Admin":"Employee Account"}</small></div><MoreHorizontal size={18}/></div>
   </div>
  </aside>
  {mobileNav&&<button className="draft-mobile-shade" aria-label="Close navigation" onClick={()=>setMobileNav(false)}/>}
  <div className="draft-main">
   <header className="draft-header">
    <div className="draft-header-left"><button aria-label="Open navigation" className="draft-mobile-menu" onClick={()=>setMobileNav(true)}><Menu size={21}/></button><span className="draft-breadcrumb">Workspace</span><ChevronRight size={15}/><strong>{pageLabels[section]}</strong></div>
    <div className="draft-header-right">
      <select aria-label="Switch sample organization" className="draft-organization-select" value={org} onChange={e=>{setOrg(e.target.value);chooseSection("overview");}}>{ORGS.map(o=><option key={o.id} value={o.id}>{o.name}</option>)}</select>
      <button className="draft-bell" title="No live notifications in demo" aria-label="Demo notifications" onClick={()=>notify("Notifications will be available with the connected backend.")}><Bell size={19}/><span/></button>
      <span className="draft-avatar top">AM</span>
    </div>
   </header>
   <main className="draft-content">
    <div className="draft-demo-notice"><span className="draft-demo-chip"><span/> INTERACTIVE DEMO</span><span>Sample data only · No login or database required · Changes stay in this browser</span><button onClick={reset}>Reset draft</button></div>
    <div className="draft-page-hero">
      <div>
       <div className="demo-overline">{orgData.name.toUpperCase()} / {role==="admin"?"ADMIN WORKSPACE":"EMPLOYEE SPACE"}</div>
       <h1>{section==="overview"?"Good evening, Alex 👋":pageLabels[section]}</h1>
       <p>{section==="overview"?"Here’s what’s happening in your community today.":section==="events"?"Explore upcoming opportunities to connect and make a difference.":section==="registrations"?"See participation and registration details across events.":section==="analytics"?"A clearer view of engagement and collective impact.":"Meet your team and explore your organization workspace."}</p>
      </div>
      <div className="draft-page-actions">
       <div className="draft-role-toggle" aria-label="Switch preview role"><button className={role==="admin"?"selected":""} onClick={()=>{setRole("admin");chooseSection("overview");}}><ShieldCheck size={15}/> Admin</button><button className={role==="employee"?"selected":""} onClick={()=>{setRole("employee");chooseSection("overview");}}><UserRound size={15}/> Employee</button></div>
       {role==="admin"&&<button className="demo-button primary" onClick={openCreate}><Plus size={17}/> Create event</button>}
      </div>
    </div>
    {section==="overview"&&<>
      <div className="draft-kpis">
       <Metric icon={CalendarDays} label={role==="admin"?"TOTAL EVENTS":"AVAILABLE EVENTS"} value={role==="admin"?orgEvents.length:published.length} sub="In this organization"/>
       <Metric icon={CalendarCheck2} label="PUBLISHED EVENTS" value={published.length} sub="Open to your team"/>
       <Metric icon={Ticket} label={role==="admin"?"TOTAL REGISTRATIONS":"MY REGISTRATIONS"} value={role==="admin"?activeCount:myEvents.length} sub="Participation records"/>
       <Metric icon={CheckCircle2} label={role==="admin"?"CHECKED-IN PARTICIPANTS":"MY ATTENDANCE"} value={role==="admin"?attendanceCount:myEvents.filter(e=>(data.attendance[e.id]||[]).includes("self")).length} sub="Confirmed check-ins"/>
      </div>
      <div className="draft-split">
       <section className="draft-highlight">
         <div className="demo-overline">FEATURED OPPORTUNITY</div>
         <h2>Better together.<br/><em>Stronger communities.</em></h2>
         <p>Discover meaningful initiatives and help your team create impact, one event at a time.</p>
         <button onClick={()=>chooseSection("events")} className="demo-button light">Explore events <ArrowRight size={17}/></button>
         <div className="draft-highlight-icon"><HandHeart size={105} strokeWidth={.8}/></div>
       </section>
       <section className="draft-side-panel">
         <div className="draft-box-heading"><h3>Upcoming activities</h3><button onClick={()=>chooseSection("events")}>View all <ArrowRight size={14}/></button></div>
         {published.slice(0,3).map(e=><button className="draft-upcoming-row" key={e.id} onClick={()=>setSelectedId(e.id)}><span className="draft-date-box"><b>{e.date.slice(8)}</b><small>{niceMonth(e.date)}</small></span><span><b>{e.title}</b><small>{e.location}</small></span><ChevronRight size={17}/></button>)}
         {!published.length&&<p className="demo-dim">No upcoming events in this organization.</p>}
       </section>
      </div>
      <div className="draft-section-heading"><div><h2>Explore upcoming events</h2><p>Find the right opportunity for your team.</p></div><button onClick={()=>chooseSection("events")}>View all events <ArrowRight size={16}/></button></div>
      {cardGrid((role==="admin"?orgEvents:published).slice(0,3))}
    </>}
    {section==="events"&&<>
      <div className="draft-filters">
       <label className="draft-search"><Search size={18}/><input placeholder="Search events by name or location..." aria-label="Search events" value={search} onChange={e=>setSearch(e.target.value)}/></label>
       <select aria-label="Filter event category" value={filter} onChange={e=>setFilter(e.target.value)}>{categories.map(c=><option key={c}>{c}</option>)}</select>
       {role==="admin"&&<select aria-label="Filter event status" value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}>{["All events","Published","Drafts"].map(v=><option key={v}>{v}</option>)}</select>}
      </div>
      <div className="draft-results-header"><b>{filtered.length} event{filtered.length!==1?"s":""} found</b><span>{role==="employee"?"Published events only":"All organization events"}</span></div>
      {cardGrid(filtered)}
    </>}
    {section==="registrations"&&<>
      <section className="draft-table-card">
       <div className="draft-box-heading"><div><h3>{role==="admin"?"Event registrations":"My registrations"}</h3><p>{role==="admin"?"Participant counts and attendance by event.":"Your joined events and registration status."}</p></div>{role==="admin"&&<button onClick={downloadAll}><ArrowDownToLine size={17}/> Export CSV</button>}</div>
       {role==="admin"?<div className="draft-table-scroll"><table><thead><tr><th>EVENT</th><th>DATE</th><th>REGISTRATIONS</th><th>ATTENDED</th><th>STATUS</th><th></th></tr></thead><tbody>{orgEvents.map(e=><tr key={e.id}><td><b>{e.title}</b><small>{e.category}</small></td><td>{prettyDate(e.date)}</td><td>{activeRegistrations(e.id).length} / {e.capacity}</td><td>{(data.attendance[e.id]||[]).length}</td><td><Badge status={e.status}/></td><td><button className="draft-table-link" onClick={()=>setSelectedId(e.id)}>Manage <ChevronRight size={15}/></button></td></tr>)}</tbody></table></div>:
       myEvents.length?<div className="draft-table-scroll"><table><thead><tr><th>EVENT</th><th>DATE</th><th>LOCATION</th><th>ATTENDANCE</th><th></th></tr></thead><tbody>{myEvents.map(e=><tr key={e.id}><td><b>{e.title}</b><small>{e.category}</small></td><td>{prettyDate(e.date)}</td><td>{e.location}</td><td><span className="demo-badge published">{(data.attendance[e.id]||[]).includes("self")?"Attended":"Registered"}</span></td><td><button className="draft-table-link" onClick={()=>setSelectedId(e.id)}>View <ChevronRight size={15}/></button></td></tr>)}</tbody></table></div>:<Blank title="Nothing here yet" message="Register for an event to see it here." action={<button className="demo-button primary" onClick={()=>chooseSection("events")}>Explore events</button>}/>}
      </section>
    </>}
    {section==="analytics"&&<>
      <div className="draft-kpis"><Metric icon={CalendarDays} label="EVENTS ORGANIZED" value={published.length} sub="Published initiatives"/><Metric icon={Users} label="TOTAL SIGNUPS" value={activeCount} sub="Across all events"/><Metric icon={CheckCircle2} label="ATTENDANCE RECORDS" value={attendanceCount} sub="Marked as present"/><Metric icon={Activity} label="PARTICIPATION RATE" value={activeCount?Math.round(attendanceCount/activeCount*100)+"%":"0%"} sub="Sample records only"/></div>
      <div className="draft-analytics-grid">
       <div className="draft-analytic-card"><h3>Event categories</h3><p>Distribution of published opportunities</p><div className="draft-chart-bars">{categories.slice(1).filter(c=>published.some(e=>e.category===c)).map(c=>{const n=published.filter(e=>e.category===c).length;return <div key={c} className="draft-bar-row"><span>{c}</span><div><i style={{width:(100*n/Math.max(1,published.length))+"%"}}/></div><b>{n}</b></div>;})}</div></div>
       <div className="draft-analytic-card"><h3>Participation overview</h3><p>Registration progress by event</p><div className="draft-chart-bars">{published.slice(0,5).map(e=><div key={e.id} className="draft-bar-row"><span title={e.title}>{e.title}</span><div><i style={{width:(100*activeRegistrations(e.id).length/e.capacity)+"%"}}/></div><b>{activeRegistrations(e.id).length}</b></div>)}</div></div>
      </div>
      <div className="demo-notice-info"><ShieldCheck size={18}/> This is an illustrative analytics dashboard. Values are calculated from the sample data in your browser—not real organizational records.</div>
    </>}
    {section==="team"&&<>
      <div className="draft-workspace-card"><div className="draft-workspace-icon" style={{background:orgData.color}}>{orgData.short}</div><div><h2>{orgData.name}</h2><p>Sample corporate organization · Demo workspace</p></div><span className="demo-badge published">Active</span></div>
      <div className="draft-section-heading"><div><h2>Sample employee directory</h2><p>Illustrative people to demonstrate event attendance.</p></div><span className="demo-dim">{PEOPLE.length} demo accounts</span></div>
      <div className="draft-people-grid">{PEOPLE.map((person,i)=><div className="draft-person-card" key={person.id}><span className={"draft-person-avatar av-"+i}>{initials(person.name)}</span><div><b>{person.name}</b><small>{person.department}</small><small>{person.email}</small></div></div>)}</div>
      <div className="demo-notice-info"><ShieldCheck size={18}/> Real employees will be added securely after authentication and the database are connected. These are fictional sample profiles.</div>
    </>}
    <div className="draft-footer">Gatherly · Corporate Events & Employee Registration Portal <span>Interactive design draft · v1</span></div>
   </main>
  </div>
  {selected&&<EventDetail key={selected.id} event={selected} role={role} count={activeRegistrations(selected.id).length} registrations={activeRegistrations(selected.id)} attended={data.attendance[selected.id]||[]} onClose={()=>setSelectedId(null)} onRegister={()=>register(selected)} onCancel={()=>cancel(selected)} onEdit={()=>setEditing(selected)} onCheck={id=>toggleAttendance(selected,id)}/>}
  {editing!==undefined&&<EventEditor key={editing?.id||"new"} current={editing} org={org} onClose={()=>setEditing(undefined)} onSave={saveEvent}/>}
  {toast&&<div className="draft-toast" role="status"><CheckCircle2 size={17}/>{toast}<button aria-label="Dismiss notice" onClick={()=>setToast("")}><X size={16}/></button></div>}
 </div>;
}
