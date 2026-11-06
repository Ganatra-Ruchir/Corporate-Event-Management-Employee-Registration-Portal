"use client";
import {ArrowRight,CalendarDays,Search,Users,MapPin,Sparkles} from "lucide-react";
import {useState} from "react";

export default function PublicLanding({onEnter}:{onEnter:()=>void}){
 const [query,setQuery]=useState("");
 const go=(event?:React.FormEvent)=>{event?.preventDefault();onEnter();};
 return <div className="landing">
   <header className="landing-header">
    <div className="landing-brand"><span className="landing-mark">e</span><span>elixir<span className="landing-brand-light">events</span></span></div>
    <form onSubmit={go} className="landing-search"><Search size={19}/><input aria-label="Search events after signing in" placeholder="Search company events..." value={query} onChange={e=>setQuery(e.target.value)}/><span className="landing-search-divider"/><span className="landing-place"><MapPin size={15}/> Your organization</span><button aria-label="Sign in to search" type="submit"><Search size={19}/></button></form>
    <nav className="landing-nav"><button onClick={onEnter} className="landing-login">Log in</button><button onClick={onEnter} className="landing-signup">Join events <ArrowRight size={15}/></button></nav>
   </header>
   <main>
    <section className="landing-hero" aria-labelledby="landing-hero-title">
     <div className="landing-art landing-art-left" aria-hidden="true">
       <div className="landing-float landing-float-one"><span className="landing-emoji">🤝</span><span className="landing-art-tag">TEAM MEETUPS</span></div>
       <div className="landing-float landing-float-two"><span className="landing-emoji">🌿</span><span className="landing-art-tag">GIVE BACK</span></div>
       <span className="landing-doodle landing-doodle-one">✳</span>
     </div>
     <div className="landing-hero-content"><span className="landing-kicker"><Sparkles size={15}/> EVENTS THAT BRING US TOGETHER</span><h1 id="landing-hero-title">Good things happen <span>when people meet.</span></h1><p>Find inspiring events, meet your colleagues and make a difference together. All your organization&apos;s experiences, in one place.</p><button className="landing-cta" onClick={onEnter}>Explore company events <ArrowRight size={19}/></button><span className="landing-hero-note">Sign in with your organization account to discover events.</span></div>
     <div className="landing-art landing-art-right" aria-hidden="true">
       <div className="landing-float landing-float-three"><span className="landing-emoji">🎤</span><span className="landing-art-tag">SHARE IDEAS</span></div>
       <div className="landing-float landing-float-four"><span className="landing-emoji">🎉</span><span className="landing-art-tag">CELEBRATE TOGETHER</span></div>
       <span className="landing-doodle landing-doodle-two">✦</span>
     </div>
    </section>
    <section className="landing-below"><div className="landing-section-heading"><div><span className="landing-kicker">MADE FOR YOUR ORGANIZATION</span><h2>Find your next experience</h2><p>From community projects to learning sessions, there&apos;s something for every team.</p></div><button onClick={onEnter}>See all events <ArrowRight size={17}/></button></div>
    <div className="landing-category-grid">
     <button onClick={onEnter}><span className="landing-category-art art-volunteer">🌱</span><strong>Volunteering & impact</strong><span>Make a difference together</span></button>
     <button onClick={onEnter}><span className="landing-category-art art-learning">💡</span><strong>Workshops & learning</strong><span>Learn something new</span></button>
     <button onClick={onEnter}><span className="landing-category-art art-community">🎊</span><strong>Team & community</strong><span>Connect beyond work</span></button>
     <button onClick={onEnter}><span className="landing-category-art art-wellness">💚</span><strong>Health & wellness</strong><span>Look after each other</span></button>
    </div><div className="landing-private-note"><CalendarDays size={20}/><div><strong>Your organization&apos;s upcoming events are private.</strong><span>Sign in to see real event schedules, hosts and attendees.</span></div><button onClick={onEnter}>Sign in <ArrowRight size={16}/></button></div></section>
   </main>
   <footer className="landing-footer"><span>Elixir Foundation · Events Portal</span><span>Connect. Participate. Create impact.</span></footer>
 </div>;
}