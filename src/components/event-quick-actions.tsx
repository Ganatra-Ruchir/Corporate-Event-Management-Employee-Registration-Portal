"use client";
import {useEffect,useState} from "react";
import {CalendarPlus,Copy,Check,ExternalLink,Download} from "lucide-react";
import {downloadBlob} from "@/lib/portal-model";
import type {PortalEvent} from "@/lib/portal-model";
function utc(input:string){return new Date(input).toISOString().replace(/[-:]/g,"").replace(/\.\d{3}/,"");}
function escapeIcs(value:string){return value.replace(/\\/g,"\\\\").replace(/\r?\n/g,"\\n").replace(/[,;]/g,m=>"\\"+m);}
export function EventQuickActions({event}:{event:PortalEvent}){
 const [copied,setCopied]=useState(false);
 // Reset the "Link copied" confirmation so the button can be used again.
 useEffect(()=>{if(!copied)return;const t=setTimeout(()=>setCopied(false),2000);return ()=>clearTimeout(t);},[copied]);
 function shareUrl(){return new URL("/?event="+encodeURIComponent(event.id),window.location.origin).toString();}
 async function copy(){
  try{await navigator.clipboard.writeText(shareUrl());setCopied(true);}catch{setCopied(false);}
 }
 function downloadCalendar(){
  const body=["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//Elixir Foundation//Events Portal//EN","BEGIN:VEVENT",
   "UID:"+event.id+"@events.elixirfoundation","DTSTAMP:"+utc(new Date().toISOString()),"DTSTART:"+utc(event.startsAt),"DTEND:"+utc(event.endsAt),
   "SUMMARY:"+escapeIcs(event.title),"DESCRIPTION:"+escapeIcs(event.description||event.summary),
   "LOCATION:"+escapeIcs(event.format==="online"?"Online event":event.location),"URL:"+shareUrl(),"END:VEVENT","END:VCALENDAR"].join("\r\n");
  downloadBlob("elixir-event-"+event.id.replace(/[^a-z0-9_-]/gi,"")+".ics",new Blob([body],{type:"text/calendar;charset=utf-8"}));
 }
 const google=new URL("https://calendar.google.com/calendar/render");
 google.searchParams.set("action","TEMPLATE");
 google.searchParams.set("text",event.title);
 google.searchParams.set("dates",utc(event.startsAt)+"/"+utc(event.endsAt));
 google.searchParams.set("details",event.description);
 google.searchParams.set("location",event.format==="online"?"Online":event.location);
 return <div className="event-quick-actions" role="group" aria-label="Event quick actions">
  <button type="button" onClick={()=>void copy()}>{copied?<Check size={15}/>:<Copy size={15}/>} <span aria-live="polite">{copied?"Link copied":"Copy event link"}</span></button>
  <button type="button" onClick={downloadCalendar}><Download size={15}/> Download calendar (.ics)</button>
  <a href={google.toString()} target="_blank" rel="noopener noreferrer"><CalendarPlus size={15}/> Google Calendar <ExternalLink size={12}/></a>
 </div>;
}
