"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import {DiscoverHome, DiscoverBrowse, EventTile, GoingFaces} from "@/components/event-discovery";
import {SpeakerEditor} from "@/components/speaker-editor";
import {SpeakerGallery} from "@/components/speaker-gallery";
import {
  ArrowLeft, ArrowRight, CalendarDays, MapPin, ChevronRight,
  Download, LogOut, Menu, Plus, Search, X
} from "lucide-react";
import {
  activeRegistrations, canCancel, canRegister, cancelLocally, CATEGORIES, dateText, DEMO_PASSWORD,
  eventAccess, exportCsv, initialData, makeId, remainingPlaces,
  registerLocally, registrationsFor, shortDate, signupCompany, toInput, validateEvent,
  waitlistedRegistrations, waitlistPosition, promoteWaitlistLocally
} from "@/lib/portal-model";
import type { Company, EventFormat, EventStatus, Invitation, Person, PortalData, PortalEvent, Role } from "@/lib/portal-model";

type View="home"|"events"|"registrations"|"people"|"companies"|"invitations"|"users"|"profile"|"event"|"eventForm"|"companyForm";
type AuthView="login"|"signup"|"verify"|"forgot";
const STORE="elixir-events-data-v3",SESSION="elixir-events-session-v2";
const initialEvent=(companyId:string,userId:string):PortalEvent=>({
  id:makeId("event"),companyId,title:"",summary:"",description:"",category:"Volunteering",
  format:"in_person",location:"",onlineLink:"",startsAt:"2026-12-04T09:00:00+05:30",
  endsAt:"2026-12-04T12:00:00+05:30",capacity:25,deadline:"",
  contactEmail:"",status:"draft",cancellationReason:"",createdBy:userId
});
const roleName=(role:Role)=>role==="platform_admin"?"Platform admin":role==="company_admin"?"Company admin":"Employee";
const pageName=(view:View)=>({
  home:"Discover",events:"Events",registrations:"My events",people:"People",companies:"Companies",
  invitations:"Invitations",users:"Accounts",profile:"Profile",event:"Event details",eventForm:"Event form",companyForm:"Company form"
})[view];
const emailOk=(e:string)=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim());
const parseDomains=(s:string)=>[...new Set(s.split(/[,\s]+/).map(x=>x.trim().toLowerCase()).filter(Boolean))];
async function encodePassword(password:string,salt=crypto.randomUUID()){
  const raw=new TextEncoder().encode(salt+":"+password);
  const digest=await crypto.subtle.digest("SHA-256",raw);
  return "sha256:"+salt+":"+Array.from(new Uint8Array(digest)).map(b=>b.toString(16).padStart(2,"0")).join("");
}
async function passwordMatches(saved:string,provided:string){
  if(!saved.startsWith("sha256:"))return saved===provided;
  const parts=saved.split(":");
  return await encodePassword(provided,parts[1])===saved;
}
function FormRow({label,children}:{label:string;children:React.ReactNode}){return <label className="ep-field"><span>{label}</span>{children}</label>;}
function Chip({children,tone="neutral"}:{children:React.ReactNode;tone?:"neutral"|"green"|"red"|"orange"}){return <span className={"ep-chip "+tone}>{children}</span>;}
function EmptyState({title,description}:{title:string;description:string}){return <div className="ep-empty"><h3>{title}</h3><p>{description}</p></div>;}
function Action({children,onClick,kind="primary",disabled=false,type="button"}:{children:React.ReactNode;onClick?:()=>void;kind?:"primary"|"secondary"|"plain"|"danger";disabled?:boolean;type?:"button"|"submit"}) {
  return <button className={"ep-button "+kind} type={type} onClick={onClick} disabled={disabled}>{children}</button>;
}

function calendarStamp(iso:string){return new Date(iso).toISOString().replace(/[-:]/g,"").replace(/\.\d{3}/,"");}
function calendarText(s:string){return s.replace(/\\/g,"\\\\").replace(/\n/g,"\\n").replace(/,/g,"\\,").replace(/;/g,"\\;");}
function saveCalendarEvent(event:PortalEvent){
  const contents=["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//Elixir Foundation//Events Portal//EN",
    "BEGIN:VEVENT","UID:"+event.id+"@elixir-events.example",
    "DTSTAMP:"+calendarStamp(new Date().toISOString()),
    "DTSTART:"+calendarStamp(event.startsAt),"DTEND:"+calendarStamp(event.endsAt),
    "SUMMARY:"+calendarText(event.title),"DESCRIPTION:"+calendarText(event.summary),
    "LOCATION:"+calendarText(event.format==="online"?"Online":event.location),"END:VEVENT","END:VCALENDAR"].join("\r\n");
  const url=URL.createObjectURL(new Blob([contents],{type:"text/calendar;charset=utf-8"}));
  const anchor=document.createElement("a");anchor.href=url;anchor.download="elixir-event-"+event.id+".ics";anchor.click();URL.revokeObjectURL(url);
}
function googleCalendarUrl(event:PortalEvent){
  const params=new URLSearchParams({action:"TEMPLATE",text:event.title,
    dates:calendarStamp(event.startsAt)+"/"+calendarStamp(event.endsAt),
    details:event.summary,location:event.format==="online"?"Online":event.location});
  return "https://calendar.google.com/calendar/render?"+params.toString();
}
function EventEditor({event,data,onSave,onBack}:{event:PortalEvent;data:PortalData;onSave:(event:PortalEvent)=>void;onBack:()=>void}){
  const [form,setForm]=useState<PortalEvent>({...event});
  const [error,setError]=useState("");
  const update=<K extends keyof PortalEvent>(key:K,value:PortalEvent[K])=>setForm(old=>({...old,[key]:value}));
  async function uploadBanner(file?:File){
    if(!file)return;
    setError("");
    if(!["image/jpeg","image/png","image/webp"].includes(file.type)){setError("Choose a JPG, PNG or WebP image.");return;}
    if(file.size>5*1024*1024){setError("Banner must be no larger than 5 MB.");return;}
    try{
      const image=await createImageBitmap(file);
      const canvas=document.createElement("canvas");canvas.width=1200;canvas.height=675;
      const ctx=canvas.getContext("2d");if(!ctx)throw Error("Image processor unavailable");
      const scale=Math.max(canvas.width/image.width,canvas.height/image.height);
      const w=image.width*scale,h=image.height*scale;
      ctx.drawImage(image,(canvas.width-w)/2,(canvas.height-h)/2,w,h);
      image.close();
      const processed=canvas.toDataURL("image/webp",0.78);
      // Browser storage limits are smaller than an actual media backend.
      if(processed.length>1_800_000)throw Error("Image is too large for this browser draft.");
      update("bannerDataUrl",processed);
    }catch(e){setError(e instanceof Error?e.message:"Unable to process this image.");}
  }
  function submit(e:React.FormEvent){
    e.preventDefault();
    const next={...form,startsAt:new Date(form.startsAt).toISOString(),endsAt:new Date(form.endsAt).toISOString(),deadline:form.deadline?new Date(form.deadline).toISOString():""};
    const issue=validateEvent(next,data);
    if(issue){setError(issue);return;}
    onSave(next);
  }
  return <div>
    <button className="ep-back" type="button" onClick={onBack}><ArrowLeft size={16}/> Back</button>
    <div className="ep-page-head"><div><h1>{data.events.some(e=>e.id===event.id)?"Edit event":"Create event"}</h1><p>Provide the information employees need before registering.</p></div></div>
    <form className="ep-panel ep-form" onSubmit={submit}>
      <h2>Event information</h2>
      <FormRow label="Event banner (optional, JPG/PNG/WebP up to 5 MB)"><input type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>void uploadBanner(e.target.files?.[0])}/></FormRow>
      {form.bannerDataUrl&&<div className="ep-banner-preview"><Image src={form.bannerDataUrl} width={600} height={338} unoptimized alt={form.bannerAlt||"Draft event banner"}/><Action kind="secondary" onClick={()=>update("bannerDataUrl",undefined)}>Remove banner</Action></div>}
      {form.bannerDataUrl&&<FormRow label="Banner alt text (required)"><input required maxLength={200} value={form.bannerAlt||""} onChange={e=>update("bannerAlt",e.target.value)} placeholder="Describe the banner for screen reader users"/></FormRow>}
      <FormRow label="Event title"><input required minLength={3} maxLength={160} value={form.title} onChange={e=>update("title",e.target.value)}/></FormRow>
      <FormRow label="Short summary"><input required maxLength={240} value={form.summary} onChange={e=>update("summary",e.target.value)}/></FormRow>
      <FormRow label="Description"><textarea required rows={5} value={form.description} onChange={e=>update("description",e.target.value)}/></FormRow>
      <div className="ep-form-grid">
        <FormRow label="Category"><select value={form.category} onChange={e=>update("category",e.target.value)}>{CATEGORIES.map(x=><option key={x}>{x}</option>)}</select></FormRow>
        <FormRow label="Format"><select value={form.format} onChange={e=>update("format",e.target.value as EventFormat)}><option value="in_person">In person</option><option value="online">Online</option><option value="hybrid">Hybrid</option></select></FormRow>
      </div>
      {form.format!=="online"&&<FormRow label="Venue or address"><input required value={form.location} onChange={e=>update("location",e.target.value)}/></FormRow>}
      {form.format!=="in_person"&&<FormRow label="Online meeting link (HTTPS)"><input type="url" required value={form.onlineLink} onChange={e=>update("onlineLink",e.target.value)} placeholder="https://example.com/meeting"/></FormRow>}
      <div className="ep-form-grid">
        <FormRow label="Start date and time"><input required type="datetime-local" value={toInput(form.startsAt)} onChange={e=>update("startsAt",e.target.value?new Date(e.target.value).toISOString():"")}/></FormRow>
        <FormRow label="End date and time"><input required type="datetime-local" value={toInput(form.endsAt)} onChange={e=>update("endsAt",e.target.value?new Date(e.target.value).toISOString():"")}/></FormRow>
        <FormRow label="Maximum participants"><input required min={1} max={100000} type="number" value={form.capacity} onChange={e=>update("capacity",Number(e.target.value))}/></FormRow>
        <FormRow label="Registration deadline (optional)"><input type="datetime-local" value={toInput(form.deadline)} onChange={e=>update("deadline",e.target.value?new Date(e.target.value).toISOString():"")}/></FormRow>
      </div>
      <SpeakerEditor speakers={form.speakers||[]} onChange={speakers=>update("speakers",speakers)}/>
      <label className="ep-check"><input type="checkbox" checked={form.waitlistEnabled!==false} onChange={e=>update("waitlistEnabled",e.target.checked)}/> Allow a waitlist when the event is full</label>
      <FormRow label="Organiser contact email"><input type="email" required value={form.contactEmail} onChange={e=>update("contactEmail",e.target.value)}/></FormRow>
      <FormRow label="Status"><select value={form.status} onChange={e=>update("status",e.target.value as EventStatus)}><option value="draft">Draft (admin only)</option><option value="published">Published</option><option value="cancelled">Cancelled</option></select></FormRow>
      {form.status==="cancelled"&&<FormRow label="Reason for cancellation (optional)"><textarea rows={2} value={form.cancellationReason} onChange={e=>update("cancellationReason",e.target.value)}/></FormRow>}
      {error&&<div className="ep-error" role="alert">{error}</div>}
      <div className="ep-actions"><Action kind="secondary" onClick={onBack}>Discard</Action><Action type="submit">Save event</Action></div>
    </form>
  </div>;
}
function CompanyEditor({company,data,onSave,onBack}:{company?:Company;data:PortalData;onSave:(company:Company)=>void;onBack:()=>void}){
  const [name,setName]=useState(company?.name||"");
  const [domains,setDomains]=useState((company?.domains||[]).join(", "));
  const [error,setError]=useState("");
  function submit(e:React.FormEvent){
    e.preventDefault();const ds=parseDomains(domains);
    if(name.trim().length<3){setError("Enter a company name with at least three characters.");return;}
    if(ds.length===0||ds.some(d=>!/^([a-z0-9-]+\.)+[a-z]{2,}$/.test(d))){setError("Enter valid company email domains separated by commas.");return;}
    const conflict=data.companies.some(c=>c.id!==company?.id&&c.domains.some(d=>ds.includes(d)));
    if(conflict){setError("A domain is already assigned to another company.");return;}
    onSave({id:company?.id||makeId("company"),name:name.trim(),domains:ds,status:company?.status||"active",createdAt:company?.createdAt||new Date().toISOString()});
  }
  return <><button className="ep-back" onClick={onBack}><ArrowLeft size={16}/> Back</button>
    <div className="ep-page-head"><h1>{company?"Edit company":"Add company"}</h1></div>
    <form onSubmit={submit} className="ep-panel ep-form">
      <FormRow label="Company name"><input required value={name} onChange={e=>setName(e.target.value)}/></FormRow>
      <FormRow label="Work email domains (comma separated)"><textarea rows={3} required value={domains} onChange={e=>setDomains(e.target.value)} placeholder="northwind.example, northwind-group.example"/></FormRow>
      <p className="ep-hint">Employees with an allowed domain can join this company. Admin access always requires an invitation or promotion.</p>
      {error&&<div className="ep-error" role="alert">{error}</div>}
      <div className="ep-actions"><Action kind="secondary" onClick={onBack}>Discard</Action><Action type="submit">Save company</Action></div>
    </form>
  </>;
}
function AuthPage({data,onLogin,onSignup,onVerified,onReset}:{data:PortalData;onLogin:(email:string,password:string)=>Promise<string|null>;onSignup:(fullName:string,email:string,department:string,password:string)=>Promise<string|null>;onVerified:(id:string)=>void;onReset:(email:string)=>string}){
  const [mode,setMode]=useState<AuthView>("login");
  const [email,setEmail]=useState("");
  const [pass,setPass]=useState("");
  const [name,setName]=useState("");
  const [department,setDepartment]=useState("");
  const [error,setError]=useState("");
  const [message,setMessage]=useState("");
  const [verifyId,setVerifyId]=useState("");
  const [busy,setBusy]=useState(false);
  const exampleAccounts=data.users.filter(u=>["platform","manager","employee"].includes(u.id));
  async function submit(e:React.FormEvent){
    e.preventDefault();setBusy(true);setError("");setMessage("");
    if(mode==="login"){
      const issue=await onLogin(email,pass);if(issue)setError(issue);
    }else if(mode==="signup"){
      const issue=await onSignup(name,email,department,pass);if(issue)setError(issue);
      else{const u=data.users.find(p=>p.email===email.toLowerCase().trim());setVerifyId(u?.id||"");setMode("verify");}
    }else if(mode==="forgot"){setMessage(onReset(email));}
    setBusy(false);
  }
  return <div className="ep-auth-layout">
    <div className="ep-auth-card">
      <div className="ep-auth-heading"><span className="ep-product-name">Elixir Events Portal</span><span className="ep-tag">Browser-only draft</span></div>
      <h1>{mode==="login"?"Sign in":mode==="signup"?"Create employee account":mode==="forgot"?"Reset demonstration password":"Verify demonstration email"}</h1>
      <p className="ep-subtle">{mode==="login"?"Access your company's events with your account.":mode==="signup"?"Use a work email belonging to a partner company.":mode==="forgot"?"In this local draft, password reset is displayed on screen; no email is sent.":"Email cannot be delivered without a backend. Confirm the sample verification here."}</p>
      {mode==="verify"?<>
        <div className="ep-info">This is simulated email verification. The real product will send a secure verification link.</div>
        <Action onClick={()=>{const u=data.users.find(x=>x.email===email.toLowerCase().trim());onVerified(u?.id||verifyId);setMode("login");setMessage("Demo email verified. Sign in to continue.");setPass("");}}>Confirm sample email</Action>
      </>:<form onSubmit={submit} className="ep-auth-form">
        {mode==="signup"&&<><FormRow label="Full name"><input required minLength={2} autoComplete="name" value={name} onChange={e=>setName(e.target.value)}/></FormRow><FormRow label="Department"><input value={department} maxLength={100} onChange={e=>setDepartment(e.target.value)}/></FormRow></>}
        <FormRow label="Work email"><input type="email" autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)}/></FormRow>
        {mode!=="forgot"&&<FormRow label="Password"><input type="password" minLength={6} autoComplete={mode==="login"?"current-password":"new-password"} required value={pass} onChange={e=>setPass(e.target.value)}/></FormRow>}
        {mode==="signup"&&<p className="ep-hint">This prototype stores account details in your browser. Use only a disposable demonstration password, never a real work password.</p>}
        {error&&<div role="alert" className="ep-error">{error}</div>}
        {message&&<div role="status" className="ep-success">{message}</div>}
        <Action type="submit" disabled={busy}>{busy?"Working…":mode==="login"?"Sign in":mode==="signup"?"Create account":"Reset demo password"} <ArrowRight size={16}/></Action>
      </form>}
      <div className="ep-auth-links">
        {mode!=="login"&&<button type="button" onClick={()=>{setMode("login");setError("");setMessage("");}}>Back to sign in</button>}
        {mode==="login"&&<><button type="button" onClick={()=>{setMode("signup");setError("");setMessage("");}}>Create an employee account</button><button type="button" onClick={()=>{setMode("forgot");setError("");setMessage("");}}>Forgot password?</button><button type="button" onClick={()=>{const u=data.users.find(p=>p.email===email.toLowerCase().trim()&&!p.verified);if(!u){setError("Enter the email of an unverified demonstration account.");return;}setVerifyId(u.id);setMode("verify");setError("");}}>Verify sample email</button></>}
      </div>
      {mode==="login"&&<section className="ep-demo-users" aria-label="Sample accounts">
        <h2>Try a sample account</h2><p>All three accounts use the demonstration password shown below. No actual accounts or emails are used.</p>
        {exampleAccounts.map(u=><button key={u.id} type="button" onClick={()=>{setEmail(u.email);setPass(DEMO_PASSWORD);setError("");}}><span><b>{roleName(u.role)}</b><small>{u.email}</small></span><span>Use account <ChevronRight size={14}/></span></button>)}
        <p className="ep-hint">Demo password: <code>{DEMO_PASSWORD}</code></p>
      </section>}
    </div>
    <aside className="ep-auth-aside"><h2>Company events in one place.</h2><p>Create company events, manage registrations, and give employees a clear way to take part.</p><div className="ep-aside-steps"><p><strong>Platform admin</strong> manages partner companies.</p><p><strong>Company admin</strong> plans events and manages employees.</p><p><strong>Employee</strong> discovers events and registers.</p></div></aside>
  </div>;
}

export default function ElixirPortal(){
  const [data,setData]=useState<PortalData>(initialData);
  const [session,setSession]=useState<string|null>(null);
  const [ready,setReady]=useState(false);
  const [now,setNow]=useState(0);
  const [view,setView]=useState<View>("home");
  const [selectedEvent,setSelectedEvent]=useState<string|null>(null);
  const [selectedCompany,setSelectedCompany]=useState<string|null>(null);
  const [editingEvent,setEditingEvent]=useState<PortalEvent|null>(null);
  const [editingCompany,setEditingCompany]=useState<Company|null>(null);
  const [notice,setNotice]=useState("");
  const [search,setSearch]=useState("");
  const [participantSearch,setParticipantSearch]=useState("");
  const [showAttendees,setShowAttendees]=useState(false);
  const [historyFilter,setHistoryFilter]=useState("All");
  const [category,setCategory]=useState("All");
  const [timeFilter,setTimeFilter]=useState("Upcoming");
  const [placesOnly,setPlacesOnly]=useState(false);
  const [menu,setMenu]=useState(false);
  const [inviteEmail,setInviteEmail]=useState("");
  const [inviteCompany,setInviteCompany]=useState("");
  const [inviteError,setInviteError]=useState("");
  const [profileName,setProfileName]=useState<string|null>(null);
  const [profileDepartment,setProfileDepartment]=useState<string|null>(null);
  const [profilePw,setProfilePw]=useState("");
  const [profilePwConfirm,setProfilePwConfirm]=useState("");
  const [profileError,setProfileError]=useState("");
  const [profileSuccess,setProfileSuccess]=useState("");
  useEffect(()=>{
    void Promise.resolve().then(()=>{
      try{
        const s=localStorage.getItem(STORE);
        if(s){const d=JSON.parse(s) as PortalData;if(d&&Array.isArray(d.companies)&&Array.isArray(d.users)&&Array.isArray(d.events)&&Array.isArray(d.registrations)&&Array.isArray(d.invitations)) {
          // Import previous browser-only demo state into the shared V2 status model.
          const updated={...d,registrations:d.registrations.map(r=>({
            ...r,status:(r.status as string)==="registered"?"going":(r.status as string)==="removed"?"cancelled":r.status
          })) as PortalData["registrations"]};
          if(!localStorage.getItem("elixir-v2-speakers-onboarded")){
            updated.events=updated.events.map(e=>{
              const example=initialData.events.find(x=>x.id===e.id);
              return !e.speakers?.length&&example?.speakers?.length?{...e,speakers:example.speakers}:e;
            });
            localStorage.setItem("elixir-v2-speakers-onboarded","1");
            try{localStorage.setItem(STORE,JSON.stringify(updated));}catch{}
          }
          setData(updated);
        }}
        const u=localStorage.getItem(SESSION);
        if(u){
          setSession(u);
          const eventId=new URLSearchParams(window.location.search).get("event");
          if(eventId){setSelectedEvent(eventId);setView("event");}
        }
      }catch{}
      setNow(Date.now());
      setReady(true);
    });
  },[]);
  const save=(newData:PortalData)=>{
    try{localStorage.setItem(STORE,JSON.stringify(newData));setData(newData);return true;}
    catch{setNotice("Browser storage is full. Try smaller photos or remove unused images. Your changes were not saved.");return false;}
  };
  const flash=(message:string)=>{setNotice(message);};
  const current=data.users.find(p=>p.id===session)||null;
  const company=current?.companyId?data.companies.find(c=>c.id===current.companyId)||null:null;
  const blocked=Boolean(current&&(current.status==="suspended"||(current.companyId&&(!company||company.status==="suspended"))));
  const events=current?.role==="platform_admin"?data.events:current?.companyId?data.events.filter(e=>e.companyId===current.companyId):[];
  const companyEvents=events;
  const nav:(View[]) = current?.role==="platform_admin"?["home","companies","invitations","users","profile"]:
    current?.role==="company_admin"?["home","events","registrations","people","profile"]:["home","events","registrations","profile"];
  const goto=(v:View)=>{
    setView(v);setNotice("");setParticipantSearch("");setSearch("");
    setCategory("All");setPlacesOnly(false);setTimeFilter("Upcoming");setMenu(false);
    if(v!=="event"&&typeof window!=="undefined"&&new URLSearchParams(window.location.search).has("event")){
      window.history.replaceState(null,"",window.location.pathname);
    }
  };
  const openEvent=(id:string)=>{
    setSelectedEvent(id);goto("event");
    window.history.replaceState(null,"",window.location.pathname+"?event="+encodeURIComponent(id));
  };

  async function login(email:string,password:string):Promise<string|null>{
    const u=data.users.find(x=>x.email.toLowerCase()===email.toLowerCase().trim());
    if(!u||!(await passwordMatches(u.password,password)))return "Invalid email or password.";
    if(!u.verified)return "Verify the sample email before signing in.";
    const org=u.companyId?data.companies.find(c=>c.id===u.companyId):null;
    if(u.status==="suspended"||org?.status==="suspended")return "This account or company is suspended. Contact the platform administrator.";
    setSession(u.id);try{localStorage.setItem(SESSION,u.id);}catch{}
    const requested=new URLSearchParams(window.location.search).get("event");
    const target=data.events.find(e=>e.id===requested);
    if(target&&eventAccess(u,target,data)){setSelectedEvent(target.id);setView("event");}
    else{setView("home");if(requested)window.history.replaceState(null,"",window.location.pathname);}
    return null;
  }
  async function signup(name:string,email:string,dept:string,password:string):Promise<string|null>{
    const result=signupCompany(email,data);
    if(result.error||!result.company)return result.error||"Company not found.";
    if(name.trim().length<2)return "Enter your full name.";
    if(password.length<6)return "Use a demo password with at least six characters.";
    const invitation=data.invitations.find(i=>i.email===email.toLowerCase().trim()&&i.companyId===result.company?.id&&!i.accepted);
    const user:Person={
      id:makeId("user"),fullName:name.trim(),email:email.toLowerCase().trim(),
      department:dept.trim(),role:invitation?"company_admin":"employee",companyId:result.company.id,
      status:"active",verified:false,password:await encodePassword(password)
    };
    save({...data,users:[...data.users,user],invitations:data.invitations.map(i=>i.id===invitation?.id?{...i,accepted:true}:i)});
    return null;
  }
  function verify(id:string){save({...data,users:data.users.map(u=>u.id===id?{...u,verified:true}:u)});}
  function reset(email:string){
    const u=data.users.find(x=>x.email.toLowerCase()===email.toLowerCase().trim());
    if(!u)return "If an account exists, its demonstration password has been reset.";
    save({...data,users:data.users.map(p=>p.id===u.id?{...p,password:DEMO_PASSWORD}:p)});
    return "Local demo password reset to "+DEMO_PASSWORD+". No email was sent.";
  }
  function logout(){setSession(null);try{localStorage.removeItem(SESSION);}catch{}goto("home");}

  function saveEvent(e:PortalEvent){
    if(current?.role!=="company_admin"||!current.companyId||e.companyId!==current.companyId){flash("Permission denied.");return;}
    const existing=data.events.some(x=>x.id===e.id);
    const next={...data,events:existing?data.events.map(x=>x.id===e.id?e:x):[...data.events,e]};
    if(save(promoteWaitlistLocally(e,next))){setEditingEvent(null);openEvent(e.id);flash(existing?"Event updated.":"Event created.");}
  }
  function modifyRegistration(event:PortalEvent,cancel:boolean){
    if(!current)return;
    if(!cancel&&!window.confirm("Register for "+event.title+"?"))return;
    if(cancel&&!window.confirm("Cancel your registration for "+event.title+"?"))return;
    const output=cancel?cancelLocally(current,event,data):registerLocally(current,event,data);
    if(output.error)flash(output.error);else{save(output.data);flash(cancel?"RSVP cancelled.":output.data.registrations.find(r=>r.eventId===event.id&&r.userId===current.id)?.status==="waitlisted"?"You joined the waitlist.":"You are going to this event.");}
  }
  function cancelEvent(event:PortalEvent){
    if(current?.role!=="company_admin"||event.companyId!==current.companyId)return;
    const reason=window.prompt("Reason for cancellation (optional):","")??null;
    if(reason===null)return;
    if(!window.confirm("Cancel this event? Employees will see the cancellation status."))return;
    save({...data,events:data.events.map(e=>e.id===event.id?{...e,status:"cancelled",cancellationReason:reason}:e)});flash("Event cancelled.");
  }
  function removeParticipant(event:PortalEvent,userId:string){
    if(current?.role!=="company_admin"||event.companyId!==current.companyId)return;
    if(!window.confirm("Remove this participant from the event?"))return;
    const next={...data,registrations:data.registrations.map(r=>r.eventId===event.id&&r.userId===userId&&r.status==="going"?{...r,status:"cancelled" as const}:r)};
    save(promoteWaitlistLocally(event,next));
    flash("Participant removed.");
  }
  function saveCompany(c:Company){
    if(current?.role!=="platform_admin")return;
    save({...data,companies:data.companies.some(x=>x.id===c.id)?data.companies.map(x=>x.id===c.id?c:x):[...data.companies,c]});
    setEditingCompany(null);goto("companies");flash("Company saved.");
  }
  function changeCompanyStatus(c:Company){
    if(current?.role!=="platform_admin")return;
    const status=c.status==="active"?"suspended":"active";
    if(!window.confirm((status==="suspended"?"Suspend":"Reactivate")+" "+c.name+"?"))return;
    save({...data,companies:data.companies.map(x=>x.id===c.id?{...x,status}:x)});flash("Company "+status+".");
  }
  function changeRole(person:Person){
    if(current?.role!=="company_admin"||person.companyId!==current.companyId||person.id===current.id||person.status==="suspended")return;
    const role=person.role==="employee"?"company_admin":"employee";
    if(!window.confirm("Change "+person.fullName+" to "+roleName(role)+"?"))return;
    save({...data,users:data.users.map(x=>x.id===person.id?{...x,role}:x)});flash("Account role updated.");
  }
  function changeUserStatus(person:Person){
    if(current?.role!=="platform_admin"||person.role==="platform_admin")return;
    const status=person.status==="active"?"suspended":"active";
    if(!window.confirm((status==="suspended"?"Suspend":"Reactivate")+" "+person.email+"?"))return;
    save({...data,users:data.users.map(u=>u.id===person.id?{...u,status}:u)});flash("User "+status+".");
  }
  function invite(e:React.FormEvent){
    e.preventDefault();setInviteError("");
    if(current?.role!=="platform_admin")return;
    const email=inviteEmail.trim().toLowerCase(),c=data.companies.find(x=>x.id===inviteCompany);
    if(!emailOk(email)||!c||c.status==="suspended"){setInviteError("Enter a valid email and select an active company.");return;}
    if(data.users.some(u=>u.email===email)){setInviteError("That email already has an account. Promote the employee from the company's People page instead.");return;}
    if(data.invitations.some(i=>i.email===email&&!i.accepted)){setInviteError("A pending invitation already exists for that email.");return;}
    const invitation:Invitation={id:makeId("invite"),email,companyId:c.id,role:"company_admin",code:makeId("code"),accepted:false};
    save({...data,invitations:[...data.invitations,invitation]});setInviteEmail("");flash("Company-admin invitation created in this browser. Share the email instructions manually; no email has been sent.");
  }
  async function profileSave(e:React.FormEvent){
    e.preventDefault();if(!current)return;
    setProfileError("");setProfileSuccess("");
    const fullName=profileName??current.fullName,department=profileDepartment??current.department;
    if(fullName.trim().length<2){setProfileError("Enter your full name.");return;}
    if(profilePw&&profilePw!==profilePwConfirm){setProfileError("The new passwords do not match.");return;}
    if(profilePw&&profilePw.length<6){setProfileError("Use at least six characters for the demonstration password.");return;}
    const password=profilePw?await encodePassword(profilePw):current.password;
    save({...data,users:data.users.map(u=>u.id===current.id?{...u,fullName:fullName.trim(),department:department.trim(),password}:u)});
    setProfilePw("");setProfilePwConfirm("");setProfileSuccess("Profile saved in this browser.");
  }
  if(!ready)return <main className="ep-loading" role="status">Loading demonstration…</main>;
  if(!current)return <AuthPage data={data} onLogin={login} onSignup={signup} onVerified={verify} onReset={reset}/>;
  if(blocked)return <main className="ep-auth-layout"><div className="ep-auth-card"><h1>Account unavailable</h1><p>Your account or company is suspended.</p><Action onClick={logout}>Sign out</Action></div></main>;

  const selected=selectedEvent?data.events.find(e=>e.id===selectedEvent):null;
  const eventHost=selected?data.users.find(u=>u.id===selected.createdBy):null;
  const permittedAttendees=selected?activeRegistrations(selected.id,data).map(r=>data.users.find(u=>u.id===r.userId))
     .filter((p):p is Person=>Boolean(p)&&p!.showInAttendeeLists!==false&&p!.companyId===selected.companyId):[];
  const chosenCompany=selectedCompany?data.companies.find(c=>c.id===selectedCompany):null;
  const filteredEvents=events.filter(e=>{
    if(current.role==="employee"&&e.status!=="published")return false;
    if(search&&!(e.title+" "+e.summary+" "+e.location+" "+e.category).toLowerCase().includes(search.toLowerCase()))return false;
    if(category!=="All"&&e.category!==category)return false;
    if(placesOnly&&remainingPlaces(e,data)===0)return false;
    if(timeFilter==="Upcoming"&&new Date(e.startsAt)<new Date(now))return false;
    if(timeFilter==="Past"&&new Date(e.startsAt)>=new Date(now))return false;
    return true;
  }).sort((a,b)=>new Date(a.startsAt).getTime()-new Date(b.startsAt).getTime());
  const myRegs=registrationsFor(current.id,data).sort((a,b)=>new Date(b.createdAt).getTime()-new Date(a.createdAt).getTime());
  const visibleRegs=myRegs.filter(r=>{const e=data.events.find(x=>x.id===r.eventId);if(!e||!eventAccess(current,e,data))return false;
    if(historyFilter==="Upcoming")return (r.status==="going"||r.status==="waitlisted")&&new Date(e.startsAt).getTime()>now;
    if(historyFilter==="Past")return new Date(e.startsAt).getTime()<=now;
    if(historyFilter==="Cancelled")return r.status==="cancelled";return true;});
  const companyPeople=data.users.filter(u=>u.companyId===current.companyId);
  const availableCompanies=data.companies;
  return <div className="ep-shell">
    <a className="ep-skip" href="#main-content">Skip to main content</a>
    <header className="ep-topbar">
      <div className="ep-top-left"><button className="ep-menu" aria-label="Toggle navigation" onClick={()=>setMenu(!menu)}><Menu size={20}/></button><span className="ep-brand">Elixir Events Portal</span><span className="ep-divider-line"/><span className="ep-context">{current.role==="platform_admin"?"Platform management":company?.name||"Company events"}</span></div>
      <div className="ep-top-right"><span className="ep-draft-marker">LOCAL DRAFT · NO DATABASE</span><button className="ep-account" onClick={()=>goto("profile")}><span className="ep-initials">{current.fullName.split(" ").slice(0,2).map(x=>x[0]).join("").toUpperCase()}</span><span>{current.fullName}</span></button></div>
    </header>
    <div className="ep-layout">
      <nav className={"ep-sidebar "+(menu?"expanded":"")} aria-label="Main navigation">
        <div className="ep-nav-title">{roleName(current.role)}</div>
        {nav.map(v=><button key={v} aria-current={view===v?"page":undefined} className={"ep-nav-link"+(view===v?" active":"")} onClick={()=>goto(v)}>{pageName(v)}</button>)}
        <div className="ep-side-bottom"><button className="ep-nav-link" onClick={logout}><LogOut size={17}/> Sign out</button></div>
      </nav>
      <main className="ep-main" id="main-content" tabIndex={-1}>
        <div className="ep-demobar"><strong>Preview mode.</strong> Sample data is saved only in this browser. No real accounts or shared database. <button type="button" onClick={()=>{if(window.confirm("Reset every sample company, account and event in this browser?")){save(structuredClone(initialData));setSession(null);localStorage.removeItem(SESSION);}}}>Reset all sample data</button></div>
        {notice&&<div className="ep-info ep-notice" role="status"><span>{notice}</span><button aria-label="Dismiss message" onClick={()=>setNotice("")}><X size={17}/></button></div>}
        {view==="eventForm"&&editingEvent&&<EventEditor key={editingEvent.id} event={editingEvent} data={data} onSave={saveEvent} onBack={()=>goto("events")}/>}
        {view==="companyForm"&&<CompanyEditor key={editingCompany?.id||"new"} company={editingCompany||undefined} data={data} onSave={saveCompany} onBack={()=>goto("companies")}/>}
        {view==="home"&&current.role==="employee"&&<DiscoverHome
          data={data} events={companyEvents} user={current} now={now}
          onOpen={e=>{openEvent(e.id);}}
          onBrowse={()=>goto("events")}
          onCategory={c=>{goto("events");setCategory(c);}}
        />}
        {view==="events"&&current.role==="employee"&&<DiscoverBrowse
          data={data} events={companyEvents} now={now}
          onOpen={e=>{openEvent(e.id);}}
          search={search} setSearch={setSearch}
          category={category} setCategory={setCategory}
          timeFilter={timeFilter} setTimeFilter={setTimeFilter}
          placesOnly={placesOnly} setPlacesOnly={setPlacesOnly}
        />}
        {view==="home"&&current.role!=="employee"&&<>
          <div className="ep-page-head ep-overview-heading"><div><span className="ed-eyebrow">{current.role==="platform_admin"?"ELIXIR FOUNDATION":company?.name.toUpperCase()}</span><h1>{current.role==="platform_admin"?"Partner overview":"Manage your events"}</h1><p>{current.role==="platform_admin"?"Companies, people, and events in one place.":"Plan what's next and see who's joining."}</p></div></div>
          {current.role==="platform_admin"?<>
            <div className="ep-stats"><div><span>Partner companies</span><b>{data.companies.length}</b></div><div><span>Active companies</span><b>{data.companies.filter(c=>c.status==="active").length}</b></div><div><span>Total events</span><b>{data.events.length}</b></div><div><span>Total registrations</span><b>{data.registrations.filter(r=>r.status==="going").length}</b></div></div>
            <section className="ep-panel"><div className="ep-section-head"><h2>Partner companies</h2><Action onClick={()=>{setEditingCompany(null);goto("companyForm");}}><Plus size={16}/> Add company</Action></div><CompanyTable companies={availableCompanies} data={data} onView={id=>{setSelectedCompany(id);goto("companies");}}/></section>
          </>:<>
            <div className="ep-stats"><div><span>Upcoming events</span><b>{companyEvents.filter(e=>e.status==="published"&&new Date(e.startsAt).getTime()>now).length}</b></div><div><span>Draft events</span><b>{companyEvents.filter(e=>e.status==="draft").length}</b></div><div><span>Active registrations</span><b>{companyEvents.reduce((n,e)=>n+activeRegistrations(e.id,data).length,0)}</b></div><div><span>Nearly full events</span><b>{companyEvents.filter(e=>e.status==="published"&&remainingPlaces(e,data)<=3).length}</b></div></div>
            <div className="ed-admin-spotlight"><div className="ed-section-head"><div><h2>Next events</h2><p>Published and ready for your employees</p></div><button onClick={()=>goto("events")}>Manage all <ArrowRight size={17}/></button></div>
              <div className="ed-tile-grid">{companyEvents.filter(e=>e.status==="published"&&new Date(e.startsAt).getTime()>now).sort((a,b)=>new Date(a.startsAt).getTime()-new Date(b.startsAt).getTime()).slice(0,3).map(e=><EventTile event={e} data={data} key={e.id} onOpen={item=>{openEvent(item.id);}}/>)}</div>
            </div>
            <div className="ep-section-head"><h2>Events requiring attention</h2><Action onClick={()=>{setEditingEvent({...initialEvent(current.companyId!,current.id),contactEmail:current.email});goto("eventForm");}}><Plus size={16}/> Create event</Action></div>
            <div className="ep-panel">{companyEvents.filter(e=>e.status==="draft"||(e.status==="published"&&remainingPlaces(e,data)<=3)).length?
              companyEvents.filter(e=>e.status==="draft"||(e.status==="published"&&remainingPlaces(e,data)<=3)).map(e=><button className="ep-row-link" key={e.id} onClick={()=>{openEvent(e.id);}}><span><b>{e.title}</b><small>{e.status==="draft"?"Draft to review":remainingPlaces(e,data)+" places left"}</small></span><ChevronRight size={17}/></button>):
              <EmptyState title="No events need attention" description="Drafts and nearly full events will appear here."/>}</div>
          </>}
        </>}
        {view==="events"&&current.role!=="employee"&&<>
          <div className="ep-page-head"><div><h1>{current.role==="company_admin"?"Company events":"Events"}</h1><p>View upcoming and past events at your company.</p></div>{current.role==="company_admin"&&<Action onClick={()=>{setEditingEvent({...initialEvent(current.companyId!,current.id),contactEmail:current.email});goto("eventForm");}}><Plus size={16}/> Create event</Action>}</div>
          <div className="ep-filters">
            <FormRow label="Search events"><div className="ep-search"><Search size={18}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Title, location or category"/></div></FormRow>
            <FormRow label="Time period"><select value={timeFilter} onChange={e=>setTimeFilter(e.target.value)}><option>Upcoming</option><option>Past</option><option>All</option></select></FormRow>
            <FormRow label="Category"><select value={category} onChange={e=>setCategory(e.target.value)}><option>All</option>{CATEGORIES.map(c=><option key={c}>{c}</option>)}</select></FormRow>
            <label className="ep-check"><input type="checkbox" checked={placesOnly} onChange={e=>setPlacesOnly(e.target.checked)}/> Has places left</label>
          </div>
          <p className="ep-count">{filteredEvents.length} event{filteredEvents.length===1?"":"s"}</p>
          {filteredEvents.length?<div className="ed-tile-grid">{filteredEvents.map(e=><EventTile key={e.id} event={e} data={data} onOpen={event=>{openEvent(event.id);}}/>)}</div>:<EmptyState title="No matching events" description="Try a different category, time period or search."/>}
        </>}
        {view==="event"&&selected&&(eventAccess(current,selected,data))&&<>
          <button className="ep-back" onClick={()=>goto("events")}><ArrowLeft size={16}/> Back to events</button>
          <div className={"ep-banner ep-banner-"+selected.category.toLowerCase().replace(/[^a-z]/g,"-")} role="img" aria-label={selected.bannerAlt||selected.title}>
            {selected.bannerDataUrl?<Image src={selected.bannerDataUrl} alt={selected.bannerAlt||selected.title} width={1280} height={720} unoptimized/>:<div className="ep-banner-fallback"><span>{selected.category}</span><strong>{selected.title}</strong></div>}
          </div>
          <div className="ep-page-head"><div><div className="ep-event-label">{selected.category} · {selected.format.replace("_"," ")}</div><h1>{selected.title}</h1><p>{selected.summary}</p></div><Chip tone={selected.status==="published"?"green":selected.status==="cancelled"?"red":"neutral"}>{selected.status}</Chip></div>
          {selected.status==="cancelled"&&<div className="ep-error" role="status">Event cancelled. {selected.cancellationReason||"Contact the organiser for details."}</div>}
          <div className="ep-detail-layout"><article className="ep-panel ep-detail-copy">
              <div className="ed-detail-keyfacts"><span><CalendarDays size={19}/>{dateText(selected.startsAt)}</span><span><MapPin size={19}/>{selected.format==="online"?"Online event":selected.location}</span></div>
              <h2>About this event</h2><p>{selected.description}</p>
              <dl><div><dt>Starts</dt><dd>{dateText(selected.startsAt)}</dd></div><div><dt>Ends</dt><dd>{dateText(selected.endsAt)}</dd></div>
                {selected.format!=="online"&&<div><dt>Location</dt><dd>{selected.location} <a href={"https://www.google.com/maps/search/?api=1&query="+encodeURIComponent(selected.location)} target="_blank" rel="noopener noreferrer">Open in Maps</a></dd></div>}
                {selected.format!=="in_person"&&<div><dt>Online link</dt><dd>{activeRegistrations(selected.id,data).some(r=>r.userId===current.id)||current.role==="company_admin"?<a href={selected.onlineLink} target="_blank" rel="noopener noreferrer">Join online event</a>:"Available after RSVP"}</dd></div>}
                <div><dt>Organiser</dt><dd><a href={"mailto:"+selected.contactEmail}>{selected.contactEmail}</a></dd></div>
                <div><dt>Available places</dt><dd>{remainingPlaces(selected,data)} of {selected.capacity}</dd></div>
                {selected.deadline&&<div><dt>Registration closes</dt><dd>{dateText(selected.deadline)}</dd></div>}
              </dl>
              <div className="ed-detail-section">
                <h2>Hosted by</h2>
                <div className="ed-host-card"><span className="ed-host-avatar">{(eventHost?.fullName||"Company host").split(" ").slice(0,2).map(x=>x[0]).join("").toUpperCase()}</span><div><strong>{eventHost?.fullName||"Company team"}</strong><p>{eventHost?.department||company?.name||"Event organizer"}</p></div><a href={"mailto:"+selected.contactEmail}>Contact host</a></div>
              </div>
              <div className="ed-detail-section">
                <div className="ed-attendee-heading"><h2>Who&apos;s going</h2><strong>{activeRegistrations(selected.id,data).length} going</strong></div>
                <GoingFaces event={selected} data={data} limit={5}/>
                <p className="ed-privacy-note">People who choose to stay private are included in the count but not listed by name.</p>
                <button className="ed-see-attendees" type="button" onClick={()=>setShowAttendees(v=>!v)} aria-expanded={showAttendees}>{showAttendees?"Hide attendee list":"See attendees"} <ChevronRight size={17}/></button>
                {showAttendees&&<div className="ed-attendee-list">{permittedAttendees.length?permittedAttendees.map(person=><div key={person.id} className="ed-attendee-row"><span className="ed-attendee-avatar">{person.fullName.split(" ").slice(0,2).map(x=>x[0]).join("").toUpperCase()}</span><span><strong>{person.fullName}</strong><small>{person.department||"Colleague"}</small></span></div>):<p className="ep-hint">No colleagues have opted in to appear by name.</p>}</div>}
              </div>
            </article>
            <aside className="ep-panel ep-detail-side"><h2>Registration</h2>
              <div className="ed-rsvp-count"><strong>{remainingPlaces(selected,data)}</strong><span>spots left of {selected.capacity}</span></div>
              <div className="ed-rsvp-progress" role="progressbar" aria-label="Reserved places" aria-valuenow={activeRegistrations(selected.id,data).length} aria-valuemax={selected.capacity} aria-valuemin={0}><span style={{width:(100*activeRegistrations(selected.id,data).length/selected.capacity)+"%"}}/></div>
              <p>{activeRegistrations(selected.id,data).length} going</p>
              {waitlistedRegistrations(selected.id,data).length>0&&<p>{waitlistedRegistrations(selected.id,data).length} on the waitlist</p>}
              {data.registrations.some(r=>r.eventId===selected.id&&r.userId===current.id&&(r.status==="going"||r.status==="waitlisted"))?
                <><div className="ep-success">{waitlistPosition(selected.id,current.id,data)>0?"You're #"+waitlistPosition(selected.id,current.id,data)+" on the waitlist":"You're going"}</div><Action kind="secondary" onClick={()=>modifyRegistration(selected,true)} disabled={!!canCancel(current,selected,data)}>Cancel RSVP</Action></>:
                <><Action disabled={!!canRegister(current,selected,data)} onClick={()=>modifyRegistration(selected,false)}>{remainingPlaces(selected,data)===0?"Join waitlist":"Attend"}</Action>{canRegister(current,selected,data)&&<p className="ep-hint">{canRegister(current,selected,data)}</p>}</>}
              <div className="ep-calendar-actions"><Action kind="secondary" onClick={()=>saveCalendarEvent(selected)}>Add to calendar (.ics)</Action><Action kind="secondary" onClick={()=>window.open(googleCalendarUrl(selected),"_blank","noopener,noreferrer")}>Google Calendar</Action><Action kind="secondary" onClick={()=>navigator.clipboard.writeText(window.location.origin+window.location.pathname+"?event="+encodeURIComponent(selected.id)).then(()=>flash("Preview link copied. Saved events are available only in this browser.")).catch(()=>flash("Clipboard access was blocked."))}>Copy preview link</Action></div>
              {current.role==="company_admin"&&<div className="ep-admin-actions"><h3>Manage event</h3><Action kind="secondary" onClick={()=>{setEditingEvent(selected);goto("eventForm");}}>Edit event</Action>{selected.status!=="cancelled"&&<Action kind="danger" onClick={()=>cancelEvent(selected)}>Cancel event</Action>}</div>}
            </aside>
          </div>
          {(selected.speakers||[]).length>0&&<SpeakerGallery speakers={selected.speakers||[]}/>}
          {current.role!=="platform_admin"&&<div className="ed-mobile-rsvp">
            <span>{data.registrations.some(r=>r.eventId===selected.id&&r.userId===current.id&&(r.status==="going"||r.status==="waitlisted"))?"Your RSVP is saved":remainingPlaces(selected,data)+" spots left"}</span>
            {data.registrations.some(r=>r.eventId===selected.id&&r.userId===current.id&&(r.status==="going"||r.status==="waitlisted"))?
              <button type="button" onClick={()=>modifyRegistration(selected,true)} disabled={!!canCancel(current,selected,data)}>Cancel RSVP</button>:
              <button type="button" onClick={()=>modifyRegistration(selected,false)} disabled={!!canRegister(current,selected,data)}>{remainingPlaces(selected,data)===0?"Join waitlist":"Attend"}</button>}
          </div>}
          {current.role==="company_admin"&&<section className="ep-panel ep-participants"><div className="ep-section-head"><h2>Participants</h2><Action kind="secondary" onClick={()=>exportCsv("participants-"+selected.id+".csv",["Name","Email","Department","Registered"],activeRegistrations(selected.id,data).map(r=>{const p=data.users.find(u=>u.id===r.userId);return[p?.fullName||"",p?.email||"",p?.department||"",dateText(r.createdAt)];}))}><Download size={16}/> Export CSV</Action></div>
            <div className="ep-participant-search"><FormRow label="Search participants"><input value={participantSearch} onChange={e=>setParticipantSearch(e.target.value)} placeholder="Name, email or department"/></FormRow></div>
          {waitlistedRegistrations(selected.id,data).length>0&&<div className="ep-info">{waitlistedRegistrations(selected.id,data).length} employees are waitlisted and will be promoted in order when places open.</div>}
          {activeRegistrations(selected.id,data).length?<div className="ep-table-scroll"><table><thead><tr><th>Employee</th><th>Department</th><th>Registered</th><th>Action</th></tr></thead><tbody>{activeRegistrations(selected.id,data).filter(r=>{const p=data.users.find(u=>u.id===r.userId);return [p?.fullName,p?.email,p?.department].join(" ").toLowerCase().includes(participantSearch.toLowerCase());}).map(r=>{const p=data.users.find(u=>u.id===r.userId);return <tr key={r.id}><td><b>{p?.fullName}</b><small>{p?.email}</small></td><td>{p?.department}</td><td>{shortDate(r.createdAt)}</td><td><button onClick={()=>removeParticipant(selected,r.userId)}>Remove</button></td></tr>;})}</tbody></table></div>:<EmptyState title="No participants" description="Employee registrations will appear here."/>}
          </section>}
        </>}
        {view==="event"&&(!selected||!eventAccess(current,selected,data))&&<EmptyState title="Event not available" description="The event was not found or you do not have access."/>}
        {view==="registrations"&&<>
          <div className="ep-page-head"><div><h1>My registrations</h1><p>Upcoming, past and cancelled event registrations.</p></div></div>
          <div className="ep-filters"><FormRow label="Show registrations"><select value={historyFilter} onChange={e=>setHistoryFilter(e.target.value)}><option>All</option><option>Upcoming</option><option>Past</option><option>Cancelled</option></select></FormRow></div>
          <div className="ep-panel">{visibleRegs.length?
            <div className="ep-table-scroll"><table><thead><tr><th>Event</th><th>Date</th><th>Status</th><th>Action</th></tr></thead><tbody>{visibleRegs.map(r=>{const e=data.events.find(x=>x.id===r.eventId)!;return <tr key={r.id}><td><b>{e.title}</b><small>{e.category}</small></td><td>{dateText(e.startsAt)}</td><td><Chip tone={r.status==="going"?"green":r.status==="waitlisted"?"orange":"neutral"}>{r.status}</Chip></td><td><button onClick={()=>{openEvent(e.id);}}>Details</button></td></tr>;})}</tbody></table></div>:<EmptyState title="No registrations" description="Events that you join will appear here."/>}
          </div>
        </>}
        {view==="people"&&current.role==="company_admin"&&<>
          <div className="ep-page-head"><div><h1>Company people</h1><p>Employees and administrators of {company?.name}.</p></div></div>
          <div className="ep-panel ep-table-scroll"><table><thead><tr><th>Name</th><th>Email</th><th>Department</th><th>Role</th><th>Action</th></tr></thead><tbody>{companyPeople.map(p=><tr key={p.id}><td><b>{p.fullName}</b></td><td>{p.email}</td><td>{p.department||"—"}</td><td>{roleName(p.role)}</td><td>{p.id===current.id?"Your account":<button onClick={()=>changeRole(p)}>{p.role==="employee"?"Make company admin":"Remove admin access"}</button>}</td></tr>)}</tbody></table></div>
        </>}
        {view==="companies"&&current.role==="platform_admin"&&<>
          <div className="ep-page-head"><div><h1>Partner companies</h1><p>Manage companies and their approved work email domains.</p></div><Action onClick={()=>{setEditingCompany(null);setSelectedCompany(null);goto("companyForm");}}><Plus size={16}/> Add company</Action></div>
          {chosenCompany&&<div className="ep-panel ep-selected-company"><div><h2>{chosenCompany.name}</h2><p>Domains: {chosenCompany.domains.join(", ")}</p><Chip tone={chosenCompany.status==="active"?"green":"red"}>{chosenCompany.status}</Chip></div><div className="ep-actions"><Action kind="secondary" onClick={()=>{setEditingCompany(chosenCompany);goto("companyForm");}}>Edit company</Action><Action kind={chosenCompany.status==="active"?"danger":"secondary"} onClick={()=>changeCompanyStatus(chosenCompany)}>{chosenCompany.status==="active"?"Suspend":"Reactivate"}</Action><Action kind="plain" onClick={()=>setSelectedCompany(null)}>Close</Action></div></div>}
          <div className="ep-panel"><CompanyTable companies={availableCompanies} data={data} onView={setSelectedCompany}/></div>
        </>}
        {view==="invitations"&&current.role==="platform_admin"&&<>
          <div className="ep-page-head"><div><h1>Company admin invitations</h1><p>Invite the first administrator for a partner company.</p></div></div>
          <form className="ep-panel ep-invite-form" onSubmit={invite}>
            <FormRow label="Company"><select required value={inviteCompany} onChange={e=>setInviteCompany(e.target.value)}><option value="">Select company</option>{data.companies.filter(c=>c.status==="active").map(c=><option value={c.id} key={c.id}>{c.name}</option>)}</select></FormRow>
            <FormRow label="Email address"><input required type="email" value={inviteEmail} onChange={e=>setInviteEmail(e.target.value)} placeholder="manager@company.example"/></FormRow>
            {inviteError&&<div className="ep-error" role="alert">{inviteError}</div>}
            <Action type="submit">Create invitation</Action>
            <p className="ep-hint">No email will be sent. The invited person can create a local demonstration account using the exact invited email. The role is assigned from the invitation, not chosen during sign-up.</p>
          </form>
          <section className="ep-panel"><div className="ep-section-head"><h2>Invitation records</h2></div>{data.invitations.length?<div className="ep-table-scroll"><table><thead><tr><th>Email</th><th>Company</th><th>Role</th><th>Status</th></tr></thead><tbody>{data.invitations.map(i=><tr key={i.id}><td>{i.email}</td><td>{data.companies.find(c=>c.id===i.companyId)?.name}</td><td>Company admin</td><td>{i.accepted?"Accepted":"Pending"}</td></tr>)}</tbody></table></div>:<EmptyState title="No invitations" description="Create a company-admin invitation using the form above."/>}</section>
        </>}
        {view==="users"&&current.role==="platform_admin"&&<>
          <div className="ep-page-head"><div><h1>Accounts</h1><p>View and suspend accounts across partner companies.</p></div></div>
          <div className="ep-panel ep-table-scroll"><table><thead><tr><th>Name</th><th>Email</th><th>Company</th><th>Role</th><th>Status</th><th>Action</th></tr></thead><tbody>{data.users.map(u=><tr key={u.id}><td><b>{u.fullName}</b></td><td>{u.email}</td><td>{data.companies.find(c=>c.id===u.companyId)?.name||"Elixir Foundation"}</td><td>{roleName(u.role)}</td><td><Chip tone={u.status==="active"?"green":"red"}>{u.status}</Chip></td><td>{u.role==="platform_admin"?"—":<button onClick={()=>changeUserStatus(u)}>{u.status==="active"?"Suspend":"Reactivate"}</button>}</td></tr>)}</tbody></table></div>
        </>}
        {view==="profile"&&<><div className="ep-page-head"><div><h1>My profile</h1><p>Update your demonstration account details.</p></div></div>
          <form className="ep-panel ep-form" onSubmit={profileSave}>
            <FormRow label="Email"><input value={current.email} disabled/></FormRow>
            <FormRow label="Role"><input value={roleName(current.role)} disabled/></FormRow>
            <FormRow label="Full name"><input required value={profileName??current.fullName} onChange={e=>setProfileName(e.target.value)}/></FormRow>
            <FormRow label="Department"><input value={profileDepartment??current.department} onChange={e=>setProfileDepartment(e.target.value)}/></FormRow>
            <label className="ep-check"><input type="checkbox" checked={current.showInAttendeeLists!==false} onChange={e=>save({...data,users:data.users.map(u=>u.id===current.id?{...u,showInAttendeeLists:e.target.checked}:u)})}/> Show my name in attendee lists</label>
            <h2>Change demonstration password</h2><p className="ep-hint">Leave these empty to keep the current password. Never enter an actual work password in the local draft.</p>
            <FormRow label="New demonstration password"><input type="password" minLength={6} value={profilePw} onChange={e=>setProfilePw(e.target.value)}/></FormRow>
            <FormRow label="Confirm password"><input type="password" minLength={6} value={profilePwConfirm} onChange={e=>setProfilePwConfirm(e.target.value)}/></FormRow>
            {profileError&&<div className="ep-error" role="alert">{profileError}</div>}
            {profileSuccess&&<div className="ep-success" role="status">{profileSuccess}</div>}
            <Action type="submit">Save profile</Action>
          </form></>}
        <footer className="ep-footer">Elixir Events Portal · Internal working draft · No live accounts or shared database</footer>
      </main>
    </div>
  </div>;
}
function CompanyTable({companies,data,onView}:{companies:Company[];data:PortalData;onView:(id:string)=>void}){
  return <div className="ep-table-scroll"><table><thead><tr><th>Company</th><th>Domains</th><th>Events</th><th>Registrations</th><th>Status</th><th>Action</th></tr></thead><tbody>
    {companies.map(c=><tr key={c.id}><td><b>{c.name}</b></td><td>{c.domains.join(", ")}</td><td>{data.events.filter(e=>e.companyId===c.id).length}</td><td>{data.events.filter(e=>e.companyId===c.id).reduce((n,e)=>n+activeRegistrations(e.id,data).length,0)}</td><td><Chip tone={c.status==="active"?"green":"red"}>{c.status}</Chip></td><td><button onClick={()=>onView(c.id)}>Manage</button></td></tr>)}
  </tbody></table></div>;
}
