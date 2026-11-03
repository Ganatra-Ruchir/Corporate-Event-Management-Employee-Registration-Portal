"use client";

import {ArrowRight, Building2, CalendarDays, Clock3, Plus, TicketCheck, Users, UserRoundCheck, AlertCircle, ChevronRight} from "lucide-react";
import {activeRegistrations, dateText, remainingPlaces, shortDate} from "@/lib/portal-model";
import type {Company,Person,PortalData,PortalEvent} from "@/lib/portal-model";
import {EventTile} from "@/components/event-discovery";

function Metric({value,label,detail,icon:Icon}:{value:number;label:string;detail:string;icon:typeof CalendarDays}){
 return <div className="aw-metric"><span className="aw-metric-icon"><Icon size={21}/></span><span className="aw-metric-label">{label}</span><strong>{value.toLocaleString("en-IN")}</strong><small>{detail}</small></div>;
}
export function WorkspaceHeading({eyebrow,title,description,action}:{eyebrow:string;title:string;description:string;action?:React.ReactNode}){
 return <div className="aw-heading"><div><span className="ed-eyebrow">{eyebrow}</span><h1>{title}</h1><p>{description}</p></div>{action&&<div className="aw-heading-action">{action}</div>}</div>;
}
export function WorkspaceSection({title,description,action,children}:{title:string;description?:string;action?:React.ReactNode;children:React.ReactNode}){
 return <section className="aw-section"><div className="aw-section-heading"><div><h2>{title}</h2>{description&&<p>{description}</p>}</div>{action}</div>{children}</section>;
}
function companyStats(c:Company,data:PortalData){
 const events=data.events.filter(e=>e.companyId===c.id);
 const members=data.users.filter(u=>u.companyId===c.id);
 return {events,people:members.length,attending:events.reduce((sum,e)=>sum+activeRegistrations(e.id,data).length,0)};
}
export function PlatformOverview({data,onCompany,onAdd,onCompanies,onInvites,onUsers}:{data:PortalData;onCompany:(company:Company)=>void;onAdd:()=>void;onCompanies:()=>void;onInvites:()=>void;onUsers:()=>void}){
 const active=data.companies.filter(c=>c.status==="active");
 const attendees=data.registrations.filter(r=>r.status==="going").length;
 return <div className="aw-root">
  <WorkspaceHeading eyebrow="ELIXIR FOUNDATION · PLATFORM" title="Your partner network" description="Keep track of partner companies, their teams and events in one place."
   action={<button className="aw-primary" onClick={onAdd}><Plus size={18}/> Add company</button>}/>
  <div className="aw-metric-grid">
   <Metric icon={Building2} value={data.companies.length} label="Partner companies" detail={active.length+" active"}/>
   <Metric icon={Users} value={data.users.filter(u=>u.companyId!==null).length} label="People" detail="Across partner teams"/>
   <Metric icon={CalendarDays} value={data.events.length} label="Events created" detail="All partner events"/>
   <Metric icon={TicketCheck} value={attendees} label="Active RSVPs" detail="Currently going"/>
  </div>
  <WorkspaceSection title="Partner companies" description="Your organizations and their recent event activity"
   action={<button className="aw-text-action" onClick={onCompanies}>Manage all companies <ArrowRight size={16}/></button>}>
   <div className="aw-company-grid">{data.companies.map(c=>{const s=companyStats(c,data);return <button key={c.id} className="aw-company-card" onClick={()=>onCompany(c)}>
    <span className="aw-company-logo" aria-hidden="true">{c.name.split(/\s+/).slice(0,2).map(w=>w[0]).join("")}</span>
    <span className="aw-company-body"><strong>{c.name}</strong><small>{c.domains.join(", ")}</small><span className="aw-company-foot"><span>{s.events.length} events</span><span>{s.people} people</span><span className={"aw-status "+c.status}>{c.status}</span></span></span><ChevronRight size={18}/>
   </button>})}</div>
  </WorkspaceSection>
  <WorkspaceSection title="Quick actions" description="Common platform administration tasks">
   <div className="aw-action-grid">
    <button onClick={onAdd}><Building2 size={22}/><strong>Add a company</strong><span>Set up a partner and its work domains</span><ArrowRight size={17}/></button>
    <button onClick={onInvites}><UserRoundCheck size={22}/><strong>Invite a company admin</strong><span>Assign access to a partner manager</span><ArrowRight size={17}/></button>
    <button onClick={onUsers}><Users size={22}/><strong>Manage accounts</strong><span>Review people and account status</span><ArrowRight size={17}/></button>
   </div>
  </WorkspaceSection>
 </div>;
}
export function CompanyOverview({data,current,company,now,onCreate,onEvents,onPeople,onEvent}:{data:PortalData;current:Person;company:Company;now:number;onCreate:()=>void;onEvents:()=>void;onPeople:()=>void;onEvent:(event:PortalEvent)=>void}){
 const events=data.events.filter(e=>e.companyId===company.id);
 const upcoming=events.filter(e=>e.status==="published"&&new Date(e.startsAt).getTime()>now).sort((a,b)=>new Date(a.startsAt).getTime()-new Date(b.startsAt).getTime());
 const drafts=events.filter(e=>e.status==="draft");
 const attending=events.reduce((sum,e)=>sum+activeRegistrations(e.id,data).length,0);
 const members=data.users.filter(u=>u.companyId===company.id);
 const alertEvents=events.filter(e=>e.status==="draft"||(e.status==="published"&&new Date(e.startsAt).getTime()>now&&remainingPlaces(e,data)<=3));
 const latest=data.registrations.filter(r=>r.status==="going"&&events.some(e=>e.id===r.eventId)).sort((a,b)=>new Date(b.createdAt).getTime()-new Date(a.createdAt).getTime()).slice(0,5);
 return <div className="aw-root">
   <WorkspaceHeading eyebrow={company.name.toUpperCase()+" · ORGANIZER"} title={"Good to see you, "+current.fullName.split(" ")[0]} description="Your events, attendees and next steps."
    action={<button className="aw-primary" onClick={onCreate}><Plus size={18}/> Create event</button>}/>
   <div className="aw-metric-grid">
    <Metric icon={CalendarDays} value={upcoming.length} label="Upcoming events" detail="Published and scheduled"/>
    <Metric icon={Clock3} value={drafts.length} label="Draft events" detail="Not yet published"/>
    <Metric icon={TicketCheck} value={attending} label="People going" detail="Across company events"/>
    <Metric icon={Users} value={members.length} label="Team members" detail="In your organization"/>
   </div>
   <WorkspaceSection title="Your upcoming events" description="See what your team can join next" action={<button className="aw-text-action" onClick={onEvents}>All events <ArrowRight size={16}/></button>}>
    {upcoming.length?<div className="ed-tile-grid">{upcoming.slice(0,3).map(e=><EventTile event={e} data={data} onOpen={onEvent} key={e.id}/>)}</div>:<div className="aw-empty"><CalendarDays size={22}/><strong>No upcoming events</strong><p>Create an event to start accepting registrations.</p><button onClick={onCreate}>Create event <ArrowRight size={15}/></button></div>}
   </WorkspaceSection>
   <div className="aw-two-col">
    <WorkspaceSection title="Needs your attention" description="Drafts and events nearly full" action={<button className="aw-text-action" onClick={onEvents}>View events <ArrowRight size={16}/></button>}>
     <div className="aw-list-panel">{alertEvents.length?alertEvents.slice(0,5).map(e=><button key={e.id} className="aw-item" onClick={()=>onEvent(e)}>
      <span className="aw-item-icon"><AlertCircle size={19}/></span><span className="aw-item-copy"><strong>{e.title}</strong><small>{e.status==="draft"?"Draft waiting to publish":remainingPlaces(e,data)+" places left"}</small></span><ChevronRight size={17}/></button>):<div className="aw-list-empty">No events need attention right now.</div>}</div>
    </WorkspaceSection>
    <WorkspaceSection title="Recent registrations" description="Latest employees joining your events" action={<button className="aw-text-action" onClick={onPeople}>Team members <ArrowRight size={16}/></button>}>
      <div className="aw-list-panel">{latest.length?latest.map(r=>{const u=data.users.find(u=>u.id===r.userId),e=events.find(e=>e.id===r.eventId);return <button key={r.id} className="aw-item" onClick={()=>e&&onEvent(e)}>
       <span className="aw-person-avatar">{(u?.fullName||"U").split(" ").slice(0,2).map(x=>x[0]).join("")}</span><span className="aw-item-copy"><strong>{u?.fullName||"Employee"}</strong><small>{e?.title||"Event"} · {shortDate(r.createdAt)}</small></span><ChevronRight size={17}/>
      </button>}):<div className="aw-list-empty">No registrations yet. New RSVPs will appear here.</div>}</div>
    </WorkspaceSection>
   </div>
 </div>;
}
