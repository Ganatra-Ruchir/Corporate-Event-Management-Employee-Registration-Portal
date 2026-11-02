"use client";
import Image from "next/image";
import { ArrowRight, CalendarDays, MapPin, Clock3 } from "lucide-react";
import {activeRegistrations, remainingPlaces} from "@/lib/portal-model";
import type { PortalEvent, PortalData, Person } from "@/lib/portal-model";

function dateParts(stamp:string) {
  const date=new Date(stamp);
  return {
    day:date.toLocaleDateString("en-IN",{day:"2-digit"}),
    weekday:date.toLocaleDateString("en-IN",{weekday:"short"}).toUpperCase(),
    month:date.toLocaleDateString("en-IN",{month:"short"}).toUpperCase(),
    full:date.toLocaleDateString("en-IN",{weekday:"short",day:"numeric",month:"short",year:"numeric"}),
    clock:date.toLocaleTimeString("en-IN",{hour:"numeric",minute:"2-digit"})
  };
}
export function EventCover({event,wide=false}:{event:PortalEvent;wide?:boolean}) {
  const color=event.category.toLowerCase().replace(/[^a-z]+/g,"-");
  return <div className={"ed-cover ed-cover-"+color+(wide?" ed-cover-wide":"")}>
    {event.bannerDataUrl?
      <Image alt={event.bannerAlt||event.title} src={event.bannerDataUrl} width={1200} height={675} unoptimized />:
      <div className="ed-cover-inner" aria-label={event.category+" event"}>
        <div className="ed-art-ring ed-art-ring-one" aria-hidden="true"/>
        <div className="ed-art-ring ed-art-ring-two" aria-hidden="true"/>
        <span className="ed-art-category">{event.category}</span>
        <span className="ed-art-monogram" aria-hidden="true">{event.category.slice(0,1)}</span>
      </div>
    }
    {wide&&<span className="ed-cover-label">{event.format==="online"?"Online event":event.format==="hybrid"?"Hybrid event":"In-person event"}</span>}
  </div>;
}
function initials(name:string) {return name.split(" ").filter(Boolean).slice(0,2).map(x=>x[0]).join("").toUpperCase();}
export function GoingFaces({event,data,limit=3}:{event:PortalEvent;data:PortalData;limit?:number}) {
  const regs=activeRegistrations(event.id,data);
  const names=regs.map(r=>data.users.find(u=>u.id===r.userId)).filter((x):x is Person=>Boolean(x)&&x?.showInAttendeeLists!==false);
  return <div className="ed-going">
    <div className="ed-face-stack" aria-hidden="true">{names.slice(0,limit).map((person,i)=><span className={"ed-face ed-face-"+(i%4)} key={person.id}>{initials(person.fullName)}</span>)}</div>
    <span>{regs.length} going</span>
  </div>;
}
export function EventTile({event,data,onOpen}:{event:PortalEvent;data:PortalData;onOpen:(event:PortalEvent)=>void}){
  const d=dateParts(event.startsAt);
  const host=data.users.find(u=>u.id===event.createdBy);
  return <button type="button" className="ed-tile" onClick={()=>onOpen(event)} aria-label={"View "+event.title}>
    <div className="ed-tile-cover"><EventCover event={event}/>{event.status!=="published"&&<span className={"ed-tile-status "+event.status}>{event.status}</span>}</div>
    <div className="ed-tile-content">
      <div className="ed-tile-top"><div className="ed-date-mini"><strong>{d.day}</strong><span>{d.month}</span></div><div className="ed-tile-title-wrap"><span className="ed-eyebrow">{d.weekday} · {d.clock}</span><h3>{event.title}</h3></div></div>
      <div className="ed-tile-host">Hosted by {host?.fullName||"Company team"}</div>
      <div className="ed-tile-meta"><MapPin size={15}/><span>{event.format==="online"?"Online":event.location}</span></div>
      <div className="ed-tile-foot"><GoingFaces event={event} data={data}/><span className="ed-tile-spots">{event.status==="published"?remainingPlaces(event,data)+" spots left":event.status==="draft"?"Not published":"Cancelled"}</span></div>
    </div>
  </button>;
}
function Section({title,sub,items,data,onOpen,onMore}:{title:string;sub?:string;items:PortalEvent[];data:PortalData;onOpen:(e:PortalEvent)=>void;onMore?:()=>void}){
  if(items.length===0)return null;
  return <section className="ed-section">
    <div className="ed-section-head"><div><h2>{title}</h2>{sub&&<p>{sub}</p>}</div>{onMore&&<button type="button" onClick={onMore}>See all <ArrowRight size={17}/></button>}</div>
    <div className="ed-tile-grid">{items.slice(0,3).map(e=><EventTile event={e} data={data} onOpen={onOpen} key={e.id}/>)}</div>
  </section>;
}
export function DiscoverHome({data,events,user,onOpen,onBrowse,onCategory,now}:{data:PortalData;events:PortalEvent[];user:Person;onOpen:(e:PortalEvent)=>void;onBrowse:()=>void;onCategory:(category:string)=>void;now:number}){
  const future=events.filter(e=>e.status==="published"&&new Date(e.startsAt).getTime()>now).sort((a,b)=>new Date(a.startsAt).getTime()-new Date(b.startsAt).getTime());
  const selected=future.find(e=>e.category==="Volunteering"||e.category==="Environment")||future[0];
  const joined=future.filter(e=>activeRegistrations(e.id,data).some(r=>r.userId===user.id));
  // Keep the discovery feed useful: do not repeat the same card in every section.
  const assigned=new Set(joined.map(e=>e.id));
  const collect=(match:(e:PortalEvent)=>boolean)=>{
    const results=future.filter(e=>!assigned.has(e.id)&&match(e));
    for(const e of results)assigned.add(e.id);
    return results;
  };
  const week=collect(e=>new Date(e.startsAt).getTime()-now<7*86400000);
  const volunteer=collect(e=>["Volunteering","Environment","Community","Health"].includes(e.category));
  const learning=collect(e=>["Education","Workshop","Town Hall"].includes(e.category));
  const coming=collect(()=>true);
  return <div className="ed-discover">
    <div className="ed-welcome"><span className="ed-eyebrow">EVENTS AT YOUR COMPANY</span><h1>Find something worth showing up for.</h1><p>Meet colleagues, learn something new, and take part in events hosted by your team.</p></div>
    {selected?<button type="button" className="ed-feature" onClick={()=>onOpen(selected)}>
      <div className="ed-feature-visual"><EventCover event={selected} wide/></div>
      <div className="ed-feature-content"><span className="ed-feature-tag">Featured event</span><span className="ed-feature-date"><CalendarDays size={17}/> {dateParts(selected.startsAt).full} · {dateParts(selected.startsAt).clock}</span><h2>{selected.title}</h2><p>{selected.summary}</p><span className="ed-feature-location"><MapPin size={16}/> {selected.format==="online"?"Online":selected.location}</span><span className="ed-feature-cta">See event details <ArrowRight size={17}/></span></div>
    </button>:<div className="ed-feature-empty"><h2>No upcoming events yet</h2><p>New company events will appear here once hosts publish them.</p></div>}
    <nav className="ed-category-nav" aria-label="Explore categories">
      {["All events","Volunteering","Learning","Environment","Health"].map(c=><button key={c} onClick={()=>c==="All events"?onBrowse():onCategory(c)}>{c}<ArrowRight size={14}/></button>)}
    </nav>
    {joined.length===0&&<p className="ed-no-rsvps">You haven't joined an upcoming event yet. Browse the events below to find one.</p>}
    <Section title="Your upcoming events" sub="The events you've already joined" items={joined} data={data} onOpen={onOpen} onMore={onBrowse}/>
    <Section title="This week" sub="Make plans with your team" items={week} data={data} onOpen={onOpen} onMore={onBrowse}/>
    <Section title="Volunteering" sub="Spend time on something that matters" items={volunteer} data={data} onOpen={onOpen} onMore={()=>onCategory("Volunteering")}/>
    <Section title="Learning" sub="Workshops, talks and new skills" items={learning} data={data} onOpen={onOpen} onMore={()=>onCategory("Education")}/>
    <Section title="Coming up" sub="More events on the calendar" items={coming} data={data} onOpen={onOpen} onMore={onBrowse}/>
  </div>;
}
export function DiscoverBrowse({data,events,onOpen,search,setSearch,category,setCategory,timeFilter,setTimeFilter,placesOnly,setPlacesOnly,now}:{data:PortalData;events:PortalEvent[];onOpen:(e:PortalEvent)=>void;search:string;setSearch:(s:string)=>void;category:string;setCategory:(s:string)=>void;timeFilter:string;setTimeFilter:(s:string)=>void;placesOnly:boolean;setPlacesOnly:(v:boolean)=>void;now:number}){
  const categoryOptions=["All","Volunteering","Learning","Environment","Education","Workshop","Health","Community","Social","Town Hall"];
  const [layout,setLayout]=useStateSafe();
  const filtered=events.filter(e=>{
    if(e.status!=="published")return false;
    if(search&&! [e.title,e.summary,e.category,e.location].join(" ").toLowerCase().includes(search.toLowerCase()))return false;
    if(category!=="All"){
      if(category==="Learning"){if(!["Education","Workshop","Town Hall"].includes(e.category))return false;}
      else if(category==="Volunteering"){if(!["Volunteering","Environment","Community","Health"].includes(e.category))return false;}
      else if(category!==e.category)return false;
    }
    if(placesOnly&&remainingPlaces(e,data)===0)return false;
    const time=new Date(e.startsAt).getTime();
    if(timeFilter==="Upcoming"&&time<now)return false;
    if(timeFilter==="Past"&&time>=now)return false;
    return true;
  }).sort((a,b)=>new Date(a.startsAt).getTime()-new Date(b.startsAt).getTime());
  return <div className="ed-browse">
    <div className="ed-browse-title"><span className="ed-eyebrow">COMPANY EVENTS</span><h1>Explore events</h1><p>Find events, filter by interest, and register with your colleagues.</p></div>
    <div className="ed-browse-controls">
      <label className="ed-input-search"><SearchIcon/><span className="sr-only">Search events</span><input aria-label="Search events" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search events, topics, or places"/></label>
      <label><span>Category</span><select value={category} onChange={e=>setCategory(e.target.value)}>{categoryOptions.concat(categoryOptions.includes(category)?[]:[category]).map(x=><option key={x}>{x}</option>)}</select></label>
      <label><span>When</span><select value={timeFilter} onChange={e=>setTimeFilter(e.target.value)}>{["Upcoming","Past","All"].map(x=><option key={x}>{x}</option>)}</select></label>
      <label className="ed-available"><input type="checkbox" checked={placesOnly} onChange={e=>setPlacesOnly(e.target.checked)}/> Spots available</label>
    </div>
    <div className="ed-browse-row"><strong>{filtered.length} events</strong><div className="ed-display-switch"><button className={layout==="grid"?"active":""} onClick={()=>setLayout("grid")}>Grid</button><button className={layout==="calendar"?"active":""} onClick={()=>setLayout("calendar")}>Calendar</button></div></div>
    {layout==="grid"?<div className="ed-tile-grid">{filtered.map(e=><EventTile event={e} data={data} onOpen={onOpen} key={e.id}/>)}</div>:
      <div className="ed-calendar-view">{groupByDay(filtered).map(group=><div className="ed-calendar-day" key={group.date}><div className="ed-calendar-day-label">{group.date}</div><div>{group.events.map(e=><button key={e.id} onClick={()=>onOpen(e)}><Clock3 size={17}/><span>{dateParts(e.startsAt).clock}</span><strong>{e.title}</strong><ArrowRight size={16}/></button>)}</div></div>)}</div>}
    {filtered.length===0&&<div className="ed-small-empty">No events match your filters. Try a different date or category.</div>}
  </div>;
}
import {useState} from "react";
import {Search} from "lucide-react";
function useStateSafe(){return useState<"grid"|"calendar">("grid");}
function SearchIcon(){return <Search size={19} aria-hidden="true"/>;}
function groupByDay(events:PortalEvent[]){
  const groups=new Map<string,PortalEvent[]>();
  for(const event of events){const day=dateParts(event.startsAt).full;groups.set(day,[...(groups.get(day)||[]),event]);}
  return [...groups].map(([date,items])=>({date,events:items}));
}
