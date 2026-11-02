import Link from "next/link";
import { CalendarDays, MapPin, ArrowUpRight, HeartHandshake, Leaf, GraduationCap, Sparkles } from "lucide-react";
import { niceDate, type EventRecord } from "@/lib/types";
export function EventCard({ event, registrations }: { event: EventRecord; registrations?: number }) {
  const category=event.category.toLowerCase();
  const Icon=category.includes("environment")?Leaf:category.includes("education")?GraduationCap:category.includes("volunteer")?HeartHandshake:Sparkles;
  const color=category.includes("environment")?"mint":category.includes("education")?"orange":"purple";
  const state=event.status==="draft"?"gray":event.status==="cancelled"?"red":"green";
  return <article className="event-card">
    <div className={"event-cover "+color}>
      <Icon size={70} strokeWidth={1.2}/>
      <span className={"pill "+state+" event-status"}>{event.status}</span>
    </div>
    <div className="event-body">
      <div className="event-tag">{event.category.toUpperCase()}</div>
      <h3>{event.title}</h3>
      <div className="event-meta"><CalendarDays size={15}/>{niceDate(event.start_at)}</div>
      <div className="event-meta"><MapPin size={15}/><span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{event.location}</span></div>
      <div className="event-actions">
        <span className="small muted">{registrations === undefined?"Up to "+event.capacity+" spots":registrations+" / "+event.capacity+" registered"}</span>
        <Link className="btn btn-sm btn-secondary" href={"/events/"+event.id}>Details <ArrowUpRight size={14}/></Link>
      </div>
    </div>
  </article>;
}