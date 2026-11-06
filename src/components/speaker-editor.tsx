"use client";

import Image from "next/image";
import {useState} from "react";
import {ArrowDown,ArrowUp,ImagePlus,Plus,Trash2} from "lucide-react";
import {SpeakerGallery} from "@/components/speaker-gallery";
import {makeId,validateSpeakers} from "@/lib/portal-model";
import type {Speaker} from "@/lib/portal-model";

const MAX_BYTES=20*1024*1024;
const emptySpeaker=():Speaker=>({
 id:makeId("speaker"),name:"",jobTitle:"",company:"",talkTitle:"",
 bio:"",agendaSlot:"",linkedIn:"",website:"",photoDataUrl:undefined,photoAlt:""
});

export async function prepareSpeakerPhoto(file:File):Promise<string>{
 if(!["image/jpeg","image/png","image/webp"].includes(file.type))throw Error("Choose a JPG, PNG or WebP photo.");
 if(file.size>MAX_BYTES)throw Error("The photo must be 20 MB or smaller.");
 const bitmap=await createImageBitmap(file);
 try{
  const canvas=document.createElement("canvas");
  // Preserve the uploaded image's aspect ratio: never center-crop portraits.
  const scale=Math.min(1,900/Math.max(bitmap.width,bitmap.height));
  canvas.width=Math.max(1,Math.round(bitmap.width*scale));
  canvas.height=Math.max(1,Math.round(bitmap.height*scale));
  const context=canvas.getContext("2d");
  if(!context)throw Error("Your browser cannot process this image.");
  context.drawImage(bitmap,0,0,canvas.width,canvas.height);
  let result=canvas.toDataURL("image/webp",0.72);
  if(result.length>380_000)result=canvas.toDataURL("image/webp",0.48);
  if(result.length>380_000)throw Error("This image is too large for local browser storage. Try a smaller photo.");
  return result;
 }finally{bitmap.close();}
}

export function SpeakerEditor({speakers,onChange}:{speakers:Speaker[];onChange:(speakers:Speaker[])=>void}){
 const [error,setError]=useState("");
 const [showPreview,setShowPreview]=useState(false);
 const [uploading,setUploading]=useState<string|null>(null);
 function update(id:string,field:keyof Speaker,value:string|undefined){
  onChange(speakers.map(s=>s.id===id?{...s,[field]:value}:s));
 }
 function add(){
  if(speakers.length>=12){setError("You can add up to 12 speakers.");return;}
  setError("");onChange([...speakers,emptySpeaker()]);setShowPreview(false);
 }
 function remove(id:string){onChange(speakers.filter(s=>s.id!==id));setError("");}
 function move(index:number,direction:-1|1){
  const to=index+direction;if(to<0||to>=speakers.length)return;
  const reordered=[...speakers];[reordered[index],reordered[to]]=[reordered[to],reordered[index]];
  onChange(reordered);
 }
 async function upload(id:string,file?:File){
  if(!file)return;
  setUploading(id);setError("");
  try{const photo=await prepareSpeakerPhoto(file);update(id,"photoDataUrl",photo);}
  catch(e){setError(e instanceof Error?e.message:"Unable to process speaker photo.");}
  finally{setUploading(null);}
 }
 const complete=speakers.filter(s=>s.name.trim()&&s.jobTitle.trim()&&s.company.trim()&&s.talkTitle.trim()&&s.bio.trim());
 const previewIssue=validateSpeakers(complete);
 return <section className="se-root" aria-label="Event speaker management">
  <div className="se-header">
   <div><span className="ed-eyebrow">YOUR EVENT LINEUP</span><h2>Speakers <span className="se-count">{speakers.length}</span></h2>
    <p>Add speakers, their photos and session details. Dragging is not required; use the reorder buttons.</p>
   </div>
   <button className="ep-button primary" type="button" onClick={add} disabled={speakers.length>=12}><Plus size={17}/> Add speaker</button>
  </div>
  {error&&<div className="ep-error se-upload-error" role="alert">{error}</div>}
  {speakers.length===0&&<div className="se-empty"><ImagePlus size={30}/><strong>No speakers added</strong><p>Use Add speaker to build the lineup shown on the event page.</p></div>}
  <div className="se-list">
   {speakers.map((speaker,i)=><article className="se-item" key={speaker.id}>
    <div className="se-item-head"><div><span className="se-position">SPEAKER {i+1}</span><strong>{speaker.name.trim()||"New speaker"}</strong></div>
      <div className="se-item-actions">
       <button type="button" onClick={()=>move(i,-1)} disabled={i===0} aria-label={"Move "+(speaker.name||"speaker")+" earlier"} title="Move earlier"><ArrowUp size={18}/></button>
       <button type="button" onClick={()=>move(i,1)} disabled={i===speakers.length-1} aria-label={"Move "+(speaker.name||"speaker")+" later"} title="Move later"><ArrowDown size={18}/></button>
       <button type="button" className="se-remove" onClick={()=>remove(speaker.id)} aria-label={"Remove "+(speaker.name||"speaker")} title="Remove speaker"><Trash2 size={18}/></button>
      </div>
    </div>
    <div className="se-item-body">
     <div className="se-photo-column">
       <div className="se-photo-preview">
         {speaker.photoDataUrl?
           <Image src={speaker.photoDataUrl} width={320} height={380} unoptimized alt={speaker.photoAlt||"Speaker photo preview"}/>:
           <span>{speaker.name.trim().split(/\s+/).slice(0,2).map(p=>p.slice(0,1)).join("").toUpperCase()||"SP"}</span>}
       </div>
       <label className="se-upload-label">Speaker photo (JPG, PNG or WebP, max 20 MB)
         <input type="file" accept="image/jpeg,image/png,image/webp" disabled={uploading===speaker.id} onChange={e=>{void upload(speaker.id,e.target.files?.[0]);e.target.value="";}}/>
       </label>
       {uploading===speaker.id&&<span role="status" className="ep-hint">Processing photo…</span>}
       {speaker.photoDataUrl&&<button type="button" className="se-remove-photo" onClick={()=>{onChange(speakers.map(x=>x.id===speaker.id?{...x,photoDataUrl:undefined,photoAlt:""}:x));}}>Remove photo</button>}
     </div>
     <div className="se-fields">
       <div className="se-fields-grid">
         <label className="ep-field">Full name<input required minLength={2} maxLength={100} value={speaker.name} onChange={e=>update(speaker.id,"name",e.target.value)} placeholder="e.g. Priya Raman"/></label>
         <label className="ep-field">Job title<input required maxLength={120} value={speaker.jobTitle} onChange={e=>update(speaker.id,"jobTitle",e.target.value)} placeholder="e.g. Senior Program Lead"/></label>
         <label className="ep-field">Company<input required maxLength={120} value={speaker.company} onChange={e=>update(speaker.id,"company",e.target.value)} placeholder="e.g. Northwind Services"/></label>
         <label className="ep-field">Talk title<input required maxLength={160} value={speaker.talkTitle} onChange={e=>update(speaker.id,"talkTitle",e.target.value)} placeholder="e.g. Practical digital skills"/></label>
       </div>
       <label className="ep-field">Short biography<textarea required rows={3} maxLength={700} value={speaker.bio} onChange={e=>update(speaker.id,"bio",e.target.value)} placeholder="Background, expertise and what the audience will learn."/></label>
       <label className="ep-field">Agenda slot (optional)<input value={speaker.agendaSlot||""} maxLength={160} onChange={e=>update(speaker.id,"agendaSlot",e.target.value)} placeholder="10:30 AM — Workshop introduction"/></label>
       <div className="se-fields-grid">
        <label className="ep-field">LinkedIn (optional)<input type="url" value={speaker.linkedIn||""} onChange={e=>update(speaker.id,"linkedIn",e.target.value)} placeholder="https://www.linkedin.com/in/…"/></label>
        <label className="ep-field">Website (optional)<input type="url" value={speaker.website||""} onChange={e=>update(speaker.id,"website",e.target.value)} placeholder="https://example.com"/></label>
       </div>
     </div>
    </div>
   </article>)}
  </div>
  {speakers.length>0&&<div className="se-preview-controls">
    <button type="button" className="ep-button secondary" onClick={()=>setShowPreview(v=>!v)} aria-expanded={showPreview}>
      {showPreview?"Hide speaker card preview":"Preview interactive speaker cards"}
    </button>
    {showPreview&&previewIssue&&<p className="ep-hint" role="status">Complete all required speaker details to see the preview.</p>}
  </div>}
  {showPreview&&!previewIssue&&complete.length>0&&<div className="se-preview-area"><SpeakerGallery speakers={complete}/></div>}
 </section>;
}
