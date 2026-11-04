"use client";
import {useState} from "react";
import Link from "next/link";
import {useRouter} from "next/navigation";
import {ArrowRight,CheckCircle2,Mail,ShieldCheck} from "lucide-react";
import {emailAuthClient} from "@/lib/auth/email-client";
import "./signup.css";
type Step="details"|"otp"|"done";
export default function SignupPage(){
 const router=useRouter();
 const [step,setStep]=useState<Step>("details");
 const [name,setName]=useState(""),[email,setEmail]=useState(""),[department,setDepartment]=useState("");
 const [password,setPassword]=useState(""),[confirm,setConfirm]=useState(""),[otp,setOtp]=useState("");
 const [company,setCompany]=useState(""),[message,setMessage]=useState(""),[busy,setBusy]=useState(false);
 const mail=email.trim().toLowerCase();
 async function start(e:React.FormEvent){
  e.preventDefault();setMessage("");
  if(password.length<12||password!==confirm){setMessage("Use a password of at least 12 characters and confirm it correctly.");return;}
  setBusy(true);
  try{
   const r=await fetch("/api/portal/register?email="+encodeURIComponent(mail),{cache:"no-store"});
   const detail=await r.json();
   if(!r.ok){setMessage(detail.error||"Your company has not been registered.");return;}
   const sign=await emailAuthClient.signUp.email({name:name.trim(),email:mail,password});
   if(sign.error){setMessage(sign.error.message||"Could not create your verification account.");return;}
   // Neon sends the initial verification OTP automatically when Verify at Sign-up is enabled.
   setCompany(detail.organization);setStep("otp");
  }catch{setMessage("Connection failed. Try again.");}finally{setBusy(false);}
 }
 async function resend(){
  setBusy(true);setMessage("");
  try{
   const result=await emailAuthClient.emailOtp.sendVerificationOtp({email:mail,type:"email-verification"});
   setMessage(result.error?.message||"A new code has been requested. Check your inbox and spam folder.");
  }catch{setMessage("Unable to resend OTP.");}finally{setBusy(false);}
 }
 async function verify(e:React.FormEvent){
  e.preventDefault();setBusy(true);setMessage("");
  try{
   const check=await emailAuthClient.emailOtp.verifyEmail({email:mail,otp:otp.trim()});
   if(check.error){setMessage(check.error.message||"Incorrect or expired OTP.");return;}
   const signin=await emailAuthClient.signIn.email({email:mail,password});
   if(signin.error){setMessage("Email verified, but session creation failed. Retry verification.");return;}
   const r=await fetch("/api/portal/register",{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify({name:name.trim(),email:mail,password,department:department.trim()})});
   const data=await r.json();
   if(!r.ok){setMessage(data.error||"Unable to finish registration.");return;}
   setPassword("");setConfirm("");setOtp("");setStep("done");
  }catch{setMessage("Verification failed. Try again.");}finally{setBusy(false);}
 }
 return <main className="join-page"><section className="join-wrap">
  <header className="join-top"><Link href="/">← Back to sign in</Link><strong>Elixir Events Portal</strong></header>
  <div className="join-grid"><article className="join-panel">
   <small>EMPLOYEE SIGNUP · EMAIL OTP</small>
   <h1>{step==="details"?"Join your company's events":step==="otp"?"Verify your work email":"Registration received"}</h1>
   <p>{step==="details"?"Employees register using their organization's approved email domain.":step==="otp"?"Enter the verification code sent to "+mail+" ("+company+").":"Your email is verified. Your company admin must approve the account before you can sign in."}</p>
   <div className="join-steps"><span className={step==="details"?"active":""}>1 · Details</span><span className={step==="otp"?"active":""}>2 · Email OTP</span><span className={step==="done"?"active":""}>3 · Approval</span></div>
   {step==="details"&&<form onSubmit={start}>
    <label>Full name<input required autoComplete="name" value={name} onChange={e=>setName(e.target.value)} minLength={2} maxLength={100} placeholder="Your full name"/></label>
    <label>Work email<input required type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="name@company.com"/></label>
    <label>Department (optional)<input value={department} onChange={e=>setDepartment(e.target.value)} maxLength={100} placeholder="HR / IT / Operations"/></label>
    <label>Password<input required type="password" minLength={12} maxLength={128} autoComplete="new-password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="At least 12 characters"/></label>
    <label>Confirm password<input required type="password" minLength={12} maxLength={128} autoComplete="new-password" value={confirm} onChange={e=>setConfirm(e.target.value)}/></label>
    {message&&<div role="alert" className="join-feedback">{message}</div>}
    <button disabled={busy} type="submit">{busy?"Checking…":"Send email OTP"}<ArrowRight size={17}/></button>
   </form>}
   {step==="otp"&&<form onSubmit={verify}>
    <div className="join-tip"><Mail size={19}/> Verification requested for {mail}</div>
    <label>One-time code<input required autoComplete="one-time-code" inputMode="numeric" maxLength={12} value={otp} onChange={e=>setOtp(e.target.value)} placeholder="Enter email OTP"/></label>
    {message&&<div role="status" className="join-feedback">{message}</div>}
    <button disabled={busy||!otp.trim()} type="submit">{busy?"Verifying…":"Verify and register"}<ArrowRight size={17}/></button>
    <div className="join-actions"><button type="button" onClick={resend} disabled={busy}>Resend OTP</button><button type="button" disabled={busy} onClick={()=>setStep("details")}>Change email</button></div>
   </form>}
   {step==="done"&&<div className="join-done"><CheckCircle2 size={38}/><strong>Email verified</strong><p>Ask your organization admin to approve your employee account.</p><button onClick={()=>router.push("/")}>Go to sign in <ArrowRight size={17}/></button></div>}
  </article>
  <aside className="join-panel join-aside"><ShieldCheck size={36}/><h2>Secure company event access</h2><p>One-time email verification helps confirm you own your work email. Company admins control who can access their events.</p><div className="join-tip"><Mail size={18}/> Neon sends OTP emails during development at no additional email-service setup cost.</div><small>Development email delivery has limits. Production use needs a dedicated provider.</small></aside></div>
 </section></main>;
}
