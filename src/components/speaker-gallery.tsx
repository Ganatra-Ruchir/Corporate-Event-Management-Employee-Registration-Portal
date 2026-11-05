"use client";

import Image from "next/image";
import {useRef,useState} from "react";
import {ArrowLeft,ArrowRight,ExternalLink,RotateCcw} from "lucide-react";
import type {Speaker} from "@/lib/portal-model";

function SpeakerCard({speaker}:{speaker:Speaker}){
 const [flipped,setFlipped]=useState(false);
 const card=useRef<HTMLButtonElement>(null);
 const initials=speaker.name.trim().split(/\s+/).slice(0,2).map(part=>part.slice(0,1)).join("").toUpperCase();
 function pointerMove(event:React.PointerEvent<HTMLButtonElement>){
  if(flipped||event.pointerType!=="mouse"||window.matchMedia("(prefers-reduced-motion: reduce)").matches)return;
  const rect=event.currentTarget.getBoundingClientRect();
  const dx=(event.clientX-rect.left)/rect.width-.5;
  const dy=(event.clientY-rect.top)/rect.height-.5;
  card.current?.style.setProperty("--card-ry",(dx*16).toFixed(2)+"deg");
  card.current?.style.setProperty("--card-rx",(-dy*16).toFixed(2)+"deg");
  card.current?.style.setProperty("--sheen-x",((dx+.5)*100).toFixed(1)+"%");
  card.current?.style.setProperty("--sheen-y",((dy+.5)*100).toFixed(1)+"%");
 }
 function resetTilt(){
  card.current?.style.setProperty("--card-ry","0deg");
  card.current?.style.setProperty("--card-rx","0deg");
 }
 const links=[speaker.linkedIn?{label:"LinkedIn",url:speaker.linkedIn}:null,speaker.github?{label:"GitHub",url:speaker.github}:null,speaker.website?{label:"Website",url:speaker.website}:null].filter((x):x is {label:string,url:string}=>Boolean(x));
 return <article className={"sp-card"+(flipped?" is-flipped":"")} aria-label={"Speaker: "+speaker.name}>
   <button
     type="button"
     ref={card}
     className="sp-flip-trigger"
     aria-pressed={flipped}
     onPointerMove={pointerMove}
     onPointerLeave={resetTilt}
     onBlur={resetTilt}
     onClick={()=>{setFlipped(value=>!value);resetTilt();}}
   >
    <span className="sp-flip-scene" aria-hidden="true">
      <span className="sp-face sp-face-front">
        <span className="sp-portrait">
          {speaker.photoDataUrl?
           <Image src={speaker.photoDataUrl} alt={speaker.photoAlt||speaker.name} width={460} height={500} unoptimized/>:
           <span className="sp-initials">{initials||"SP"}</span>}
        </span>
        <span className="sp-front-copy">
          <span className="sp-overline">EVENT SPEAKER</span>
          <strong className="sp-name">{speaker.name}</strong>
          <span className="sp-job">{speaker.jobTitle} · {speaker.company}</span>
          <span className="sp-talk">{speaker.talkTitle}</span>
          <span className="sp-flip-hint"><RotateCcw size={14}/> Flip for speaker details</span>
        </span>
      </span>
      <span className="sp-face sp-face-back">
        <span className="sp-overline">ABOUT THE SPEAKER</span>
        <strong className="sp-back-name">{speaker.name}</strong>
        <span className="sp-back-role">{speaker.jobTitle}, {speaker.company}</span>
        <span className="sp-back-label">Session</span>
        <span className="sp-back-talk">{speaker.talkTitle}</span>
        {speaker.agendaSlot&&<span className="sp-back-slot">{speaker.agendaSlot}</span>}
        <span className="sp-back-label">Biography</span>
        <span className="sp-back-bio">{speaker.bio}</span>
        <span className="sp-flip-hint"><RotateCcw size={14}/> Flip back</span>
      </span>
    </span>
    <span className="sr-only">
      {speaker.name}, {speaker.jobTitle} at {speaker.company}. Talk: {speaker.talkTitle}.
      Biography: {speaker.bio}. {speaker.photoAlt?"Photo: "+speaker.photoAlt+".":""} {speaker.agendaSlot?"Session: "+speaker.agendaSlot:""}
      Activate to {flipped?"show speaker photo":"turn card over"}.
    </span>
   </button>
   {flipped&&links.length>0&&<div className="sp-speaker-links" aria-label={speaker.name+" links"}>
     {links.map(link=><a key={link.label} href={link.url} target="_blank" rel="noopener noreferrer">{link.label}<ExternalLink size={13}/></a>)}
   </div>}
 </article>;
}

export function SpeakerGallery({speakers}:{speakers:Speaker[]}){
 const strip=useRef<HTMLDivElement>(null);
 if(!speakers.length)return null;
 const scroll=(direction:-1|1)=>{
  const element=strip.current;
  if(!element)return;
  const card=element.querySelector<HTMLElement>(".sp-card");
  const width=(card?.getBoundingClientRect().width||300)+16;
  element.scrollBy({left:direction*width,behavior:window.matchMedia("(prefers-reduced-motion: reduce)").matches?"instant":"smooth"});
 };
 return <section className="sp-gallery" aria-labelledby="speakers-heading">
   <div className="sp-gallery-heading">
    <div><span className="ed-eyebrow">PEOPLE BEHIND THE EVENT</span><h2 id="speakers-heading">Meet the speakers <span className="sp-count">{speakers.length}</span></h2><p>Turn a card to read about the speaker and their session.</p></div>
    {speakers.length>3&&<div className="sp-gallery-controls">
      <button aria-label="Previous speakers" onClick={()=>scroll(-1)} type="button"><ArrowLeft size={19}/></button>
      <button aria-label="Next speakers" onClick={()=>scroll(1)} type="button"><ArrowRight size={19}/></button>
    </div>}
   </div>
   <div ref={strip} className={"sp-gallery-strip"+(speakers.length>3?" sp-overflow":"")} role="group" aria-label="Event speakers">
     {speakers.map(s=><SpeakerCard key={s.id} speaker={s}/>)}
   </div>
 </section>;
}
