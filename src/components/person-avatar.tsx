"use client";
import Image from "next/image";
import type {Person} from "@/lib/portal-model";
export function PersonAvatar({person,size=44}:{person:Person;size?:number}){
 const initials=person.fullName.trim().split(/\s+/).slice(0,2).map(p=>p[0]||"").join("").toUpperCase();
 return <span className="user-photo" style={{width:size,height:size,fontSize:Math.max(10,Math.round(size*.3))}} aria-label={person.fullName}>
   {person.avatarUrl?<Image alt={person.fullName+" profile photo"} src={person.avatarUrl} width={size} height={size} unoptimized/>:<span aria-hidden="true">{initials}</span>}
 </span>;
}
