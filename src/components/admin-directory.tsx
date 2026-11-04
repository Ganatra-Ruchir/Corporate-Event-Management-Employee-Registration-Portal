"use client";

import {Building2,ChevronRight,Mail,Search,ShieldCheck,Users,Globe,CalendarDays,ArrowRight} from "lucide-react";
import {activeRegistrations} from "@/lib/portal-model";
import type {Company,Invitation,Person,PortalData} from "@/lib/portal-model";

function Initials({name}:{name:string}){
 return <span className="md-avatar" aria-hidden="true">{name.trim().split(/\s+/).slice(0,2).map(p=>p[0]).join("").toUpperCase()}</span>;
}
export function DirectorySearch({value,onChange,placeholder}:{value:string;onChange:(v:string)=>void;placeholder:string}){
 return <label className="md-search"><Search size={18} aria-hidden="true"/><span className="sr-only">Search directory</span>
   <input type="search" value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}/></label>;
}
function Empty({query,label}:{query:string;label:string}){
 return <div className="md-empty"><Search size={22}/><strong>No matches found</strong><p>{query?"Try another name or email.":"There are no "+label+" yet."}</p></div>;
}
export function CompanyDirectory({companies,data,selected,query,onQuery,onSelect,onEdit,onToggle,onClose}:{companies:Company[];data:PortalData;selected:Company|null;query:string;onQuery:(v:string)=>void;onSelect:(c:Company)=>void;onEdit:(c:Company)=>void;onToggle:(c:Company)=>void;onClose:()=>void}){
 const filtered=companies.filter(c=>[c.name,...c.domains].join(" ").toLowerCase().includes(query.trim().toLowerCase()));
 const companyEvents=selected?data.events.filter(e=>e.companyId===selected.id):[];
 const people=selected?data.users.filter(u=>u.companyId===selected.id):[];
 const registrations=companyEvents.reduce((sum,e)=>sum+activeRegistrations(e.id,data).length,0);
 return <div className="md-root">
   <div className="md-toolbar"><DirectorySearch value={query} onChange={onQuery} placeholder="Search organizations or domains"/><span>{filtered.length} organizations</span></div>
   <div className="md-company-grid">
    {filtered.map(c=>{const eventCount=data.events.filter(e=>e.companyId===c.id).length;const members=data.users.filter(u=>u.companyId===c.id).length;
     return <button className={"md-company"+(selected?.id===c.id?" selected":"")} key={c.id} onClick={()=>onSelect(c)} aria-pressed={selected?.id===c.id}>
      <span className="md-company-top"><span className="md-org-icon"><Building2 size={23}/></span><span className={"aw-status "+c.status}>{c.status}</span></span>
      <strong>{c.name}</strong><span className="md-domain"><Globe size={15}/>{c.domains.join(", ")}</span>
      <span className="md-company-bottom"><span><Users size={15}/>{members} people</span><span><CalendarDays size={15}/>{eventCount} events</span><ChevronRight size={18}/></span>
     </button>;
    })}
   </div>
   {!filtered.length&&<Empty query={query} label="organizations"/>}
   {selected&&<section className="md-details" aria-labelledby="md-selected-heading">
    <div className="md-details-header"><div><span className="ed-eyebrow">ORGANIZATION DETAILS</span><h2 id="md-selected-heading">{selected.name}</h2><p>Approved domains: {selected.domains.join(", ")}</p></div><button onClick={onClose} className="md-close">Close</button></div>
    <div className="md-detail-metrics"><div><strong>{people.length}</strong><span>People</span></div><div><strong>{companyEvents.length}</strong><span>Events</span></div><div><strong>{registrations}</strong><span>Going</span></div></div>
    <div className="md-details-actions"><button className="aw-primary" onClick={()=>onEdit(selected)}>Edit organization <ArrowRight size={16}/></button><button className="md-outline-action" onClick={()=>onToggle(selected)}>{selected.status==="active"?"Suspend company":"Reactivate company"}</button></div>
   </section>}
 </div>;
}
export function PeopleDirectory({people,search,onSearch,selfId,onRole,onApprove}:{people:Person[];search:string;onSearch:(v:string)=>void;selfId:string;onRole:(person:Person)=>void;onApprove?:(person:Person)=>void}){
 const visible=people.filter(p=>[p.fullName,p.email,p.department,p.role].join(" ").toLowerCase().includes(search.trim().toLowerCase()));
 return <div className="md-root">
  <div className="md-toolbar"><DirectorySearch value={search} onChange={onSearch} placeholder="Search teammates"/><span>{visible.length} people</span></div>
  <div className="md-person-grid">{visible.map(person=><article className="md-person" key={person.id}>
   <div className="md-person-profile"><Initials name={person.fullName}/><div><strong>{person.fullName}</strong><small>{person.department||"Department not set"}</small></div></div>
   <div className="md-person-email"><Mail size={15}/><span>{person.email}</span></div>
   <div className="md-person-footer"><span className={"md-role "+person.role}>{person.role==="company_admin"?"Company admin":"Employee"}</span>
    {!person.verified&&onApprove?<button onClick={()=>onApprove(person)}>Approve account <ArrowRight size={14}/></button>:person.id===selfId?<span className="md-self-label">Your account</span>:<button onClick={()=>onRole(person)}>{person.role==="employee"?"Make admin":"Remove admin"} <ArrowRight size={14}/></button>}</div>
  </article>)}</div>
  {!visible.length&&<Empty query={search} label="people"/>}
 </div>;
}
export function AccountDirectory({people,companies,search,onSearch,onStatus,onApprove,onGrantAdmin}:{people:Person[];companies:Company[];search:string;onSearch:(v:string)=>void;onStatus:(person:Person)=>void;onApprove?:(person:Person)=>void;onGrantAdmin?:(person:Person)=>void}){
 const visible=people.filter(p=>[p.fullName,p.email,p.department,p.role,companies.find(c=>c.id===p.companyId)?.name||"Elixir Foundation"].join(" ").toLowerCase().includes(search.trim().toLowerCase()));
 return <div className="md-root">
  <div className="md-toolbar"><DirectorySearch value={search} onChange={onSearch} placeholder="Search accounts, companies or email"/><span>{visible.length} accounts</span></div>
  <div className="md-account-list">{visible.map(person=><article className="md-account" key={person.id}>
    <div className="md-person-profile"><Initials name={person.fullName}/><div><strong>{person.fullName}</strong><small>{person.email}</small></div></div>
    <div className="md-account-company"><Building2 size={15}/>{companies.find(c=>c.id===person.companyId)?.name||"Elixir Foundation"}</div>
    <div className="md-account-tags"><span className="md-role">{person.role==="platform_admin"?"Platform admin":person.role==="company_admin"?"Company admin":"Employee"}</span><span className={"aw-status "+person.status}>{person.status}</span></div>
    {person.role==="platform_admin"?<span className="md-self-label">Protected</span>:<div className="md-account-actions">{!person.verified&&onApprove&&<button className="md-outline-action" onClick={()=>onApprove(person)}>Approve</button>}{person.role==="employee"&&person.verified&&onGrantAdmin&&<button className="md-outline-action" onClick={()=>onGrantAdmin(person)}>Grant invited admin</button>}<button className="md-outline-action" onClick={()=>onStatus(person)}>{person.status==="active"?"Suspend":"Reactivate"}</button></div>}
   </article>)}</div>
  {!visible.length&&<Empty query={search} label="accounts"/>}
 </div>;
}
export function InvitationDirectory({invitations,companies}:{invitations:Invitation[];companies:Company[]}){
 if(!invitations.length)return <div className="md-empty"><Mail size={25}/><strong>No invitations yet</strong><p>Use the form above to create the first company-admin invitation.</p></div>;
 return <div className="md-account-list">{invitations.map(invite=><article className="md-invitation" key={invite.id}>
  <span className="md-invite-icon"><ShieldCheck size={22}/></span><div><strong>{invite.email}</strong><small>{companies.find(c=>c.id===invite.companyId)?.name||"Partner company"} · Company admin</small></div>
  <span className={"aw-status "+(invite.accepted?"active":"pending")}>{invite.accepted?"Accepted":"Pending"}</span>
 </article>)}</div>;
}
