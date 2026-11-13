"use client";
import {useCallback,useEffect,useMemo,useRef,useState} from "react";
import {Bell,BellRing,CalendarDays,Check,CheckCheck,Clock3,ExternalLink,X} from "lucide-react";
import {registrationState} from "@/lib/portal-model";
import type {Person,PortalEvent,PortalData} from "@/lib/portal-model";
type Props={user:Person;events:PortalEvent[];data:PortalData;onOpen:(id:string)=>void};
const DAY=86_400_000,HOUR=3_600_000;
/** Browser alerts fire once at each of these points before an event the employee joined. */
const ALERT_POINTS=[{before:DAY,label:"tomorrow"},{before:HOUR,label:"within the hour"}];
function timeLabel(time:number){
 if(time<HOUR)return Math.max(1,Math.ceil(time/60_000))+" min";
 if(time<DAY)return Math.ceil(time/HOUR)+" h";
 const days=Math.ceil(time/DAY);return days+(days===1?" day":" days");
}
const readSet=(key:string)=>{try{return new Set<string>(JSON.parse(localStorage.getItem(key)||"[]"));}catch{return new Set<string>();}};
const writeSet=(key:string,set:Set<string>)=>{try{localStorage.setItem(key,JSON.stringify([...set].slice(-200)));}catch{/* storage full or blocked: badge just won't persist */}};
/** A reminder's identity includes the start time, so a rescheduled event counts as new again. */
const itemKey=(e:PortalEvent)=>e.id+"@"+e.startsAt;

export function EmployeeEventNotifications({user,events,data,onOpen}:Props){
 const [open,setOpen]=useState(false);
 const [now,setNow]=useState(0);
 const [seen,setSeen]=useState<Set<string>>(new Set());
 const [browserPermission,setBrowserPermission]=useState<NotificationPermission|"unsupported">("unsupported");
 const [message,setMessage]=useState("");
 const shell=useRef<HTMLDivElement>(null);
 const bell=useRef<HTMLButtonElement>(null);
 const seenKey="elixir-reminders-seen:"+user.id;
 const joinedIds=useMemo(()=>new Set(data.registrations.filter(r=>r.userId===user.id&&(r.status==="going"||r.status==="waitlisted")).map(r=>r.eventId)),[data.registrations,user.id]);
 const week=useMemo(()=>events.filter(e=>e.status==="published"&&e.companyId===user.companyId&&new Date(e.startsAt).getTime()>now&&new Date(e.startsAt).getTime()-now<=7*DAY)
   .sort((a,b)=>new Date(a.startsAt).getTime()-new Date(b.startsAt).getTime()),[events,user.companyId,now]);
 // Two kinds of notification: reminders for events you joined, and events this week you can still join.
 const mine=useMemo(()=>week.filter(e=>joinedIds.has(e.id)).slice(0,8),[week,joinedIds]);
 const openToJoin=useMemo(()=>now?week.filter(e=>!joinedIds.has(e.id)&&(registrationState(e,data,now)==="open"||registrationState(e,data,now)==="waitlist")).slice(0,5):[],[week,joinedIds,data,now]);
 const all=useMemo(()=>[...mine,...openToJoin],[mine,openToJoin]);
 const unread=all.filter(e=>!seen.has(itemKey(e))).length;

 useEffect(()=>{
   const initial=window.setTimeout(()=>{
     setNow(Date.now());setSeen(readSet(seenKey));
     if("Notification" in window)setBrowserPermission(Notification.permission);
   },0);
   const handle=window.setInterval(()=>setNow(Date.now()),60_000);
   return ()=>{window.clearTimeout(initial);window.clearInterval(handle);};
 },[seenKey]);

 const [fresh,setFresh]=useState<Set<string>>(new Set());
 const markAllRead=useCallback(()=>{
   const next=new Set(seen);for(const e of all)next.add(itemKey(e));
   setSeen(next);writeSet(seenKey,next);
 },[all,seen,seenKey]);
 // Opening the panel counts as reading it, so the badge clears; items that were new stay highlighted until it closes.
 const toggle=()=>{
   if(open){setOpen(false);return;}
   setFresh(new Set(all.filter(e=>!seen.has(itemKey(e))).map(itemKey)));
   markAllRead();setOpen(true);
 };

 // Close on Escape or on any click outside the bell and panel.
 useEffect(()=>{
   if(!open)return;
   const onKey=(e:KeyboardEvent)=>{if(e.key==="Escape"){setOpen(false);bell.current?.focus();}};
   const onDown=(e:PointerEvent)=>{if(shell.current&&!shell.current.contains(e.target as Node))setOpen(false);};
   document.addEventListener("keydown",onKey);document.addEventListener("pointerdown",onDown);
   return ()=>{document.removeEventListener("keydown",onKey);document.removeEventListener("pointerdown",onDown);};
 },[open]);

 // Browser alerts: one a day before and one an hour before each joined event, while the portal is open.
 useEffect(()=>{
   if(!now||browserPermission!=="granted"||!("Notification" in window))return;
   const fired=readSet("elixir-reminders-alerted:"+user.id);let changed=false;
   for(const event of mine){
     const until=new Date(event.startsAt).getTime()-now;
     const point=ALERT_POINTS.filter(p=>until<=p.before).at(-1);
     if(!point)continue;
     const key=itemKey(event)+":"+point.before;
     if(fired.has(key))continue;
     try{
       const n=new Notification(event.title+" starts "+point.label,{body:"Starts in "+timeLabel(until)+(event.format==="online"?" · Online":event.location?" · "+event.location:""),tag:key});
       n.onclick=()=>{window.focus();onOpen(event.id);n.close();};
       fired.add(key);changed=true;
     }catch{/* permission revoked: in-app reminders still work */}
   }
   if(changed)writeSet("elixir-reminders-alerted:"+user.id,fired);
 },[now,browserPermission,mine,user.id,onOpen]);

 async function enableNotifications(){
   if(!("Notification" in window)){setMessage("This browser doesn't support notifications.");return;}
   try{
     const permission=await Notification.requestPermission();
     setBrowserPermission(permission);
     if(permission==="granted"){
       setMessage("Alerts are on. You'll get one a day before and an hour before events you join.");
       try{new Notification("Event alerts are on",{body:"You'll be reminded before events you join while the portal is open."});}catch{}
     }else setMessage(permission==="denied"?"Notifications are blocked. Allow them for this site in your browser's settings.":"Permission wasn't granted.");
   }catch{setMessage("Couldn't ask for notification permission.");}
 }
 const label=unread?unread+" new notification"+(unread===1?"":"s"):"Notifications";
 const row=(e:PortalEvent,kind:"mine"|"join")=>{
   const until=new Date(e.startsAt).getTime()-now;
   const isNew=fresh.has(itemKey(e));
   return <button type="button" key={kind+e.id} className={"en-item"+(isNew?" en-unread":"")} onClick={()=>{setOpen(false);onOpen(e.id);}}>
     <span className="en-calendar"><CalendarDays size={17}/></span>
     <span className="en-item-text"><strong>{e.title}</strong><small><Clock3 size={12}/> {kind==="mine"?"Starts in "+timeLabel(until)+(until<=DAY?" · tomorrow or sooner":""):"In "+timeLabel(until)+" · spots open"}</small></span><ExternalLink size={15}/>
   </button>;
 };
 return <div className="en-shell" ref={shell}>
   <button ref={bell} className="en-bell" type="button" onClick={toggle} aria-expanded={open} aria-haspopup="dialog" aria-label={label} title={label}>
     {unread?<BellRing size={19}/>:<Bell size={19}/>}
     {unread>0&&<span className="en-count" aria-hidden="true">{unread>9?"9+":unread}</span>}
   </button>
   {open&&<section className="en-panel" role="dialog" aria-label="Notifications">
     <div className="en-head"><div><strong>Notifications</strong><small>Your events and what&apos;s on this week</small></div><button type="button" aria-label="Close notifications" onClick={()=>setOpen(false)}><X size={18}/></button></div>
     {all.length===0?<p className="en-empty">Nothing this week. Events you join, and new events you can join, will show up here.</p>:<>
       {mine.length>0&&<><div className="en-group">Your events</div><div className="en-list">{mine.map(e=>row(e,"mine"))}</div></>}
       {openToJoin.length>0&&<><div className="en-group">Open to join this week</div><div className="en-list">{openToJoin.map(e=>row(e,"join"))}</div></>}
     </>}
     <div className="en-foot">
       {browserPermission==="granted"?<span className="en-enabled"><Check size={14}/> Browser alerts on</span>:
       browserPermission==="denied"?<span className="en-message">Browser alerts are blocked for this site. Allow notifications in your browser&apos;s site settings to turn them on.</span>:
       <button type="button" className="en-enable" onClick={()=>void enableNotifications()}><Bell size={14}/> Turn on browser alerts</button>}
       <small>Alerts arrive a day and an hour before events you join, while the portal is open in a tab.</small>
       {fresh.size>0&&<button type="button" className="en-mark-read" onClick={()=>setFresh(new Set())}><CheckCheck size={14}/> Mark all as read</button>}
       {message&&<span role="status" className="en-message">{message}</span>}
     </div>
   </section>}
 </div>;
}
