"use client";
import {useState} from "react";
import Image from "next/image";
import type {Person} from "@/lib/portal-model";

export function PersonAvatar({person,size=44}:{person:Person;size?:number}){
 const [failedUrl,setFailedUrl]=useState<string|null>(null);
 const name=(person.fullName||"User").trim();
 const initials=name.split(/\s+/).slice(0,2).map(p=>p[0]||"").join("").toUpperCase();
 const avatar=person.avatarUrl;
 const showImage=Boolean(avatar)&&failedUrl!==avatar;
 return <span className="user-photo" style={{width:size,height:size,fontSize:Math.max(10,Math.round(size*.3)),overflow:"hidden",display:"inline-flex",alignItems:"center",justifyContent:"center"}} aria-label={name}>
   {showImage?<Image alt="" aria-hidden="true" src={avatar!} width={size} height={size} unoptimized onError={()=>setFailedUrl(avatar!)} style={{width:"100%",height:"100%",objectFit:"cover"}}/>:<span aria-hidden="true">{initials||"U"}</span>}
 </span>;
}
