"use client";
import {ArrowRight,ArrowUpRight,BookOpen,CalendarCheck,Check,ClipboardList,Download,HeartHandshake,HeartPulse,Leaf,Mail,Search,ShieldCheck,UserPlus,Users} from "lucide-react";
import Link from "next/link";
import {LandingArtwork} from "@/components/landing-artwork";

/** What a visitor wanted when they clicked: after sign-in the portal opens events in that category. */
export type LandingIntent={category?:string};

// Categories match the employee "Events" filter, so a card click lands on matching events after sign-in.
const curations=[
  {label:"Community impact",detail:"Volunteer and give back",scene:"impact" as const,icon:Leaf,category:"Volunteering"},
  {label:"Learning & ideas",detail:"Talks, workshops and new skills",scene:"learn" as const,icon:BookOpen,category:"Learning"},
  {label:"People & culture",detail:"Celebrate shared moments",scene:"celebrate" as const,icon:Users,category:"Social"},
  {label:"Wellbeing",detail:"Make time for wellness",scene:"wellness" as const,icon:HeartPulse,category:"Health"}
];
const steps=[
  {n:"01",title:"Join with your work email",text:"Sign up with your company email and confirm it with a one-time code. No approval wait.",scene:"meet" as const,icon:UserPlus},
  {n:"02",title:"Find something worth joining",text:"Browse your organization's events by category, date or open spots, and see who's going.",scene:"ideas" as const,icon:Search},
  {n:"03",title:"RSVP and show up",text:"Reserve a spot or join the waitlist, add it to your calendar, and get a reminder before it starts.",scene:"impact" as const,icon:CalendarCheck}
];
const hostFeatures=[
  {icon:ClipboardList,text:"Create and publish events with banners, speakers and registration deadlines"},
  {icon:Users,text:"Track RSVPs and waitlists; places open up automatically when someone cancels"},
  {icon:Download,text:"Export attendee and employee lists as CSV"},
  {icon:UserPlus,text:"Add employees directly, or let them join with an approved work email"}
];
const faqs=[
  {q:"Who can use Elixir Events?",a:"Employees of organizations that partner with the Elixir Foundation. You join with your work email; personal addresses such as Gmail or Outlook can't be used."},
  {q:"How do I create an account?",a:"Choose \"Join your team\", enter your work email, type in the one-time code we email you, and pick a password of at least 12 characters."},
  {q:"I forgot my password. What do I do?",a:"Ask your company's event admin to reset it. You'll get a temporary password and choose a new one when you sign in. Company admins can ask the Elixir Foundation team."},
  {q:"Who can see that I registered for an event?",a:"Only people in your organization. You can hide your name from attendee lists at any time in your profile."},
  {q:"Can I see other companies' events?",a:"No. Each organization sees only its own events, and event details are visible only after you sign in."}
];

export default function PublicLanding({onEnter}:{onEnter:(intent?:LandingIntent)=>void}){
 const jump=(id:string)=>(e:React.MouseEvent)=>{e.preventDefault();document.getElementById(id)?.scrollIntoView({behavior:"smooth",block:"start"});};
 return <div className="landing landing-editorial landing-v3">
  <a className="landing-skip" href="#landing-main">Skip to content</a>
  <header className="landing-header" aria-label="Site navigation">
    <a className="landing-brand" href="#top" onClick={jump("top")} aria-label="Elixir Events home"><span className="landing-mark" aria-hidden="true">e</span><span>Elixir <span className="landing-brand-light">Events</span></span></a>
    <nav className="landing-sections" aria-label="Page sections">
      <a href="#how-it-works" onClick={jump("how-it-works")}>How it works</a>
      <a href="#experiences" onClick={jump("experiences")}>Experiences</a>
      <a href="#organizations" onClick={jump("organizations")}>For organizations</a>
      <a href="#faq" onClick={jump("faq")}>FAQ</a>
    </nav>
    <nav className="landing-nav" aria-label="Account"><button type="button" onClick={()=>onEnter()} className="landing-login">Log in</button><Link href="/signup" className="landing-signup">Join<span className="landing-signup-more"> your team</span> <ArrowRight size={15}/></Link></nav>
  </header>
  <main id="landing-main">
    <section className="landing-photo-hero" id="top" aria-labelledby="landing-hero-title">
      <div className="landing-hero-image" aria-hidden="true"/>
      <div className="landing-hero-sheen" aria-hidden="true"/>
      <div className="landing-hero-wrap">
        <div className="landing-hero-main">
          <span className="landing-overline"><span className="landing-overline-dot"/> YOUR COMPANY&apos;S EVENTS, IN ONE PLACE</span>
          <h1 id="landing-hero-title">More than events.<span>Moments that matter.</span></h1>
          <p>Volunteer days, workshops, talks and team celebrations from your organization. Find them, RSVP in a click, and see who&apos;s going.</p>
          <div className="landing-hero-buttons"><button type="button" className="landing-cta" onClick={()=>onEnter()}>Sign in to your events <ArrowRight size={18}/></button><Link className="landing-hero-secondary" href="/signup">Join with your work email <ArrowUpRight size={17}/></Link></div>
          <ul className="landing-trust" aria-label="Why it's safe">
            <li><Check size={15}/> Work-email sign-in</li><li><Check size={15}/> Private to your organization</li><li><Check size={15}/> Calendar and reminders</li>
          </ul>
        </div>
        <div className="landing-glass-stamp" aria-hidden="true"><span className="landing-glass-icon"><HeartHandshake size={25}/></span><div><strong>Come together.</strong><span>Connect · Learn · Make an impact</span></div></div>
      </div>
      <span className="landing-hero-index" aria-hidden="true">ELIXIR FOUNDATION <span>—</span> EVENTS & EXPERIENCES</span>
    </section>

    <section className="landing-how" id="how-it-works" aria-labelledby="how-title">
      <div className="landing-inner">
        <div className="landing-section-intro"><div><span className="landing-eyebrow">HOW IT WORKS</span><h2 id="how-title">From inbox to event in three steps.</h2><p>No spreadsheets, no reply-all threads.</p></div></div>
        <ol className="landing-steps">
          {steps.map(step=><li key={step.n} className="landing-step">
            <div className="landing-step-art" aria-hidden="true"><LandingArtwork scene={step.scene}/></div>
            <div className="landing-step-body"><span className="landing-step-number"><step.icon size={16}/> STEP {step.n}</span><h3>{step.title}</h3><p>{step.text}</p></div>
          </li>)}
        </ol>
      </div>
    </section>

    <section className="landing-curations" id="experiences" aria-labelledby="experiences-title">
      <div className="landing-inner">
       <div className="landing-section-intro"><div><span className="landing-eyebrow">CURATED FOR EVERY TEAM</span><h2 id="experiences-title">Find your kind of experience.</h2><p>Pick a theme; after you sign in we&apos;ll show your organization&apos;s matching events.</p></div><button type="button" onClick={()=>onEnter()}>See all your events <ArrowRight size={18}/></button></div>
       <div className="landing-curation-grid">
       {curations.map((item,i)=><button type="button" className="landing-curation" key={item.label} onClick={()=>onEnter({category:item.category})} style={{animationDelay:`${i*85}ms`}} aria-label={item.label+": sign in to see "+item.category.toLowerCase()+" events"}>
        <span className="landing-curation-visual"><LandingArtwork scene={item.scene}/><span className="landing-curation-icon"><item.icon size={19}/></span></span>
        <span className="landing-curation-number">0{i+1} / EXPERIENCE</span><strong>{item.label}</strong><span className="landing-curation-bottom">{item.detail}<ArrowUpRight size={18}/></span>
       </button>)}
       </div>
      </div>
    </section>

    <section className="landing-story" aria-labelledby="story-title"><div className="landing-story-image" aria-hidden="true"/><div className="landing-story-shade" aria-hidden="true"/><div className="landing-story-content"><span className="landing-eyebrow">PEOPLE MAKE THE DIFFERENCE</span><h2 id="story-title">Every great event starts with a reason to come together.</h2><p>From the first hello to the last shared memory, your next experience is closer than you think.</p><button type="button" onClick={()=>onEnter()}>Explore your company&apos;s events <ArrowRight size={18}/></button></div></section>

    <section className="landing-orgs" id="organizations" aria-labelledby="orgs-title">
      <div className="landing-inner landing-orgs-grid">
        <div>
          <span className="landing-eyebrow">FOR HR AND EVENT TEAMS</span>
          <h2 id="orgs-title">Run your organization&apos;s events without the chaos.</h2>
          <p>Company admins publish events, see who&apos;s coming and manage their people from one dashboard.</p>
          <div className="landing-orgs-actions"><button type="button" className="landing-cta" onClick={()=>onEnter()}>Sign in as an admin <ArrowRight size={17}/></button></div>
          <p className="landing-orgs-note">New organizations are set up by the Elixir Foundation team, who connect your company&apos;s email domain.</p>
        </div>
        <ul className="landing-orgs-list">
          {hostFeatures.map(f=><li key={f.text}><span className="landing-orgs-icon"><f.icon size={18}/></span><span>{f.text}</span></li>)}
        </ul>
      </div>
    </section>

    <section className="landing-faq" id="faq" aria-labelledby="faq-title">
      <div className="landing-inner">
        <div className="landing-section-intro"><div><span className="landing-eyebrow">QUESTIONS</span><h2 id="faq-title">Good to know.</h2></div></div>
        <div className="landing-faq-list">
          {faqs.map(item=><details key={item.q} className="landing-faq-item"><summary>{item.q}</summary><p>{item.a}</p></details>)}
        </div>
      </div>
    </section>

    <section className="landing-private-wrap"><div className="landing-private-note"><span className="landing-private-symbol"><ShieldCheck size={23}/></span><div><strong>Built for your organization, not the public internet.</strong><span>Event dates, registration and attendees are available only after secure sign-in.</span></div><button type="button" onClick={()=>onEnter()}>Sign in <ArrowRight size={16}/></button></div></section>
  </main>
  <footer className="landing-footer-new"><div className="landing-footer-grid">
    <div><div className="landing-footer-logo"><span className="landing-mark" aria-hidden="true">e</span><strong>Elixir Events</strong></div><p>Bringing people together through purpose, participation and shared experiences.</p></div>
    <nav aria-label="Explore"><h3>Explore</h3><a href="#how-it-works" onClick={jump("how-it-works")}>How it works</a><a href="#experiences" onClick={jump("experiences")}>Experiences</a><a href="#organizations" onClick={jump("organizations")}>For organizations</a><a href="#faq" onClick={jump("faq")}>FAQ</a></nav>
    <nav aria-label="Your account"><h3>Your account</h3><button type="button" onClick={()=>onEnter()}>Sign in</button><Link href="/signup">Create an account</Link></nav>
    <div><h3>Our purpose</h3><p>People first. Community always. Every event an opportunity to do good.</p><p className="landing-footer-mail"><Mail size={13}/> Questions? Ask your company&apos;s event admin.</p></div>
  </div><div className="landing-footer-bottom"><span>© {new Date().getFullYear()} Elixir Foundation. All rights reserved.</span><span>Made for meaningful connections</span></div></footer>
 </div>;
}
