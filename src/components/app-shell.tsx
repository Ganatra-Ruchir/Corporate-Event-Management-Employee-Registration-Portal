"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { CalendarDays, LayoutDashboard, Ticket, PlusSquare, Building2, Users, Settings, LogOut, ChevronDown, ShieldCheck, LoaderCircle } from "lucide-react";
import { useAuth } from "@/components/auth-provider";

const navigation = [
  { href:"/dashboard", label:"Overview", icon:LayoutDashboard },
  { href:"/my-registrations", label:"My registrations", icon:Ticket },
  { href:"/events/new", label:"Create event", icon:PlusSquare, admin:true },
  { href:"/settings", label:"Organization", icon:Building2 },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const auth = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  useEffect(() => {
    if (!auth.loading && auth.configured && !auth.user) router.replace("/auth");
  }, [auth.loading, auth.configured, auth.user, router]);
  if (!auth.configured) return <main style={{maxWidth:650,margin:"100px auto",padding:24}}>
    <div className="card card-pad"><ShieldCheck size={33} color="#575bd6"/>
      <h2 style={{marginTop:15}}>Connect Supabase to continue</h2>
      <p className="muted">This is the real application, not a mockup. Configure your Supabase project in <code>.env.local</code> with NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY, then run the included database migration.</p>
      <Link className="btn" href="/">Return to homepage</Link>
    </div></main>;
  if (auth.loading || !auth.user) return <main style={{display:"grid",placeItems:"center",minHeight:"100vh"}}><LoaderCircle className="spin" size={32} color="#585bd8"/></main>;
  return <div className="app-frame">
    <aside className="sidebar">
      <Link href="/" className="logo"><span className="logo-mark"><CalendarDays size={20}/></span><span className="logo-text">gatherly<span style={{color:"#5b60d9"}}>.</span></span></Link>
      <div className="sidebar-label">Workspace</div>
      <nav>
        {navigation.filter(item=>!item.admin || auth.role === "admin").map(item => {
          const Icon=item.icon;
          const active=pathname === item.href || (item.href === "/dashboard" && pathname.startsWith("/events/") && auth.role!=="admin");
          return <Link key={item.href} href={item.href} className={"side-link"+(active?" active":"")} title={item.label}>
            <Icon size={19}/><span>{item.label}</span>
          </Link>;
        })}
        <Link href="/organizations/new" className={"side-link"+(pathname==="/organizations/new"?" active":"")} title="New organization"><Building2 size={19}/><span>New organization</span></Link>
        <Link href="/join" className={"side-link"+(pathname==="/join"?" active":"")} title="Join organization"><Users size={19}/><span>Join organization</span></Link>
      </nav>
      <div className="side-footer">
        <div style={{display:"flex",gap:10,alignItems:"center",marginBottom:12}}>
          <div className="avatar">{(auth.profile?.full_name||auth.user.email||"U").charAt(0).toUpperCase()}</div>
          <div className="user-text" style={{minWidth:0}}><div style={{fontWeight:800,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{auth.profile?.full_name||"Member"}</div><div className="small muted">{auth.role==="admin"?"Organization admin":"Employee"}</div></div>
        </div>
        <button className="btn btn-ghost btn-sm btn-full" onClick={async()=>{await auth.signOut();router.push("/auth");}}><LogOut size={16}/><span>Log out</span></button>
      </div>
    </aside>
    <div className="app-main">
      <header className="topbar">
        <div className="crumb" style={{display:"flex",alignItems:"center",gap:9,color:"#8b95a7"}}><LayoutDashboard size={17}/><span>/</span><strong style={{color:"#4a5570"}}>{pathname==="/dashboard"?"Dashboard":pathname.split("/").filter(Boolean).pop()?.replaceAll("-"," ")}</strong></div>
        <div className="topbar-right">
          {auth.memberships.length>0 ? <div style={{position:"relative"}}>
            <select className="org-select" aria-label="Current organization" value={auth.org?.id||""} onChange={e=>auth.chooseOrg(e.target.value)}>
              {auth.memberships.filter(x=>x.organization).map(m=><option value={m.organization_id} key={m.organization_id}>{m.organization?.name}</option>)}
            </select>
          </div> : <Link href="/join" className="btn btn-sm">Join an organization</Link>}
          <div className="avatar">{(auth.profile?.full_name||auth.user.email||"U").charAt(0).toUpperCase()}</div>
        </div>
      </header>
      <main className="content">{children}</main>
    </div>
  </div>;
}