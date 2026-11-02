"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarDays, ArrowRight, HeartHandshake, ShieldCheck } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { supabase } from "@/lib/supabase";
export default function AuthPage() {
  const router=useRouter();
  const auth=useAuth();
  const [mode,setMode]=useState<"login"|"signup">("login");
  const [name,setName]=useState("");
  const [email,setEmail]=useState("");
  const [password,setPassword]=useState("");
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const [success,setSuccess]=useState("");
  useEffect(()=>{if(auth.user)router.replace("/dashboard");},[auth.user,router]);
  async function submit(e:React.FormEvent){
    e.preventDefault();setError("");setSuccess("");
    if(!supabase){setError("Supabase is not configured. See README.md.");return;}
    setBusy(true);
    try {
      if(mode==="signup"){
        if(name.trim().length<2)throw new Error("Enter your full name.");
        const {data,error}=await supabase.auth.signUp({email:email.trim(),password,options:{
          data:{full_name:name.trim()}, emailRedirectTo:window.location.origin+"/auth"
        }});
        if(error)throw error;
        if(data.session)router.push("/dashboard");
        else setSuccess("Account created. Check your email for a confirmation link, then sign in.");
      }else{
        const {error}=await supabase.auth.signInWithPassword({email:email.trim(),password});
        if(error)throw error;
        router.push("/dashboard");
      }
    }catch(err){setError(err instanceof Error?err.message:"Something went wrong.");}
    finally{setBusy(false);}
  }
  return <main className="auth-screen">
    <section className="auth-art">
      <div style={{maxWidth:480}}>
        <div style={{border:"1px solid #ffffff5c",borderRadius:18,width:65,height:65,display:"grid",placeItems:"center",marginBottom:33}}><HeartHandshake size={34}/></div>
        <h1>Great things happen when we come together.</h1>
        <p>Connect your people, create experiences that matter, and measure the impact you make.</p>
        <div style={{marginTop:45,display:"flex",alignItems:"center",gap:10,color:"#e5e7ff"}}><ShieldCheck size={20}/> Organization-aware, secure by design</div>
      </div>
    </section>
    <section className="auth-form-wrap">
      <div className="auth-form">
        <Link href="/" className="logo"><span className="logo-mark"><CalendarDays size={20}/></span> gatherly<span style={{color:"#5558d7"}}>.</span></Link>
        <span className="overline">WELCOME TO YOUR WORKSPACE</span>
        <h2>{mode==="login"?"Welcome back":"Create your account"}</h2>
        <p>{mode==="login"?"Sign in to manage and discover meaningful events.":"Get started with your company events platform."}</p>
        <form className="form-stack" onSubmit={submit}>
          {mode==="signup"&&<div className="input-group"><label htmlFor="full-name">Full name</label><input className="field" id="full-name" autoComplete="name" required minLength={2} value={name} onChange={e=>setName(e.target.value)} placeholder="Your full name"/></div>}
          <div className="input-group"><label htmlFor="email">Work email</label><input className="field" id="email" autoComplete="email" type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="name@company.com"/></div>
          <div className="input-group"><label htmlFor="password">Password</label><input className="field" id="password" type="password" autoComplete={mode==="login"?"current-password":"new-password"} minLength={6} required value={password} onChange={e=>setPassword(e.target.value)} placeholder="At least 6 characters"/></div>
          {error&&<div className="alert error" role="alert">{error}</div>}
          {success&&<div className="alert success" role="status">{success}</div>}
          <button className="btn btn-full" disabled={busy||!auth.configured} type="submit">{busy?"Working...":mode==="login"?"Sign in":"Create account"} <ArrowRight size={17}/></button>
        </form>
        {!auth.configured&&<div className="alert info">Supabase environment variables have not been set. Follow the README setup steps first.</div>}
        <p style={{textAlign:"center",marginTop:24}}>{mode==="login"?"New to Gatherly?":"Already have an account?"} <button style={{border:0,background:"none",color:"#535bd9",fontWeight:800}} onClick={()=>{setMode(mode==="login"?"signup":"login");setError("");setSuccess("");}}>{mode==="login"?"Create an account":"Sign in"}</button></p>
        <div className="small muted" style={{textAlign:"center",marginTop:30}}>Access to corporate spaces requires an organization invitation.</div>
      </div>
    </section>
  </main>;
}