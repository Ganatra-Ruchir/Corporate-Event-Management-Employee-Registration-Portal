"use client";
import { useEffect,useState } from "react";
import { useParams } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { EventForm } from "@/components/event-form";
import { supabase } from "@/lib/supabase";
import type { EventRecord } from "@/lib/types";
export default function EditEventPage(){
  const params=useParams<{id:string}>();const [event,setEvent]=useState<EventRecord|null>(null);const [error,setError]=useState("");
  useEffect(()=>{if(!supabase)return;void supabase.from("events").select("*").eq("id",params.id).single().then(({data,error})=>{if(error)setError(error.message);else setEvent(data as EventRecord);});},[params.id]);
  return <AppShell>{error?<div className="alert error">{error}</div>:event?<EventForm existing={event}/>:<div className="skeleton" style={{height:400}}/>}</AppShell>;
}