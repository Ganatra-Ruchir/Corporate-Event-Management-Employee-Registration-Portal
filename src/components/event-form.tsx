"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { supabase } from "@/lib/supabase";
import { dateInput, type EventRecord, type EventStatus } from "@/lib/types";

export function EventForm({ existing }: { existing?: EventRecord }) {
  const router=useRouter();const auth=useAuth();
  const tomorrow=new Date(Date.now()+86400000);
  tomorrow.setHours(10,0,0,0);
  const defaultStart=dateInput(tomorrow.toISOString());
  const defaultEnd=dateInput(new Date(tomorrow.getTime()+7200000).toISOString());
  const [title,setTitle]=useState(existing?.title||"");
  const [description,setDescription]=useState(existing?.description||"");
  const [category,setCategory]=useState(existing?.category||"Volunteering");
  const [location,setLocation]=useState(existing?.location||"");
  const [start,setStart]=useState(existing?dateInput(existing.start_at):defaultStart);
  const [end,setEnd]=useState(existing?dateInput(existing.end_at):defaultEnd);
  const [capacity,setCapacity]=useState(existing?.capacity||30);
  const [status,setStatus]=useState<EventStatus>(existing?.status||"draft");
  const [busy,setBusy]=useState(false);const [error,setError]=useState("");
  // If the record is loaded asynchronously after the component mounts, sync the form.
  useEffect(()=>{
    if(!existing)return;
    setTitle(existing.title);setDescription(existing.description);setCategory(existing.category);
    setLocation(existing.location);setStart(dateInput(existing.start_at));setEnd(dateInput(existing.end_at));
    setCapacity(existing.capacity);setStatus(existing.status);
  },[existing?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const authorized=auth.role==="admin"&&Boolean(auth.org)&&(!existing||existing.organization_id===auth.org?.id);
  async function submit(e:React.FormEvent) {
    e.preventDefault();setError("");
    if(!supabase||!auth.user||!auth.org||!authorized){setError("Organization admin permission required.");return;}
    const startDate=new Date(start),endDate=new Date(end);
    if(Number.isNaN(startDate.getTime())||Number.isNaN(endDate.getTime())||endDate<=startDate){setError("End time must be after the start time.");return;}
    if(status==="published"&&startDate<=new Date()&&!existing){setError("New published events must start in the future.");return;}
    if(capacity<1||capacity>100000){setError("Capacity must be between 1 and 100,000.");return;}
    setBusy(true);
    const payload={title:title.trim(),description:description.trim(),category,location:location.trim(),start_at:startDate.toISOString(),end_at:endDate.toISOString(),capacity,status};
    const response=existing
      ?await supabase.from("events").update(payload).eq("id",existing.id).eq("organization_id",auth.org.id).select("id").single()
      :await supabase.from("events").insert({...payload,organization_id:auth.org.id,created_by:auth.user.id}).select("id").single();
    setBusy(false);
    if(response.error)setError(response.error.message);
    else router.push("/events/"+response.data.id);
  }
  if(!authorized)return <div className="alert error">Only an administrator of this organization can manage this event.</div>;
  return <div style={{maxWidth:1000}}>
    <Link href={existing?"/events/"+existing.id:"/dashboard"} className="small muted" style={{display:"inline-flex",gap:8,alignItems:"center",marginBottom:20}}><ArrowLeft size={15}/> Back</Link>
    <div className="page-header"><div><span className="overline">EVENT MANAGEMENT</span><h1>{existing?"Edit event":"Create a new event"}</h1><p>{existing?"Update your event information and visibility.":"Plan a new experience for your organization."}</p></div></div>
    <form onSubmit={submit} className="card card-pad form-stack">
      <h3>Basic details</h3>
      <div className="input-group"><label htmlFor="event-title">Event title *</label><input id="event-title" className="field" minLength={3} maxLength={160} required placeholder="e.g. Community Tree Plantation Drive" value={title} onChange={e=>setTitle(e.target.value)}/></div>
      <div className="input-group"><label htmlFor="event-desc">Description</label><textarea id="event-desc" className="field" maxLength={5000} placeholder="Describe the purpose, what participants will do, and what to bring." value={description} onChange={e=>setDescription(e.target.value)}/></div>
      <div className="form-grid">
        <div className="input-group"><label htmlFor="event-category">Category</label><select id="event-category" className="field" value={category} onChange={e=>setCategory(e.target.value)}><option>Volunteering</option><option>Environment</option><option>Education</option><option>Health & Wellness</option><option>Community Outreach</option><option>Corporate Engagement</option><option>Other</option></select></div>
        <div className="input-group"><label htmlFor="event-place">Location *</label><input id="event-place" className="field" required maxLength={200} placeholder="Venue, city or online meeting link" value={location} onChange={e=>setLocation(e.target.value)}/></div>
      </div>
      <div className="divider" style={{margin:"3px 0"}}/>
      <h3>Schedule and capacity</h3>
      <div className="form-grid">
        <div className="input-group"><label htmlFor="event-start">Start date and time *</label><input id="event-start" className="field" type="datetime-local" required value={start} onChange={e=>setStart(e.target.value)}/></div>
        <div className="input-group"><label htmlFor="event-end">End date and time *</label><input id="event-end" className="field" type="datetime-local" required value={end} onChange={e=>setEnd(e.target.value)}/></div>
      </div>
      <div className="form-grid">
        <div className="input-group"><label htmlFor="event-capacity">Maximum participants *</label><input id="event-capacity" className="field" type="number" min={1} max={100000} required value={capacity} onChange={e=>setCapacity(Number(e.target.value))}/></div>
        <div className="input-group"><label htmlFor="event-status">Event status</label><select id="event-status" className="field" value={status} onChange={e=>setStatus(e.target.value as EventStatus)}><option value="draft">Draft — admins only</option><option value="published">Published — employees can register</option><option value="cancelled">Cancelled — registration closed</option></select></div>
      </div>
      <div className="alert info">Draft events are visible only to admins. Publishing makes the event available to employees in this organization. All changes are permission-checked by the database.</div>
      {error&&<div className="alert error" role="alert">{error}</div>}
      <div style={{display:"flex",justifyContent:"flex-end",gap:12,flexWrap:"wrap"}}><Link className="btn btn-secondary" href={existing?"/events/"+existing.id:"/dashboard"}>Cancel</Link><button type="submit" className="btn" disabled={busy||!title.trim()||!location.trim()}><Save size={17}/>{busy?"Saving...":existing?"Save changes":"Create event"}</button></div>
    </form>
  </div>;
}