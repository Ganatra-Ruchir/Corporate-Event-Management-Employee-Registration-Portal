"use client";
import {ArrowRight,CalendarDays,Search,MapPin,Users,HeartHandshake,Sparkles,BookOpen,Leaf,HeartPulse,ArrowUpRight,ShieldCheck} from "lucide-react";
import {useState} from "react";
import Link from "next/link";
import {LandingArtwork} from "@/components/landing-artwork";

const curations=[
  {label:"Community impact",detail:"Volunteer and give back",scene:"impact" as const,icon:Leaf},
  {label:"Learning & ideas",detail:"Build something together",scene:"learn" as const,icon:BookOpen},
  {label:"People & culture",detail:"Celebrate shared moments",scene:"celebrate" as const,icon:Users},
  {label:"Wellbeing",detail:"Make time for wellness",scene:"wellness" as const,icon:HeartPulse}
];
export default function PublicLanding({onEnter}:{onEnter:()=>void}){
 const [query,setQuery]=useState("");
 const go=(e?:React.FormEvent)=>{e?.preventDefault();onEnter();};
 return <div className="landing landing-editorial">
  <header className="landing-header" aria-label="Site navigation">
    <div className="landing-brand"><span className="landing-mark">e</span><span>elixir<span className="landing-brand-light">events</span></span></div>
    <form onSubmit={go} className="landing-search"><Search size={17}/><input aria-label="Search events after signing in" placeholder="Search experiences..." value={query} onChange={e=>setQuery(e.target.value)}/><span className="landing-search-divider"/><span className="landing-place"><MapPin size={14}/> For your team</span><button aria-label="Sign in to search" type="submit"><ArrowRight size={17}/></button></form>
    <nav className="landing-nav"><button onClick={()=>document.getElementById("experiences")?.scrollIntoView({behavior:"smooth"})} className="landing-login">Explore</button><button onClick={onEnter} className="landing-login">Log in</button><Link href="/signup" className="landing-signup">Join your team <ArrowRight size={15}/></Link></nav>
  </header>
  <main>
    <section className="landing-photo-hero" aria-labelledby="landing-hero-title">
      <div className="landing-hero-image" aria-hidden="true"/>
      <div className="landing-hero-sheen" aria-hidden="true"/>
      <div className="landing-hero-wrap">
        <div className="landing-hero-main">
          <span className="landing-overline"><span className="landing-overline-dot"/> CREATED FOR CONNECTION</span>
          <h1 id="landing-hero-title">More than events.<span>Moments that matter.</span></h1>
          <p>Discover the people, purpose and experiences that make your workplace a community.</p>
          <div className="landing-hero-buttons"><button className="landing-cta" onClick={onEnter}>Discover your events <ArrowRight size={18}/></button><Link className="landing-hero-secondary" href="/signup">Join your organization <ArrowUpRight size={17}/></Link></div>
        </div>
        <div className="landing-glass-stamp"><span className="landing-glass-icon"><HeartHandshake size={25}/></span><div><strong>Come together.</strong><span>Connect · Learn · Make an impact</span></div></div>
      </div>
      <span className="landing-hero-index">ELIXIR FOUNDATION <span>—</span> EVENTS & EXPERIENCES</span>
    </section>
    <section className="landing-curations" id="experiences">
      <div className="landing-inner">
       <div className="landing-section-intro"><div><span className="landing-eyebrow">CURATED FOR EVERY TEAM</span><h2>Find your kind of experience.</h2><p>Meaningful ways to connect, grow and create lasting impact.</p></div><button onClick={onEnter}>View your events <ArrowRight size={18}/></button></div>
       <div className="landing-curation-grid">
       {curations.map((item,i)=><button type="button" className="landing-curation" key={item.label} onClick={onEnter} style={{animationDelay:`${i*85}ms`}}>
        <span className="landing-curation-visual"><LandingArtwork scene={item.scene}/><span className="landing-curation-icon"><item.icon size={19}/></span></span>
        <span className="landing-curation-number">0{i+1} / EXPERIENCE</span><strong>{item.label}</strong><span className="landing-curation-bottom">{item.detail}<ArrowUpRight size={18}/></span>
       </button>)}
       </div>
      </div>
    </section>
    <section className="landing-featured" aria-label="How experiences work">
      <div className="landing-inner">
        <div className="landing-section-intro"><div><span className="landing-eyebrow">THE EXPERIENCE EDIT</span><h2>Make more of your moments.</h2></div><span className="landing-featured-sub">Your organization&apos;s real event schedule is visible after sign-in.</span></div>
        <div className="landing-feature-grid">
          <button className="landing-feature-tile tile-one" onClick={onEnter}><div className="landing-feature-art"><LandingArtwork scene="meet"/></div><span className="landing-feature-details"><span><Sparkles size={15}/> TEAM CONNECTION</span><strong>Better together.</strong><small>Meet new people. Build a stronger team.</small><ArrowUpRight size={20}/></span></button>
          <button className="landing-feature-tile tile-two" onClick={onEnter}><div className="landing-feature-art"><LandingArtwork scene="ideas"/></div><span className="landing-feature-details"><span><BookOpen size={15}/> NEW PERSPECTIVES</span><strong>Ideas worth sharing.</strong><small>Inspire curiosity through talks and workshops.</small><ArrowUpRight size={20}/></span></button>
          <button className="landing-feature-tile tile-three" onClick={onEnter}><div className="landing-feature-art"><LandingArtwork scene="impact"/></div><span className="landing-feature-details"><span><Leaf size={15}/> PURPOSE IN ACTION</span><strong>Give something back.</strong><small>Turn a shared day into lasting change.</small><ArrowUpRight size={20}/></span></button>
        </div>
      </div>
    </section>
    <section className="landing-story"><div className="landing-story-image"/><div className="landing-story-shade"/><div className="landing-story-content"><span className="landing-eyebrow">PEOPLE MAKE THE DIFFERENCE</span><h2>Every great event starts with a reason to come together.</h2><p>From the first hello to the last shared memory, your next experience is closer than you think.</p><button onClick={onEnter}>Explore company experiences <ArrowRight size={18}/></button></div></section>
    <section className="landing-private-wrap"><div className="landing-private-note"><span className="landing-private-symbol"><ShieldCheck size={23}/></span><div><strong>Built for your organization, not the public internet.</strong><span>Event dates, registration and attendees are available only after secure sign-in.</span></div><button onClick={onEnter}>Sign in <ArrowRight size={16}/></button></div></section>
  </main>
  <footer className="landing-footer-new"><div className="landing-footer-grid"><div><div className="landing-footer-logo"><span className="landing-mark">e</span><strong>elixir events</strong></div><p>Bringing people together through purpose, participation and shared experiences.</p></div><div><h3>Explore</h3><button onClick={()=>document.getElementById("experiences")?.scrollIntoView({behavior:"smooth"})}>Experiences</button><button onClick={onEnter}>Event discovery</button><Link href="/signup">Join your team</Link></div><div><h3>Your account</h3><button onClick={onEnter}>Employee sign in</button><button onClick={onEnter}>Admin sign in</button><Link href="/signup">Create account</Link></div><div><h3>Our purpose</h3><p>People first. Community always. Every event an opportunity to do good.</p></div></div><div className="landing-footer-bottom"><span>© {new Date().getFullYear()} Elixir Foundation. All rights reserved.</span><span>Made for meaningful connections</span></div></footer>
 </div>;
}