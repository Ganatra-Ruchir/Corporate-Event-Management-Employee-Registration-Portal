"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import {DiscoverHome, DiscoverBrowse, EventTile, GoingFaces, EventCover} from "@/components/event-discovery";
import dynamic from "next/dynamic";
const SpeakerEditor=dynamic(()=>import("@/components/speaker-editor").then(m=>m.SpeakerEditor),{loading:()=> <div className="ep-hint">Loading speaker editor…</div>});
const SpeakerGallery=dynamic(()=>import("@/components/speaker-gallery").then(m=>m.SpeakerGallery),{loading:()=> <div className="ep-hint">Loading speaker cards…</div>});
import {PlatformOverview,CompanyOverview,WorkspaceHeading,WorkspaceSection} from "@/components/admin-workspace";
import {CompanyDirectory,PeopleDirectory,AccountDirectory,InvitationDirectory} from "@/components/admin-directory";
import {EmployeeProvisioner} from "@/components/employee-provisioner";
import {EmployeeEditor} from "@/components/employee-editor";
import {PersonAvatar} from "@/components/person-avatar";
import {optimizePngAvatar,MAX_AVATAR_SOURCE_BYTES} from "@/lib/avatar-optimization";
import {EventQuickActions} from "@/components/event-quick-actions";
import {FirstLoginPasswordChange} from "@/components/first-login-password-change";
import {EmployeeEventNotifications} from "@/components/employee-event-notifications";
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
    const next={...form,
      summary:form.description.trim().replace(/\s+/g," ").slice(0,180),
      bannerAlt:form.title.trim()+" event banner",
      speakers:(form.speakers||[]).map(s=>({...s,photoAlt:s.photoDataUrl?(s.name.trim()?s.name.trim()+" speaker photo":"Speaker photo"):""})),
      startsAt:new Date(form.startsAt).toISOString(),endsAt:new Date(form.endsAt).toISOString(),
      deadline:form.deadline?new Date(form.deadline).toISOString():""};
    const issue=validateEvent(next,data);
    if(issue){setError(issue);return;}
    onSave(next);
  }
  return <div>
    <button className="ep-back" type="button" onClick={onBack}><ArrowLeft size={16}/> Back</button>
    <WorkspaceHeading eyebrow="COMPANY EVENT MANAGEMENT" title={data.events.some(e=>e.id===event.id)?"Edit event":"Create event"} description="Add event details, banners and speakers, then save or publish."/>
    <form className="ep-panel ep-form" onSubmit={submit}>
      <h2>Event information</h2>
      <FormRow label="Event banner (optional, JPG/PNG/WebP up to 5 MB)"><input type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>void uploadBanner(e.target.files?.[0])}/></FormRow>
      {form.bannerDataUrl&&<div className="ep-banner-preview"><Image src={form.bannerDataUrl} width={600} height={338} unoptimized alt={form.title.trim()?form.title.trim()+" event banner":"Event banner preview"}/><Action kind="secondary" onClick={()=>update("bannerDataUrl",undefined)}>Remove banner</Action></div>}
      <FormRow label="Event title"><input required minLength={3} maxLength={160} value={form.title} onChange={e=>update("title",e.target.value)}/></FormRow>
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
  return <><button className="ep-back" onClick={onBack}><ArrowLeft size={16}/> Back to organizations</button>
    <WorkspaceHeading eyebrow="PARTNER MANAGEMENT" title={company?"Edit organization":"Add organization"} description="Manage the partner identity and its approved work email domains."/>
    <form onSubmit={submit} className="ep-panel ep-form aw-organization-editor">
      <span className="ed-eyebrow">ORGANIZATION INFORMATION</span>
      <h2>Company details</h2>
      <FormRow label="Company name"><input required value={name} onChange={e=>setName(e.target.value)}/></FormRow>
      <FormRow label="Work email domains (comma separated)"><textarea rows={3} required value={domains} onChange={e=>setDomains(e.target.value)} placeholder="northwind.example, northwind-group.example"/></FormRow>
      <p className="ep-hint">Employees with an allowed domain can join this company. Admin access always requires an invitation or promotion.</p>
      {error&&<div className="ep-error" role="alert">{error}</div>}
      <div className="ep-actions"><Action kind="secondary" onClick={onBack}>Discard</Action><Action type="submit">Save company</Action></div>
    </form>
  </>;
}
function AuthPage({data,onLogin,onSignup,onVerified,onReset,remoteMode=false}:{data:PortalData;onLogin:(email:string,password:string)=>Promise<string|null>;onSignup:(fullName:string,email:string,department:string,password:string)=>Promise<string|null>;onVerified:(id:string)=>void;onReset:(email:string)=>string;remoteMode?:boolean}){
  const [mode,setMode]=useState<AuthView>("login");
  const [email,setEmail]=useState("");
  const [pass,setPass]=useState("");
  const [name,setName]=useState("");
  const [department,setDepartment]=useState("");
  const [error,setError]=useState("");
  const [message,setMessage]=useState("");
  const [verifyId,setVerifyId]=useState("");
  const [busy,setBusy]=useState(false);
  const [showPassword,setShowPassword]=useState(false);
  async function submit(e:React.FormEvent){
    e.preventDefault();setBusy(true);setError("");setMessage("");
    if(mode==="login"){
      const issue=await onLogin(email,pass);if(issue)setError(issue);
    }else if(mode==="signup"){
      const issue=await onSignup(name,email,department,pass);if(issue)setError(issue);
      else if(remoteMode){setMode("login");setMessage("Account created. An administrator must approve it before sign-in.");setPass("");}
      else{const u=data.users.find(p=>p.email===email.toLowerCase().trim());setVerifyId(u?.id||"");setMode("verify");}
    }else if(mode==="forgot"){setMessage(onReset(email));}
    setBusy(false);
  }
  return <div className="ep-auth-layout ep-auth-v2">
    <main className="ep-auth-card" id="sign-in">
      <div className="ep-auth-heading"><span className="ep-login-mark" aria-hidden="true">E</span><span className="ep-product-name">Elixir Events Portal</span></div>
      <div className="ep-auth-intro">
        <span className="ed-eyebrow">{mode==="login"?"WELCOME BACK":mode==="signup"?"JOIN YOUR COMPANY":mode==="forgot"?"ACCOUNT RECOVERY":"EMAIL VERIFICATION"}</span>
        <h1>{mode==="login"?"Sign in to your events":mode==="signup"?"Join your team":mode==="forgot"?"Reset your demo password":"Verify your demo email"}</h1>
        <p className="ep-subtle">{mode==="login"?"Discover events, manage your registrations and bring your team together.":mode==="signup"?"Use your work email. We'll find your organization from its domain.":mode==="forgot"?"This prototype can reset a demo password locally. No email is sent.":"Confirm your sample account to continue. Verification is simulated in this browser."}</p>
      </div>
      {mode==="verify"?<div className="ep-verify-content">
        <div className="ep-info">This is demonstration verification, not a real email or security system.</div>
        <Action onClick={()=>{const u=data.users.find(x=>x.email===email.toLowerCase().trim());onVerified(u?.id||verifyId);setMode("login");setMessage("Sample email confirmed. Sign in to continue.");setPass("");}}>Confirm demo email <ArrowRight size={17}/></Action>
      </div>:<form onSubmit={submit} className="ep-auth-form">
        {mode==="signup"&&<><FormRow label="Full name"><input required minLength={2} maxLength={100} autoComplete="name" value={name} onChange={e=>setName(e.target.value)} placeholder="Your full name"/></FormRow><FormRow label="Department"><input value={department} maxLength={100} onChange={e=>setDepartment(e.target.value)} placeholder="e.g. Operations"/></FormRow></>}
        <FormRow label={mode==="signup"?"Work email address":"Email address"}><input type="email" autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@company.com"/></FormRow>
        {mode!=="forgot"&&<div className="ep-field"><label htmlFor="ep-password">Password</label><div className="ep-password-wrap"><input id="ep-password" type={showPassword?"text":"password"} minLength={6} autoComplete={mode==="login"?"current-password":"new-password"} required value={pass} onChange={e=>setPass(e.target.value)} placeholder="Enter password"/><button type="button" onClick={()=>setShowPassword(v=>!v)} aria-label={showPassword?"Hide password":"Show password"}>{showPassword?"Hide":"Show"}</button></div></div>}
        {mode==="signup"&&<p className="ep-hint">No real emails are delivered in this preview. Use a disposable demonstration password only.</p>}
        {error&&<div role="alert" className="ep-error">{error}</div>}
        {message&&<div role="status" className="ep-success">{message}</div>}
        <button type="submit" className="ep-auth-submit" disabled={busy}>{busy?"Working…":mode==="login"?"Sign in":mode==="signup"?"Create account":"Reset demo password"}<ArrowRight size={18}/></button>
      </form>}
      <div className="ep-auth-links">
        {mode!=="login"&&<button type="button" onClick={()=>{setMode("login");setError("");setMessage("");}}>Back to sign in</button>}
        {mode==="login"&&<><button type="button" onClick={()=>{if(remoteMode){window.location.href="/signup";return;}setMode("signup");setError("");setMessage("");}}>Create an account</button>{!remoteMode&&<><button type="button" onClick={()=>{setMode("forgot");setError("");setMessage("");}}>Forgot password?</button><button type="button" onClick={()=>{const u=data.users.find(p=>p.email===email.toLowerCase().trim()&&!p.verified);if(!u){setError("Enter the email of an unverified demonstration account.");return;}setVerifyId(u.id);setMode("verify");setError("");}}>Verify demo email</button></>}</>}
      </div>
      <p className="ep-auth-footnote">{remoteMode?"PostgreSQL staging · Server-side session":"Browser-only demonstration · No secure shared accounts or database"}</p>
    </main>
    <aside className="ep-auth-aside" aria-label="About Elixir events">
      <div className="ep-auth-aside-content"><span className="ep-auth-side-label">EVENTS THAT BRING TEAMS TOGETHER</span>
      <h2>Good events start with people.</h2><p>Volunteering, learning and connecting—with everything your team needs in one place.</p>
      <div className="ep-auth-feature-card"><div className="ep-auth-card-art"><span>COMMUNITY</span><strong>Make room for meaningful moments.</strong></div>
       <div className="ep-auth-feature-footer"><span><CalendarDays size={16}/> Events & volunteering</span><span><ArrowRight size={17}/></span></div>
      </div>
      <div className="ep-auth-side-bottom">For company employees, event hosts and Elixir Foundation.</div>
      </div>
    </aside>
  </div>;
}

export default function ElixirPortal(){
  const [data,setData]=useState<PortalData>(initialData);
  const [remote,setRemote]=useState(false);
  const [remoteError,setRemoteError]=useState("");
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
  const [searchOpen,setSearchOpen]=useState(false);
  const [directorySearch,setDirectorySearch]=useState("");
  const [signedOut,setSignedOut]=useState(false);
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
  const [profileJobTitle,setProfileJobTitle]=useState<string|null>(null);
  const [profilePhone,setProfilePhone]=useState<string|null>(null);
  const [profilePhotoBusy,setProfilePhotoBusy]=useState(false);
  const [editingEmployeeId,setEditingEmployeeId]=useState<string|null>(null);
  const [employeeFilter,setEmployeeFilter]=useState("All");
  const [profilePw,setProfilePw]=useState("");
  const [profilePwConfirm,setProfilePwConfirm]=useState("");
  const [profileError,setProfileError]=useState("");
  const [profileSuccess,setProfileSuccess]=useState("");
  useEffect(()=>{
    void Promise.resolve().then(async()=>{
      try{
        const response=await fetch("/api/portal",{cache:"no-store"});
        const payload=await response.json();
        if(payload.enabled===true || !response.ok){
          setRemote(true);
          if(!response.ok){setRemoteError(payload.error||"Database unavailable");setReady(true);return;}
          if(payload.data)setData(payload.data);
          setSession(payload.currentId||null);
          setNow(Date.now());setReady(true);return;
        }
      }catch{setRemoteError("Unable to check backend");}
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
  // Refresh the database feed while employees are signed in so newly
  // published events also reach the reminder bell without reloading.
  useEffect(()=>{
    if(!remote||!session)return;
    const timer=window.setInterval(()=>{
      if(document.visibilityState!=="visible")return;
      void fetch("/api/portal",{cache:"no-store"}).then(async r=>{
        if(!r.ok)return;
        const payload=await r.json();
        if(payload.enabled&&payload.currentId===session&&payload.data){
          setData(payload.data);
          setNow(Date.now());
        }
      }).catch(()=>{});
    },60_000);
    return ()=>window.clearInterval(timer);
  },[remote,session]);
  const remoteRequest=async(action:string,args:Record<string,unknown>={}):Promise<{error?:string;data?:PortalData;currentId?:string;message?:string}>=>{
    try{
      const r=await fetch("/api/portal",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action,args}),cache:"no-store"});
      const result=await r.json();
      if(!r.ok)return {error:result.error||"Request failed"};
      return result;
    }catch{return {error:"Unable to reach the database server"};}
  };
  const remoteRefresh=async()=>{
    try{
      const r=await fetch("/api/portal",{cache:"no-store"});
      const json=await r.json();
      if(r.ok&&json.data){setData(json.data);setSession(json.currentId||null);return true;}
    }catch{}
    return false;
  };
  const remoteAction=async(action:string,args:Record<string,unknown>={},success="Saved")=>{
    const result=await remoteRequest(action,args);
    if(result.error){setNotice(result.error);return false;}
    if(result.data)setData(result.data);
    else await remoteRefresh();
    setNotice(success);return true;
  };
  const save=(newData:PortalData)=>{
    if(remote){setNotice("Database mode requires a server action.");return false;}
    try{localStorage.setItem(STORE,JSON.stringify(newData));setData(newData);return true;}
    catch{setNotice("Browser storage is full. Try smaller photos or remove unused images. Your changes were not saved.");return false;}
  };
  const flash=(message:string)=>{setNotice(message);};
  const current=data.users.find(p=>p.id===session)||null;
  const company=current?.companyId?data.companies.find(c=>c.id===current.companyId)||null:null;
  const portalBrand=current?.role==="platform_admin"?"Elixir Events Portal":`${company?.name||"Organization"} Events Portal`;
  useEffect(()=>{
    document.title=portalBrand;
    return ()=>{document.title="Elixir Events Portal";};
  },[portalBrand]);
  const blocked=Boolean(current&&(current.status==="suspended"||(current.companyId&&(!company||company.status==="suspended"))));
  const events=current?.role==="platform_admin"?data.events:current?.companyId?data.events.filter(e=>e.companyId===current.companyId):[];
  const companyEvents=events;
  const nav:(View[]) = current?.role==="platform_admin"?["home","companies","invitations","users","profile"]:
    current?.role==="company_admin"?["home","events","registrations","people","profile"]:["home","events","registrations","profile"];
  const goto=(v:View)=>{
    setView(v);setNotice("");setParticipantSearch("");setSearch("");
    setCategory("All");setPlacesOnly(false);setTimeFilter("Upcoming");setMenu(false);setSearchOpen(false);setDirectorySearch("");
    if(v!=="event"&&typeof window!=="undefined"&&new URLSearchParams(window.location.search).has("event")){
      window.history.replaceState(null,"",window.location.pathname);
    }
  };
  const openEvent=(id:string)=>{
    setSelectedEvent(id);goto("event");
    window.history.replaceState(null,"",window.location.pathname+"?event="+encodeURIComponent(id));
  };

  async function login(email:string,password:string):Promise<string|null>{
    if(remote){
      const result=await remoteRequest("login",{email,password});
      if(result.error)return result.error;
      if(!await remoteRefresh())return "Signed in, but could not load your account. Refresh the page.";
      setSignedOut(false);setView("home");return null;
    }
    const u=data.users.find(x=>x.email.toLowerCase()===email.toLowerCase().trim());
    if(!u||!(await passwordMatches(u.password,password)))return "Invalid email or password.";
    if(!u.verified)return "Verify the sample email before signing in.";
    const org=u.companyId?data.companies.find(c=>c.id===u.companyId):null;
    if(u.status==="suspended"||org?.status==="suspended")return "This account or company is suspended. Contact the platform administrator.";
    setSession(u.id);setSignedOut(false);try{localStorage.setItem(SESSION,u.id);}catch{}
    const requested=new URLSearchParams(window.location.search).get("event");
    const target=data.events.find(e=>e.id===requested);
    if(target&&eventAccess(u,target,data)){setSelectedEvent(target.id);setView("event");}
    else{setView("home");if(requested)window.history.replaceState(null,"",window.location.pathname);}
    return null;
  }
  async function signup(name:string,email:string,dept:string,password:string):Promise<string|null>{
    if(remote){
      const result=await remoteRequest("signup",{name,email,department:dept,password});
      return result.error||null;
    }
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
    if(remote)return "Password reset by email is not yet available. Contact an administrator.";
    const u=data.users.find(x=>x.email.toLowerCase()===email.toLowerCase().trim());
    if(!u)return "If an account exists, its demonstration password has been reset.";
    save({...data,users:data.users.map(p=>p.id===u.id?{...p,password:DEMO_PASSWORD}:p)});
    return "Local demo password reset to "+DEMO_PASSWORD+". No email was sent.";
  }
  function logout(){
    if(remote){void remoteRequest("logout");}
    setSession(null);setSignedOut(true);try{localStorage.removeItem(SESSION);}catch{}goto("home");
  }

  function saveEvent(e:PortalEvent){
    if(remote){void (async()=>{if(await remoteAction("saveEvent",{event:e},"Event saved.")){setEditingEvent(null);openEvent(e.id);}})();return;}
    if(current?.role!=="company_admin"||!current.companyId||e.companyId!==current.companyId){flash("Permission denied.");return;}
    const existing=data.events.some(x=>x.id===e.id);
    const next={...data,events:existing?data.events.map(x=>x.id===e.id?e:x):[...data.events,e]};
    if(save(promoteWaitlistLocally(e,next))){setEditingEvent(null);openEvent(e.id);flash(existing?"Event updated.":"Event created.");}
  }
  function modifyRegistration(event:PortalEvent,cancel:boolean){
    if(remote){
      if(!window.confirm((cancel?"Cancel your RSVP for ":"Register for ")+event.title+"?"))return;
      void remoteAction(cancel?"cancelRegistration":"register",{eventId:event.id},cancel?"RSVP cancelled.":"Registration updated.");return;
    }
    if(!current)return;
    if(!cancel&&!window.confirm("Register for "+event.title+"?"))return;
    if(cancel&&!window.confirm("Cancel your registration for "+event.title+"?"))return;
    const output=cancel?cancelLocally(current,event,data):registerLocally(current,event,data);
    if(output.error)flash(output.error);else{save(output.data);flash(cancel?"RSVP cancelled.":output.data.registrations.find(r=>r.eventId===event.id&&r.userId===current.id)?.status==="waitlisted"?"You joined the waitlist.":"You are going to this event.");}
  }
  function cancelEvent(event:PortalEvent){
    if(remote){const reason=window.prompt("Cancellation reason (optional)","");if(reason===null||!window.confirm("Cancel this event?"))return;void remoteAction("cancelEvent",{eventId:event.id,reason},"Event cancelled.");return;}
    if(current?.role!=="company_admin"||event.companyId!==current.companyId)return;
    const reason=window.prompt("Reason for cancellation (optional):","")??null;
    if(reason===null)return;
    if(!window.confirm("Cancel this event? Employees will see the cancellation status."))return;
    save({...data,events:data.events.map(e=>e.id===event.id?{...e,status:"cancelled",cancellationReason:reason}:e)});flash("Event cancelled.");
  }
  function removeParticipant(event:PortalEvent,userId:string){
    if(remote){if(!window.confirm("Remove this participant?"))return;void remoteAction("removeParticipant",{eventId:event.id,userId},"Participant removed.");return;}
    if(current?.role!=="company_admin"||event.companyId!==current.companyId)return;
    if(!window.confirm("Remove this participant from the event?"))return;
    const next={...data,registrations:data.registrations.map(r=>r.eventId===event.id&&r.userId===userId&&r.status==="going"?{...r,status:"cancelled" as const}:r)};
    save(promoteWaitlistLocally(event,next));
    flash("Participant removed.");
  }
  function saveCompany(c:Company){
    if(remote){void (async()=>{if(await remoteAction("saveCompany",{company:c},"Organization saved.")){setEditingCompany(null);goto("companies");}})();return;}
    if(current?.role!=="platform_admin")return;
    save({...data,companies:data.companies.some(x=>x.id===c.id)?data.companies.map(x=>x.id===c.id?c:x):[...data.companies,c]});
    setEditingCompany(null);goto("companies");flash("Company saved.");
  }
  function changeCompanyStatus(c:Company){
    if(remote){if(!window.confirm("Change status for "+c.name+"?"))return;void remoteAction("companyStatus",{companyId:c.id},"Organization status updated.");return;}
    if(current?.role!=="platform_admin")return;
    const status=c.status==="active"?"suspended":"active";
    if(!window.confirm((status==="suspended"?"Suspend":"Reactivate")+" "+c.name+"?"))return;
    save({...data,companies:data.companies.map(x=>x.id===c.id?{...x,status}:x)});flash("Company "+status+".");
  }
  function changeRole(person:Person){
    if(remote){if(!window.confirm("Change admin access for "+person.fullName+"?"))return;void remoteAction("role",{userId:person.id},"Role updated.");return;}
    if(current?.role!=="company_admin"||person.companyId!==current.companyId||person.id===current.id||person.status==="suspended")return;
    const role=person.role==="employee"?"company_admin":"employee";
    if(!window.confirm("Change "+person.fullName+" to "+roleName(role)+"?"))return;
    save({...data,users:data.users.map(x=>x.id===person.id?{...x,role}:x)});flash("Account role updated.");
  }
  function grantInvitedAdmin(person:Person){
    if(!remote){setNotice("Only database-mode invitations support this action.");return;}
    if(!window.confirm("Grant company administrator access to "+person.email+"? An existing invitation is required."))return;
    void remoteAction("grantCompanyAdmin",{userId:person.id},"Company administrator access granted.");
  }
  function approveUser(person:Person){
    if(!remote){setNotice("Local sample accounts use simulated verification.");return;}
    if(!window.confirm("Approve the account for "+person.email+"?"))return;
    void remoteAction("approveUser",{userId:person.id},"Account approved.");
  }
  function changeUserStatus(person:Person){
    if(remote){if(!window.confirm("Change account status for "+person.fullName+"?"))return;void remoteAction("userStatus",{userId:person.id},"Account status updated.");return;}
    if(current?.role!=="platform_admin"||person.role==="platform_admin")return;
    const status=person.status==="active"?"suspended":"active";
    if(!window.confirm((status==="suspended"?"Suspend":"Reactivate")+" "+person.email+"?"))return;
    save({...data,users:data.users.map(u=>u.id===person.id?{...u,status}:u)});flash("User "+status+".");
  }
  function invite(e:React.FormEvent){
    e.preventDefault();setInviteError("");
    if(remote){void (async()=>{
      const result=await remoteRequest("invite",{email:inviteEmail,companyId:inviteCompany});
      if(result.error){setInviteError(result.error);return;}
      if(result.data)setData(result.data);
      setInviteEmail("");setNotice("Invitation recorded. The manager can sign up using this address.");
    })();return;}
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
    if(remote){
      if(profilePw&&profilePw!==profilePwConfirm){setProfileError("Passwords do not match");return;}
      const result=await remoteRequest("profile",{fullName:profileName??current.fullName,department:profileDepartment??current.department,jobTitle:profileJobTitle??current.jobTitle??"",phone:profilePhone??current.phone??"",password:profilePw});
      if(result.error){setProfileError(result.error);return;}
      if(result.data)setData(result.data);setProfilePw("");setProfilePwConfirm("");setProfileError("");setProfileSuccess("Profile saved to PostgreSQL.");return;
    }
    setProfileError("");setProfileSuccess("");
    const fullName=profileName??current.fullName,department=profileDepartment??current.department;
    if(fullName.trim().length<2){setProfileError("Enter your full name.");return;}
    if(profilePw&&profilePw!==profilePwConfirm){setProfileError("The new passwords do not match.");return;}
    if(profilePw&&profilePw.length<6){setProfileError("Use at least six characters for the demonstration password.");return;}
    const password=profilePw?await encodePassword(profilePw):current.password;
    save({...data,users:data.users.map(u=>u.id===current.id?{...u,fullName:fullName.trim(),department:department.trim(),jobTitle:profileJobTitle??current.jobTitle??"",phone:profilePhone??current.phone??"",password}:u)});
    setProfilePw("");setProfilePwConfirm("");setProfileSuccess("Profile saved in this browser.");
  }
  async function uploadProfilePhoto(file?:File){
    if(!file||!current||!remote)return;
    if(file.type!=="image/png"||file.size>MAX_AVATAR_SOURCE_BYTES){setProfileError("Use a PNG image up to 20 MB.");return;}
    setProfilePhotoBusy(true);setProfileError("");setProfileSuccess("");
    try{
      const optimized=await optimizePngAvatar(file);
      const form=new FormData();form.set("avatar",optimized);
      const r=await fetch("/api/portal/avatar",{method:"POST",body:form});
      const response=await r.json();
      if(!r.ok){setProfileError(response.error||"Unable to upload the picture.");return;}
      if(response.data)setData(response.data);
      setProfileSuccess("Profile picture updated.");
    }catch{setProfileError("Unable to upload profile picture.");}
    finally{setProfilePhotoBusy(false);}
  }
  async function removeProfilePhoto(){
    if(!remote||!current)return;
    setProfilePhotoBusy(true);setProfileError("");setProfileSuccess("");
    try{
      const r=await fetch("/api/portal/avatar",{method:"DELETE"});
      const response=await r.json();
      if(!r.ok){setProfileError(response.error||"Unable to remove profile picture.");return;}
      if(response.data)setData(response.data);
      setProfileSuccess("Profile picture removed.");
    }catch{setProfileError("Unable to remove picture.");}
    finally{setProfilePhotoBusy(false);}
  }
  async function employeeAction(action:"editEmployee"|"changeEmployeeStatus",args:Record<string,unknown>){
    const result=await remoteRequest(action,args);
    if(result.error)return result.error;
    if(result.data)setData(result.data);
    setNotice(action==="editEmployee"?"Employee details updated.":"Employee account status updated.");
    return null;
  }
  if(!ready)return <main className="ep-loading" role="status">Loading portal…</main>;
  if(remoteError&&remote)return <main className="ep-loading" role="alert">Database connection error: {remoteError}. Refresh to retry.</main>;
  if(!current)return signedOut?
    <div className="ep-signedout-screen"><div className="ep-signedout-panel">
      <div className="ep-login-mark">E</div>
      <span className="ed-eyebrow">ELIXIR EVENTS PORTAL</span>
      <span className="ep-signedout-icon"><LogOut size={30}/></span>
      <h1>You&apos;re signed out</h1><p>Your demo session has ended. Event data remains saved in this browser.</p>
      <Action onClick={()=>setSignedOut(false)}>Sign in again <ArrowRight size={17}/></Action>
      <span className="ep-signedout-note">Account access is simulated in this database-free version.</span>
    </div></div>:
    <AuthPage data={data} onLogin={login} onSignup={signup} onVerified={verify} onReset={reset} remoteMode={remote}/>
  if(remote&&current.mustChangePassword)return <FirstLoginPasswordChange person={current} onLogout={logout} onSave={async password=>{
    const result=await remoteRequest("profile",{fullName:current.fullName,department:current.department,password});
    if(result.error)return result.error;
    if(!await remoteRefresh())return "Password updated. Refresh to continue.";
    setView("home");return null;
  }}/>;
  if(blocked)return <main className="ep-auth-layout"><div className="ep-auth-card"><h1>Account unavailable</h1><p>Your account or company is suspended.</p><Action onClick={logout}>Sign out</Action></div></main>;

  const selected=selectedEvent?data.events.find(e=>e.id===selectedEvent):null;
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
      <div className="ep-top-left"><button className="ep-menu" aria-label="Toggle navigation" onClick={()=>setMenu(!menu)}><Menu size={20}/></button><span className="ep-brand">{portalBrand}</span><span className="ep-divider-line"/><span className="ep-context">{current.role==="platform_admin"?"Platform management":company?.name||"Company events"}</span></div>
      <div className="ep-top-right">{current.role==="employee"&&<EmployeeEventNotifications user={current} data={data} events={companyEvents} onOpen={openEvent}/>}<span className="ep-draft-marker">{remote?"POSTGRESQL · STAGING":"LOCAL DRAFT · NO DATABASE"}</span><button className="ep-account" onClick={()=>goto("profile")}><PersonAvatar person={current} size={27}/><span>{current.fullName}</span></button></div>
    </header>
    <div className="ep-layout">
      <nav className={"ep-sidebar "+(menu?"expanded":"")} aria-label="Main navigation">
        <div className="ep-nav-title">{roleName(current.role)}</div>
        {nav.map(v=><button key={v} aria-current={view===v?"page":undefined} className={"ep-nav-link"+(view===v?" active":"")} onClick={()=>goto(v)}>{v==="home"?(current.role==="platform_admin"?"Overview":current.role==="company_admin"?"Dashboard":"Discover"):pageName(v)}</button>)}
        <div className="ep-side-bottom"><button className="ep-nav-link" onClick={logout}><LogOut size={17}/> Sign out</button></div>
      </nav>
      <main className="ep-main" id="main-content" tabIndex={-1}>
        {!remote&&<div className="ep-demobar"><strong>Preview mode.</strong> Sample data is saved only in this browser. No real accounts or shared database. <button type="button" onClick={()=>{if(window.confirm("Reset every sample company, account and event in this browser?")){save(structuredClone(initialData));setSession(null);localStorage.removeItem(SESSION);}}}>Reset all sample data</button></div>}
        {notice&&<div className="ep-info ep-notice" role="status"><span>{notice}</span><button aria-label="Dismiss message" onClick={()=>setNotice("")}><X size={17}/></button></div>}
        {view==="eventForm"&&editingEvent&&<EventEditor key={editingEvent.id} event={editingEvent} data={data} onSave={saveEvent} onBack={()=>goto("events")}/>}
        {view==="companyForm"&&<CompanyEditor key={editingCompany?.id||"new"} company={editingCompany||undefined} data={data} onSave={saveCompany} onBack={()=>goto("companies")}/>}
        {view==="home"&&current.role==="employee"&&<DiscoverHome
          data={data} events={companyEvents} user={current} now={now}
          onOpen={e=>{openEvent(e.id);}}
          onBrowse={()=>goto("events")}
          onSearch={()=>{goto("events");setSearchOpen(true);}}
          onCategory={c=>{goto("events");setCategory(c);}}
        />}
        {view==="events"&&current.role==="employee"&&<DiscoverBrowse
          data={data} events={companyEvents} now={now}
          onOpen={e=>{openEvent(e.id);}}
          search={search} setSearch={setSearch}
          category={category} setCategory={setCategory}
          timeFilter={timeFilter} setTimeFilter={setTimeFilter}
          placesOnly={placesOnly} setPlacesOnly={setPlacesOnly}
          searchOpen={searchOpen} setSearchOpen={setSearchOpen}
        />}
        {view==="home"&&current.role==="platform_admin"&&<PlatformOverview
          data={data}
          onCompany={c=>{setSelectedCompany(c.id);goto("companies");}}
          onAdd={()=>{setEditingCompany(null);goto("companyForm");}}
          onCompanies={()=>goto("companies")}
          onInvites={()=>goto("invitations")}
          onUsers={()=>goto("users")}
        />}
        {view==="home"&&current.role==="company_admin"&&company&&<CompanyOverview
          data={data} current={current} company={company} now={now}
          onCreate={()=>{setEditingEvent({...initialEvent(current.companyId!,current.id),contactEmail:current.email});goto("eventForm");}}
          onEvents={()=>goto("events")}
          onPeople={()=>goto("people")}
          onEvent={e=>openEvent(e.id)}
        />}
        {view==="events"&&current.role==="company_admin"&&<>
          <WorkspaceHeading eyebrow={(company?.name||"COMPANY").toUpperCase()+" · EVENT MANAGEMENT"} title="Manage events" description="Plan, publish and manage events for your organization."
            action={<Action onClick={()=>{setEditingEvent({...initialEvent(current.companyId!,current.id),contactEmail:current.email});goto("eventForm");}}><Plus size={17}/> Create event</Action>}/>
          <div className="aw-browse-bar"><strong>{filteredEvents.length} events</strong><button className="ed-search-toggle" type="button" aria-expanded={searchOpen} onClick={()=>setSearchOpen(v=>!v)}>{searchOpen?<X size={19}/>:<Search size={19}/>}<span>{searchOpen?"Close filters":"Search & filters"}</span></button></div>
          {searchOpen&&<div className="ep-filters aw-filter-panel">
            <FormRow label="Search events"><div className="ep-search"><Search size={18}/><input type="search" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search titles, places and categories"/></div></FormRow>
            <FormRow label="Time period"><select value={timeFilter} onChange={e=>setTimeFilter(e.target.value)}><option>Upcoming</option><option>Past</option><option>All</option></select></FormRow>
            <FormRow label="Category"><select value={category} onChange={e=>setCategory(e.target.value)}><option>All</option>{CATEGORIES.map(c=><option key={c}>{c}</option>)}</select></FormRow>
            <label className="ep-check"><input type="checkbox" checked={placesOnly} onChange={e=>setPlacesOnly(e.target.checked)}/> Spots available</label>
            <button className="aw-clear" onClick={()=>{setSearch("");setCategory("All");setPlacesOnly(false);setTimeFilter("Upcoming");}}>Clear</button>
          </div>}
          {filteredEvents.length?<div className="ed-tile-grid">{filteredEvents.map(e=><EventTile key={e.id} event={e} data={data} onOpen={event=>openEvent(event.id)}/>)}</div>:<EmptyState title="No matching events" description="Try another filter or create a new event."/>}
        </>}
        {view==="event"&&selected&&(eventAccess(current,selected,data))&&<>
          <button className="ep-back" onClick={()=>goto("events")}><ArrowLeft size={16}/> Back to events</button>
          <div className="ep-banner ed-event-detail-preview"><EventCover event={selected} wide/></div>
          <div className="ep-page-head"><div><div className="ep-event-label">{selected.category} · {selected.format.replace("_"," ")}</div><h1>{selected.title}</h1><p>{selected.summary}</p></div><Chip tone={selected.status==="published"?"green":selected.status==="cancelled"?"red":"neutral"}>{selected.status}</Chip></div>
          <EventQuickActions event={selected}/>
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
<section className="ep-panel ep-detail-side ed-linktree-registration ed-rsvp-below-about"><div className="ed-rsvp-pill">JOIN THE EVENT</div><h2>Registration</h2><p className="ed-rsvp-invite">Be part of something meaningful.</p>
              <div className="ed-rsvp-count"><strong>{remainingPlaces(selected,data)}</strong><span>spots left of {selected.capacity}</span></div>
              <div className="ed-rsvp-progress" role="progressbar" aria-label="Reserved places" aria-valuenow={activeRegistrations(selected.id,data).length} aria-valuemax={selected.capacity} aria-valuemin={0}><span style={{width:(100*activeRegistrations(selected.id,data).length/selected.capacity)+"%"}}/></div>
              <p>{activeRegistrations(selected.id,data).length} going</p>
              {waitlistedRegistrations(selected.id,data).length>0&&<p>{waitlistedRegistrations(selected.id,data).length} on the waitlist</p>}
              {data.registrations.some(r=>r.eventId===selected.id&&r.userId===current.id&&(r.status==="going"||r.status==="waitlisted"))?
                <><div className="ep-success">{waitlistPosition(selected.id,current.id,data)>0?"You're #"+waitlistPosition(selected.id,current.id,data)+" on the waitlist":"You're going"}</div><Action kind="secondary" onClick={()=>modifyRegistration(selected,true)} disabled={!!canCancel(current,selected,data)}>Cancel RSVP</Action></>:
                <><Action disabled={!!canRegister(current,selected,data)} onClick={()=>modifyRegistration(selected,false)}>{remainingPlaces(selected,data)===0?"Join waitlist":"Attend"}</Action>{canRegister(current,selected,data)&&<p className="ep-hint">{canRegister(current,selected,data)}</p>}</>}
              {current.role==="company_admin"&&<div className="ep-admin-actions"><h3>Manage event</h3><Action kind="secondary" onClick={()=>{setEditingEvent(selected);goto("eventForm");}}>Edit event</Action>{selected.status!=="cancelled"&&<Action kind="danger" onClick={()=>cancelEvent(selected)}>Cancel event</Action>}</div>}
            </section>

            </article>
            <aside className="ep-detail-right">            {(selected.speakers||[]).length>0&&<div className="ed-detail-speakers"><SpeakerGallery speakers={selected.speakers||[]}/></div>}
            </aside>
          </div>
          <footer className="ed-event-bottom-info">
            <div className="ed-bottom-host"><span>Hosted by:</span> <strong>{data.companies.find(c=>c.id===selected.companyId)?.name||"Event organization"}</strong></div>
            <div className="ed-bottom-going">
              <span>Who&apos;s going:</span> <strong>{activeRegistrations(selected.id,data).length} attendees</strong>
              <GoingFaces event={selected} data={data} limit={5}/>
              <button type="button" onClick={()=>setShowAttendees(v=>!v)} aria-expanded={showAttendees}>{showAttendees?"Hide names":"See attendees"}</button>
            </div>
            {showAttendees&&<div className="ed-bottom-attendee-list">
              {permittedAttendees.length?permittedAttendees.map(person=><span key={person.id}>{person.fullName}</span>):<span>No public attendee names yet.</span>}
            </div>}
          </footer>
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
          <WorkspaceHeading eyebrow="YOUR PARTICIPATION" title="My events" description="The events you joined, waitlisted and cancelled."/>
          <div className="aw-browse-bar"><div className="aw-filter-tabs" role="group" aria-label="Filter registrations">
            {["All","Upcoming","Past","Cancelled"].map(option=><button key={option} className={historyFilter===option?"active":""} onClick={()=>setHistoryFilter(option)} aria-pressed={historyFilter===option}>{option}</button>)}
          </div><span className="aw-count">{visibleRegs.length} records</span></div>
          {visibleRegs.length?<div className="aw-registration-list">{visibleRegs.map(r=>{const e=data.events.find(x=>x.id===r.eventId)!;
            return <button className="aw-registration-row" key={r.id} onClick={()=>openEvent(e.id)}>
             <span className="aw-reg-date"><strong>{new Date(e.startsAt).toLocaleDateString("en-IN",{day:"2-digit"})}</strong><small>{new Date(e.startsAt).toLocaleDateString("en-IN",{month:"short"}).toUpperCase()}</small></span>
             <span className="aw-reg-info"><strong>{e.title}</strong><small>{e.category} · {dateText(e.startsAt)}</small></span>
             <Chip tone={r.status==="going"?"green":r.status==="waitlisted"?"orange":"neutral"}>{r.status==="going"?"Going":r.status==="waitlisted"?"Waitlisted":"Cancelled"}</Chip><ChevronRight size={20}/>
            </button>})}</div>:<div className="aw-empty"><CalendarDays size={23}/><strong>No registrations found</strong><p>Join an event to see it here, or choose another filter.</p><button onClick={()=>goto("events")}>Browse events <ArrowRight size={16}/></button></div>}
        </>}
        {view==="people"&&current.role==="company_admin"&&<>
          <WorkspaceHeading eyebrow={company?.name.toUpperCase()||"COMPANY"} title="Your people" description="Employees join automatically after work-email OTP verification. Manage company administrator access here."/>
          {remote&&<div className="ep-panel" style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,flexWrap:"wrap"}}>
            <div><strong>Invite employees</strong><p style={{fontSize:12,color:"#66768b",margin:"5px 0 0"}}>Share the signup page with employees. Work-email OTP activates their accounts automatically.</p></div>
            <button type="button" className="aw-primary" onClick={()=>{void navigator.clipboard.writeText(new URL("/signup",window.location.origin).toString()).then(()=>setNotice("Employee signup link copied."),()=>setNotice("Copy this link from your browser address: /signup"));}}>Copy employee signup link</button>
          </div>}
          {remote&&<EmployeeProvisioner onCreate={async fields=>{
            try{
              const response=await fetch("/api/portal",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"createEmployee",args:fields})});
              const result=await response.json();
              if(!response.ok)return {error:result.error||"Could not create employee"};
              if(result.data)setData(result.data);
              return {result:{email:result.email,employeeId:result.employeeId,temporaryPassword:result.temporaryPassword}};
            }catch{return {error:"Unable to reach the employee creation service"};}
          }}/>}
          <div className="employee-list-stats">
            <span>{companyPeople.length} total staff</span>
            <span>{companyPeople.filter(p=>p.status==="active").length} active</span>
            <span>{companyPeople.filter(p=>p.status==="suspended").length} suspended</span>
          </div>
          <div className="employee-list-actions" style={{marginBottom:15}}>
            <label style={{fontSize:12,fontWeight:800}}>Status <select value={employeeFilter} onChange={e=>setEmployeeFilter(e.target.value)} style={{marginLeft:6,padding:8,borderRadius:8}}><option>All</option><option value="active">Active</option><option value="suspended">Suspended</option></select></label>
            <button type="button" onClick={()=>exportCsv("company-employees.csv",["Employee ID","Name","Email","Department","Job title","Phone","Role","Status"],companyPeople.map(p=>["EMP-"+p.id.slice(0,8).toUpperCase(),p.fullName,p.email,p.department,p.jobTitle||"",p.phone||"",p.role,p.status]))}><Download size={15}/> Export employees CSV</button>
          </div>
          {editingEmployeeId&&companyPeople.some(p=>p.id===editingEmployeeId&&p.role==="employee")&&<EmployeeEditor key={editingEmployeeId} person={companyPeople.find(p=>p.id===editingEmployeeId)!}
            onSave={values=>employeeAction("editEmployee",values)}
            onStatus={person=>employeeAction("changeEmployeeStatus",{userId:person.id})}
            onClose={()=>setEditingEmployeeId(null)}/>}
          <PeopleDirectory people={employeeFilter==="All"?companyPeople:companyPeople.filter(p=>p.status===employeeFilter)}
            search={directorySearch} onSearch={setDirectorySearch} selfId={current.id} onRole={changeRole}
            onEdit={remote?p=>setEditingEmployeeId(p.id):undefined}
            onStatus={remote?p=>{void (async()=>{if(window.confirm((p.status==="active"?"Suspend ":"Reactivate ")+p.fullName+"?"))await employeeAction("changeEmployeeStatus",{userId:p.id});})();}:undefined}/>
        </>}
        {view==="companies"&&current.role==="platform_admin"&&<>
          <WorkspaceHeading eyebrow="PARTNER MANAGEMENT" title="Organizations" description="Every partner, approved email domain and their activity."
            action={<Action onClick={()=>{setEditingCompany(null);setSelectedCompany(null);goto("companyForm");}}><Plus size={17}/> Add organization</Action>}/>
          <CompanyDirectory companies={availableCompanies} data={data} selected={chosenCompany||null}
            query={directorySearch} onQuery={setDirectorySearch} onSelect={c=>setSelectedCompany(c.id)}
            onEdit={c=>{setEditingCompany(c);goto("companyForm");}}
            onToggle={changeCompanyStatus} onClose={()=>setSelectedCompany(null)}/>
        </>}
        {view==="invitations"&&current.role==="platform_admin"&&<>
          <WorkspaceHeading eyebrow="PARTNER ACCESS" title="Admin invitations" description="Grant a manager access to a partner company. Roles are assigned from the invitation, never chosen at login."/>
          <div className="aw-two-col aw-invitation-layout">
            <WorkspaceSection title="Invite a manager" description="Choose an active company and enter the recipient's email.">
              <form className="ep-panel ep-invite-form aw-form-panel" onSubmit={invite}>
                <FormRow label="Partner company"><select required value={inviteCompany} onChange={e=>setInviteCompany(e.target.value)}><option value="">Select company</option>{data.companies.filter(c=>c.status==="active").map(c=><option value={c.id} key={c.id}>{c.name}</option>)}</select></FormRow>
                <FormRow label="Manager email"><input required type="email" value={inviteEmail} onChange={e=>setInviteEmail(e.target.value)} placeholder="manager@company.example"/></FormRow>
                {inviteError&&<div className="ep-error" role="alert">{inviteError}</div>}
                <Action type="submit">Create invitation <ArrowRight size={16}/></Action>
                <p className="ep-hint">This is a local demonstration. No email is sent. The invited manager signs up using this exact address.</p>
              </form>
            </WorkspaceSection>
            <WorkspaceSection title="Invitation history" description="Requests recorded in this browser.">
              <InvitationDirectory invitations={data.invitations} companies={data.companies}/>
            </WorkspaceSection>
          </div>
        </>}
        {view==="users"&&current.role==="platform_admin"&&<>
          <WorkspaceHeading eyebrow="ELIXIR FOUNDATION · ACCOUNTS" title="Account management" description="Find people across partner companies, review roles and control demo account access."/>
          <AccountDirectory people={data.users} companies={data.companies} search={directorySearch} onSearch={setDirectorySearch} onStatus={changeUserStatus} onApprove={remote?approveUser:undefined} onGrantAdmin={remote?grantInvitedAdmin:undefined}/>
        </>}
        {view==="profile"&&<>
          <WorkspaceHeading eyebrow="YOUR ACCOUNT" title="Profile & settings" description="Manage your personal details, PNG profile photo and password."/>
          <div className="aw-two-col aw-profile-layout">
            <div className="aw-profile-summary">
              <PersonAvatar person={current} size={88}/>
              <h2>{current.fullName}</h2><p>{current.email}</p><span className="md-role">{roleName(current.role)}</span>
              <div className="aw-profile-company"><span>Organization</span><strong>{company?.name||"Elixir Foundation"}</strong></div>
              <div className="aw-profile-company"><span>Department</span><strong>{current.department||"Not provided"}</strong></div>
              {current.jobTitle&&<div className="aw-profile-company"><span>Job title</span><strong>{current.jobTitle}</strong></div>}
              <button type="button" className="aw-text-action" onClick={logout}>Sign out <LogOut size={16}/></button>
            </div>
            <form className="ep-panel ep-form aw-profile-form" onSubmit={profileSave}>
              <h2>Personal details</h2>
              {remote&&<div className="profile-photo-control">
                <PersonAvatar person={current} size={82}/>
                <label>Profile photo (PNG, max 20 MB)<input type="file" accept="image/png" disabled={profilePhotoBusy} onChange={e=>{void uploadProfilePhoto(e.currentTarget.files?.[0]);e.currentTarget.value="";}}/></label>
                {current.avatarUrl&&<button type="button" disabled={profilePhotoBusy} onClick={()=>void removeProfilePhoto()}>Remove profile picture</button>}
                <small>{profilePhotoBusy?"Uploading photo…":"PNG images up to 20 MB are resized automatically for faster uploads and display."}</small>
              </div>}
              <div className="ep-form-grid">
                <FormRow label="Full name"><input required value={profileName??current.fullName} onChange={e=>setProfileName(e.target.value)}/></FormRow>
                <FormRow label="Department"><input value={profileDepartment??current.department} onChange={e=>setProfileDepartment(e.target.value)}/></FormRow>
              </div>
              <div className="ep-form-grid">
                <FormRow label="Job title"><input maxLength={100} value={profileJobTitle??current.jobTitle??""} onChange={e=>setProfileJobTitle(e.target.value)}/></FormRow>
                <FormRow label="Phone (optional)"><input type="tel" maxLength={25} value={profilePhone??current.phone??""} onChange={e=>setProfilePhone(e.target.value)}/></FormRow>
              </div>
              <FormRow label="Work email"><input value={current.email} disabled/></FormRow>
              <label className="ep-check aw-privacy-setting"><input type="checkbox" checked={current.showInAttendeeLists!==false} onChange={e=>remote?void remoteAction("privacy",{visible:e.target.checked},"Privacy preference saved."):save({...data,users:data.users.map(u=>u.id===current.id?{...u,showInAttendeeLists:e.target.checked}:u)})}/> Show my name in attendee lists</label>
              <div className="aw-form-divider"/>
              <h2>{remote?"Change password":"Change demonstration password"}</h2>
              <p className="ep-hint">{remote?"Optional: choose a new unique password of at least 12 characters.":"Optional. Use a disposable demo password, not your real work password."}</p>
              <div className="ep-form-grid">
                <FormRow label="New password"><input type="password" minLength={6} autoComplete="new-password" value={profilePw} onChange={e=>setProfilePw(e.target.value)}/></FormRow>
                <FormRow label="Confirm password"><input type="password" minLength={6} autoComplete="new-password" value={profilePwConfirm} onChange={e=>setProfilePwConfirm(e.target.value)}/></FormRow>
              </div>
              {profileError&&<div className="ep-error" role="alert">{profileError}</div>}
              {profileSuccess&&<div className="ep-success" role="status">{profileSuccess}</div>}
              <Action type="submit">Save changes <ArrowRight size={16}/></Action>
            </form>
          </div>
        </>}
        <footer className="ep-footer">{portalBrand} · {remote?"PostgreSQL staging · Server-side sessions":"Internal working draft · No live accounts or shared database"}</footer>
      </main>
    </div>
  </div>;
}
function CompanyTable({companies,data,onView}:{companies:Company[];data:PortalData;onView:(id:string)=>void}){
  return <div className="ep-table-scroll"><table><thead><tr><th>Company</th><th>Domains</th><th>Events</th><th>Registrations</th><th>Status</th><th>Action</th></tr></thead><tbody>
    {companies.map(c=><tr key={c.id}><td><b>{c.name}</b></td><td>{c.domains.join(", ")}</td><td>{data.events.filter(e=>e.companyId===c.id).length}</td><td>{data.events.filter(e=>e.companyId===c.id).reduce((n,e)=>n+activeRegistrations(e.id,data).length,0)}</td><td><Chip tone={c.status==="active"?"green":"red"}>{c.status}</Chip></td><td><button onClick={()=>onView(c.id)}>Manage</button></td></tr>)}
  </tbody></table></div>;
}
