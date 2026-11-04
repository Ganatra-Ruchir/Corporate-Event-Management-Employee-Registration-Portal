"use client";
import {useEffect,useMemo,useState} from "react";
import {Bell,BellRing,CalendarDays,Check,Clock3,ExternalLink,X} from "lucide-react";
import type {Person,PortalEvent,PortalData} from "@/lib/portal-model";
type Props={user:Person;events:PortalEvent[];data:PortalData;onOpen:(id:string)=>void};
const DAY=86_400_000;
function timeLabel(time:number){
 if(time<60*60_000)return Math.max(1,Math.ceil(time/60_000))+" minutes";
 if(time<DAY)return Math.ceil(time/(60*60_000))+" hours";
 return Math.ceil(time/DAY)+" days";
}
export function EmployeeEventNotifications({user,events,data,onOpen}:Props){
 const [open,setOpen]=useState(false);
 const [now,setNow]=useState(0);
 const [browserPermission,setBrowserPermission]=useState<NotificationPermission|"unsupported">("unsupported");
 const [message,setMessage]=useState("");
 const available=useMemo(()=>events.filter(e=>e.status==="published"&&e.companyId===user.companyId),[events,user.companyId]);
 const upcoming=available.filter(e=>new Date(e.startsAt).getTime()>now&&new Date(e.startsAt).getTime()-now<=7*DAY)
    .sort((a,b)=>new Date(a.startsAt).getTime()-new Date(b.startsAt).getTime()).slice(0,8);
 const soon=upcoming.filter(e=>new Date(e.startsAt).getTime()-now<=DAY);
 useEffect(()=>{
   setNow(Date.now());
   if(typeof window!=="undefined"&&"Notification" in window)setBrowserPermission(Notification.permission);
   const handle=window.setInterval(()=>setNow(Date.now()),60_000);
   return ()=>window.clearInterval(handle);
 },[]);
 useEffect(()=>{
   if(!now||browserPermission!=="granted"||typeof window==="undefined"||!("Notification" in window))return;
   for(const event of soon){
     const id="elixir-event-reminded:"+user.id+":"+event.id+":"+event.startsAt;
     if(localStorage.getItem(id))continue;
     // Notifications only fire while the portal is open. A service worker is
     // required to deliver notifications to closed browsers.
     try{
       new Notification("Your event is coming up",{body:event.title+" begins in "+timeLabel(new Date(event.startsAt).getTime()-now),tag:id});
       localStorage.setItem(id,String(Date.now()));
     }catch{setMessage("Browser notifications are blocked. Upcoming events remain visible here.");}
   }
 },[now,browserPermission,soon,user.id]);
 async function enableNotifications(){
   if(typeof window==="undefined"||!("Notification" in window)){setMessage("Browser notifications are not supported here.");return;}
   try{
     const permission=await Notification.requestPermission();
     setBrowserPermission(permission);
     setMessage(permission==="granted"?"Browser reminders enabled while the portal is open.":permission==="denied"?"Notifications were blocked in browser settings.":"Permission was not granted.");
   }catch{setMessage("Could not request browser notification permission.");}
 }
 return <div className="en-shell">
   <button className="en-bell" type="button" onClick={()=>setOpen(v=>!v)} aria-expanded={open} aria-label={"Event reminders: "+soon.length+" starting within 24 hours"} title="Upcoming event notifications">
     {soon.length?<BellRing size={19}/>:<Bell size={19}/>}
     {soon.length>0&&<span className="en-count">{soon.length}</span>}
   </button>
   {open&&<section className="en-panel" aria-label="Upcoming event notifications">
     <div className="en-head"><div><strong>Event reminders</strong><small>{soon.length?soon.length+" starting within 24 hours":"Your organization's upcoming events"}</small></div><button type="button" aria-label="Close reminders" onClick={()=>setOpen(false)}><X size={18}/></button></div>
     {upcoming.length===0?<p className="en-empty">No published events starting in the next seven days.</p>:
     <div className="en-list">{upcoming.map(e=>{
       const until=new Date(e.startsAt).getTime()-now;
       const joined=data.registrations.some(r=>r.userId===user.id&&r.eventId===e.id&&(r.status==="going"||r.status==="waitlisted"));
       return <button type="button" key={e.id} className="en-item" onClick={()=>{setOpen(false);onOpen(e.id);}}>
         <span className="en-calendar"><CalendarDays size={17}/></span><span className="en-item-text"><strong>{e.title}</strong><small><Clock3 size={12}/> Starts in {timeLabel(until)} {joined?"· You're registered":""}</small></span><ExternalLink size={15}/>
       </button>;
     })}</div>}
     <div className="en-foot">
       {browserPermission==="granted"?<span className="en-enabled"><Check size={14}/> Browser reminders enabled</span>:
       <button type="button" className="en-enable" onClick={()=>void enableNotifications()}><Bell size={14}/> Enable browser alerts</button>}
       <small>Reminders appear here when you open the portal. Browser alerts work while this website is open; closed-browser push and email need a separate notification service.</small>
       {message&&<span role="status" className="en-message">{message}</span>}
     </div>
   </section>}
 </div>;
}
