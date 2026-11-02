import Link from "next/link";
import { CalendarDays, ArrowRight, ArrowUpRight, Users, Building2, ChartNoAxesCombined, HeartHandshake, CalendarCheck2, Leaf, MapPin } from "lucide-react";

export default function Home() {
  return <main className="landing">
    <header className="site-top">
      <Link className="logo" href="/"><span className="logo-mark"><CalendarDays size={21}/></span> gatherly<span style={{color:"#5b60d9"}}>.</span></Link>
      <nav className="site-links"><a href="#features">Features</a><a href="#how-it-works">How it works</a><Link href="/demo" className="btn btn-sm">Get started <ArrowUpRight size={15}/></Link></nav>
    </header>
    <section className="hero">
      <div>
        <span className="pill"><span style={{fontSize:15}}>✦</span> One platform. More impact.</span>
        <h1 style={{marginTop:23}}>Bring people together. <em>Make impact happen.</em></h1>
        <p className="hero-copy">From planning meaningful events to empowering employees to participate — manage your organization&apos;s experiences in one beautiful, connected space.</p>
        <div style={{display:"flex",gap:12,flexWrap:"wrap"}}><Link href="/demo" className="btn">Launch your workspace <ArrowRight size={17}/></Link><a href="#how-it-works" className="btn btn-secondary">See how it works</a></div>
        <div style={{display:"flex",gap:24,flexWrap:"wrap",marginTop:35,color:"#728098",fontSize:12,fontWeight:700}}><span>✓ Easy event publishing</span><span>✓ Secure organization spaces</span><span>✓ Participation tracking</span></div>
      </div>
      <div className="hero-preview" aria-label="Illustration of the event dashboard">
        <div className="preview-panel">
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:18}}><div><div className="overline">YOUR WORKSPACE</div><h3 style={{marginTop:4}}>Making impact, together</h3></div><span className="pill green">Live events</span></div>
          <div className="grid grid-2">
            <div className="preview-stat"><div className="small muted">Upcoming events</div><h2 style={{margin:"7px 0"}}>08</h2><div className="small" style={{color:"#23a58a"}}>Across your team</div></div>
            <div className="preview-stat"><div className="small muted">Registrations</div><h2 style={{margin:"7px 0"}}>124</h2><div className="small" style={{color:"#555ed4"}}>Growing community</div></div>
          </div>
          <div style={{fontWeight:800,marginTop:22}}>Featured experiences</div>
          <div className="preview-event"><div className="preview-art"><Leaf size={25}/></div><div style={{flex:1}}><b>Green Earth Initiative</b><div className="small muted"><CalendarCheck2 size={12} style={{verticalAlign:"middle"}}/> Sample event · 9:00 AM</div></div><span className="pill green">Open</span></div>
          <div className="preview-event"><div className="preview-art" style={{background:"#f2e8ff",color:"#8360c5"}}><HeartHandshake size={24}/></div><div style={{flex:1}}><b>Community Together Day</b><div className="small muted"><MapPin size={12} style={{verticalAlign:"middle"}}/> Sample event · Ahmedabad</div></div><span className="pill">Join</span></div>
          <div className="small muted" style={{marginTop:12}}>Illustrative preview only — not actual event data.</div>
        </div>
      </div>
    </section>
    <section id="features" className="feature-strip">
      <div style={{textAlign:"center",marginBottom:33}}><span className="overline">BUILT FOR CONNECTION</span><h2 style={{marginTop:9}}>Everything your team needs</h2><p className="muted">Simple tools for organizers. Inspiring experiences for employees.</p></div>
      <div className="grid grid-3">
        <div className="feature-tile"><Building2 size={27}/><h3>Organization workspaces</h3><p>Give each corporate partner a secure, dedicated space for its events and team.</p></div>
        <div className="feature-tile"><Users size={27}/><h3>Effortless registration</h3><p>Employees discover activities and reserve their spots in just a few clicks.</p></div>
        <div className="feature-tile"><ChartNoAxesCombined size={27}/><h3>Participation insights</h3><p>Track registrations, attendance and event engagement with clear dashboards.</p></div>
      </div>
    </section>
    <section id="how-it-works" style={{background:"#f1f2fe",padding:"66px 25px",textAlign:"center"}}>
      <span className="overline">THREE SIMPLE STEPS</span><h2 style={{margin:"9px 0 28px"}}>From idea to action</h2>
      <div className="grid grid-3" style={{maxWidth:1080,margin:"auto",textAlign:"left"}}>
        {[["01","Create a workspace","Corporate admins set up their organization's secure space."],["02","Publish experiences","Create events with details, location and available spots."],["03","Bring employees in","Invite colleagues to register and track participation."]].map(step=><div key={step[0]} className="card card-pad"><div className="overline">{step[0]}</div><h3 style={{margin:"12px 0"}}>{step[1]}</h3><p className="muted" style={{margin:0}}>{step[2]}</p></div>)}
      </div>
      <div style={{marginTop:36}}><Link className="btn" href="/demo">Start organizing <ArrowRight size={17}/></Link></div>
    </section>
    <footer style={{maxWidth:1200,margin:"auto",padding:"25px 30px",display:"flex",justifyContent:"space-between",flexWrap:"wrap",gap:12}}><span className="logo" style={{fontSize:17}}><span className="logo-mark" style={{width:27,height:27,borderRadius:9}}><CalendarDays size={16}/></span> gatherly.</span><span className="small muted">Corporate Event & Employee Registration Portal · MVP</span></footer>
  </main>;
}