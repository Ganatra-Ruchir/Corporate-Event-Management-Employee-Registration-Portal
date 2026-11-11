"use client";

import {ArrowRight, Building2, CalendarDays, Clock3, Plus, TicketCheck, Users, UserRoundCheck, AlertCircle, ChevronRight} from "lucide-react";
import {activeRegistrations, registrationState, remainingPlaces, shortDate} from "@/lib/portal-model";
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
  <WorkspaceHeading eyebrow="ELIXIR FOUNDATION · PLATFORM" title="Your partner network" description="Keep track of organizations, their teams and events in one place."
   action={<button className="aw-primary" onClick={onAdd}><Plus size={18}/> Add organization</button>}/>
  <div className="aw-metric-grid">
   <Metric icon={Building2} value={data.companies.length} label="Organizations" detail={active.length+" active"}/>
   <Metric icon={Users} value={data.users.length} label="Accounts" detail="Including platform administrators"/>
   <Metric icon={CalendarDays} value={data.events.length} label="Events created" detail="All partner events"/>
   <Metric icon={TicketCheck} value={attendees} label="Active RSVPs" detail="Currently going"/>
  </div>
  <WorkspaceSection title="Organizations" description="Your organizations and their recent event activity"
   action={<button className="aw-text-action" onClick={onCompanies}>Manage organizations <ArrowRight size={16}/></button>}>
   <div className="aw-company-grid">{data.companies.map(c=>{const s=companyStats(c,data);return <button key={c.id} className="aw-company-card" onClick={()=>onCompany(c)}>
    <span className="aw-company-logo" aria-hidden="true">{c.name.split(/\s+/).slice(0,2).map(w=>w[0]).join("")}</span>
    <span className="aw-company-body"><strong>{c.name}</strong><small>{c.domains.join(", ")}</small><span className="aw-company-foot"><span>{s.events.length} events</span><span>{s.people} people</span><span className={"aw-status "+c.status}>{c.status}</span></span></span><ChevronRight size={18}/>
   </button>})}</div>
  </WorkspaceSection>
  <WorkspaceSection title="Quick actions" description="Common platform administration tasks">
   <div className="aw-action-grid">
    <button onClick={onAdd}><Building2 size={22}/><strong>Add an organization</strong><span>Set up an organization and its work domains</span><ArrowRight size={17}/></button>
    <button onClick={onInvites}><UserRoundCheck size={22}/><strong>Invite an organization admin</strong><span>Assign access to a partner manager</span><ArrowRight size={17}/></button>
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
 // Anything a host should act on: drafts (especially ones whose date has passed), closed registration with empty seats, nearly full events.
 const attention=(e:PortalEvent):string|null=>{
  const starts=new Date(e.startsAt).getTime();
  if(e.status==="draft")return starts<=now?"Draft dated in the past: move the date or cancel it":"Draft waiting to publish";
  if(e.status!=="published"||starts<=now)return null;
  const state=registrationState(e,data,now);
  if(state==="closed")return "Registration closed with "+remainingPlaces(e,data)+" seats unfilled";
  if(state==="waitlist"||state==="full")return "Full"+(state==="waitlist"?" · "+data.registrations.filter(r=>r.eventId===e.id&&r.status==="waitlisted").length+" waitlisted":"");
  if(remainingPlaces(e,data)<=3)return remainingPlaces(e,data)+" places left";
  return null;
 };
 const alertEvents=events.map(e=>({event:e,reason:attention(e)})).filter((x):x is {event:PortalEvent;reason:string}=>Boolean(x.reason));
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
    {upcoming.length?<div className="ed-tile-grid">{upcoming.slice(0,3).map(e=><EventTile event={e} data={data} onOpen={onEvent} key={e.id} now={now} showHost={false}/>)}</div>:<div className="aw-empty"><CalendarDays size={22}/><strong>No upcoming events</strong><p>Create an event to start accepting registrations.</p><button onClick={onCreate}>Create event <ArrowRight size={15}/></button></div>}
   </WorkspaceSection>
   <div className="aw-two-col">
    <WorkspaceSection title="Needs your attention" description="Drafts, closed registration and full events" action={<button className="aw-text-action" onClick={onEvents}>View events <ArrowRight size={16}/></button>}>
     <div className="aw-list-panel">{alertEvents.length?alertEvents.slice(0,5).map(({event:e,reason})=><button key={e.id} className="aw-item" onClick={()=>onEvent(e)}>
      <span className="aw-item-icon"><AlertCircle size={19}/></span><span className="aw-item-copy"><strong>{e.title}</strong><small>{reason}</small></span><ChevronRight size={17}/></button>):<div className="aw-list-empty">No events need attention right now.</div>}</div>
    </WorkspaceSection>
    <WorkspaceSection title="Recent registrations" description="Latest employees joining your events" action={<button className="aw-text-action" onClick={onPeople}>Team members <ArrowRight size={16}/></button>}>
      <div className="aw-list-panel">{latest.length?latest.map(r=>{const u=data.users.find(u=>u.id===r.userId),e=events.find(e=>e.id===r.eventId);return <button key={r.id} className="aw-item" onClick={()=>e&&onEvent(e)}>
       <span className="aw-person-avatar">{(u?.fullName||"U").split(" ").slice(0,2).map(x=>x[0]).join("")}</span><span className="aw-item-copy"><strong>{u?.fullName||"Employee"}</strong><small>{e?.title||"Event"} · {shortDate(r.createdAt)}</small></span><ChevronRight size={17}/>
      </button>}):<div className="aw-list-empty">No registrations yet. New RSVPs will appear here.</div>}</div>
    </WorkspaceSection>
   </div>
 </div>;
}
