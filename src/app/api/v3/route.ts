import {NextRequest,NextResponse} from "next/server";
import {randomUUID} from "node:crypto";
import {databaseEnabled,getSession,sqlPool,passwordHash,makeToken,logAudit} from "@/lib/db/server";
import {sameOrigin} from "@/lib/http";
import {canAssign,canManageScope,type V3Actor,type V3Membership,type V3Scope} from "@/lib/v3-permissions";
export const runtime="nodejs";
export const dynamic="force-dynamic";
const reply=(data:unknown,status=200)=>NextResponse.json(data,{status,headers:{"Cache-Control":"no-store"}});
const fail=(error:string,status=400)=>reply({error},status);
const txt=(v:unknown,n=160)=>typeof v==="string"?v.trim().slice(0,n):"";
async function context(req:NextRequest){
 if(process.env.PORTAL_V3_ENABLED!=="true"||!databaseEnabled())return null;
 const user=await getSession(req.cookies.get("elixir_session")?.value);
 if(!user||!user.verified||user.mustChangePassword)return null;
 const db=sqlPool();
 const membership=(await db.query<V3Membership>("SELECT * FROM v3_memberships WHERE user_id=$1 AND organization_id=$2",[user.id,user.companyId])).rows[0];
 const actor:V3Actor=user.role==="platform_admin"?{level:"root",scope:null}:
  {level:membership?.level==="country_admin"&&user.role==="company_admin"?"country_admin":membership?.level==="state_admin"&&user.role==="employee"?"state_admin":"employee",scope:membership||null};
 return {user,actor,db};
}
export async function GET(req:NextRequest){
 try{
  const c=await context(req);if(!c)return fail("V3 is not enabled or sign-in is required",404);
  const {user,actor,db}=c;
  if(actor.level==="employee"){
   const result=await db.query("SELECT e.id,e.title,e.starts_at,c.volunteer_minutes,c.contribution,c.verified_at FROM v3_contributions c JOIN events e ON e.id=c.event_id WHERE c.user_id=$1 AND e.organization_id=$2 AND e.status='published' ORDER BY e.starts_at DESC",[user.id,user.companyId]);
   return reply({level:actor.level,scope:actor.scope,contributions:result.rows});
  }
  const root=actor.level==="root",s=actor.scope;
  const args=[root?null:s?.organization_id||null,root?null:s?.country_code||null,actor.level==="state_admin"?s?.state_id||null:null];
  const [countries,states,branches,members,attendance]=await Promise.all([
   db.query("SELECT c.*,o.name AS organization_name FROM v3_countries c JOIN organizations o ON o.id=c.organization_id WHERE ($1::text IS NULL OR c.organization_id=$1) AND ($2::text IS NULL OR c.code=$2) ORDER BY o.name,c.name",args.slice(0,2)),
   db.query("SELECT * FROM v3_states WHERE ($1::text IS NULL OR organization_id=$1) AND ($2::text IS NULL OR country_code=$2) AND ($3::text IS NULL OR id=$3) ORDER BY name",args),
   db.query("SELECT * FROM v3_branches WHERE ($1::text IS NULL OR organization_id=$1) AND ($2::text IS NULL OR country_code=$2) AND ($3::text IS NULL OR state_id=$3) ORDER BY name",args),
   db.query("SELECT m.*,u.full_name,u.email FROM v3_memberships m JOIN users u ON u.id=m.user_id AND u.organization_id=m.organization_id WHERE ($1::text IS NULL OR m.organization_id=$1) AND ($2::text IS NULL OR m.country_code=$2) AND ($3::text IS NULL OR m.state_id=$3) ORDER BY u.full_name",args),
   root?Promise.resolve({rows:[]}):db.query("SELECT r.event_id,r.user_id,e.title,u.full_name,c.volunteer_minutes,c.contribution FROM registrations r JOIN events e ON e.id=r.event_id JOIN users u ON u.id=r.user_id JOIN v3_memberships m ON m.user_id=u.id AND m.organization_id=e.organization_id AND u.organization_id=m.organization_id LEFT JOIN v3_contributions c ON c.event_id=r.event_id AND c.user_id=r.user_id WHERE m.organization_id=$1 AND m.country_code=$2 AND ($3::text IS NULL OR m.state_id=$3) AND m.level='employee' AND r.status='going' AND e.status='published' AND e.ends_at<=now() ORDER BY e.ends_at DESC LIMIT 250",args)
  ]);
  return reply({level:actor.level,scope:s,countries:countries.rows,states:states.rows,branches:branches.rows,members:members.rows,attendance:attendance.rows});
 }catch(e){console.error("V3 read failed",e);return fail("V3 workspace unavailable; check staging migration",503);}
}
export async function POST(req:NextRequest){
 if(!sameOrigin(req))return fail("Invalid request origin",403);
 try{
  const c=await context(req);if(!c)return fail("V3 is not enabled or sign-in is required",404);
  const {user,actor,db}=c;
  if(actor.level==="employee")return fail("Not authorized",403);
  const a=await req.json();
  const action=txt(a.action,40),org=txt(a.organization_id),country=txt(a.country_code,2).toUpperCase(),state=txt(a.state_id)||null,branch=txt(a.branch_id)||null;
  const scope:V3Scope={organization_id:org,country_code:country,state_id:state,branch_id:branch};
  if(!org||!/^[A-Z]{2}$/.test(country)||!canManageScope(actor,scope))return fail("Invalid or unauthorized scope",403);
  const name=txt(a.name);
  const client=await db.connect();
  try{
   await client.query("BEGIN");
   let credentials:Record<string,string>|undefined;
   let subject="";
   if(action==="country"&&actor.level==="root"){
    if(name.length<2||name.length>100)return fail("Enter country name");
    await client.query("INSERT INTO v3_countries(organization_id,code,name) SELECT id,$2,$3 FROM organizations WHERE id=$1 AND status='active'",[org,country,name]);subject=country;
   }else if(action==="state"&&actor.level==="country_admin"){
    if(name.length<2||name.length>100)return fail("Enter state name");
    subject=randomUUID();await client.query("INSERT INTO v3_states(id,organization_id,country_code,name) VALUES($1,$2,$3,$4)",[subject,org,country,name]);
   }else if(action==="branch"&&actor.level==="country_admin"){
    if(name.length<2||!state)return fail("Enter branch name and state");
    subject=randomUUID();await client.query("INSERT INTO v3_branches(id,organization_id,country_code,state_id,name) VALUES($1,$2,$3,$4,$5)",[subject,org,country,state,name]);
   }else if(action==="assignCountryAdmin"&&canAssign(actor,"country_admin",scope)){
    const email=txt(a.email,255).toLowerCase();
    const target=(await client.query("SELECT id FROM users WHERE email=$1 AND organization_id=$2 AND role='company_admin' AND status='active' AND verified=true FOR UPDATE",[email,org])).rows[0];
    if(!target)return fail("Create or activate the company admin first",404);
    subject=target.id;await client.query("INSERT INTO v3_memberships(user_id,organization_id,country_code,level) VALUES($1,$2,$3,'country_admin')",[subject,org,country]);
   }else if(action==="provision"){
    const level=a.level==="state_admin"?"state_admin":a.level==="employee"?"employee":null;
    if(!level||!canAssign(actor,level,scope)||!state||(level==="employee"&&!branch)||(level==="state_admin"&&branch))return fail("Invalid or unauthorized account scope",403);
    const email=txt(a.email,255).toLowerCase();
    if(name.length<2||name.length>100||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return fail("Enter name and valid work email");
    const valid=await client.query("SELECT 1 FROM organization_domains d JOIN organizations o ON o.id=d.organization_id WHERE d.organization_id=$1 AND d.domain=$2 AND o.status='active'",[org,email.split("@")[1]]);
    if(!valid.rowCount)return fail("Use an approved company email domain",403);
    subject="EMP-"+randomUUID().toUpperCase();const temporaryPassword=makeToken().slice(0,24);
    await client.query("INSERT INTO users(id,full_name,email,password_hash,department,role,organization_id,verified,status,must_change_password,v3_temporary_password_expires_at) VALUES($1,$2,$3,$4,$5,'employee',$6,true,'active',true,now()+interval '24 hours')",[subject,name,email,await passwordHash(temporaryPassword),txt(a.department,100),org]);
    await client.query("INSERT INTO v3_memberships(user_id,organization_id,country_code,state_id,branch_id,level) VALUES($1,$2,$3,$4,$5,$6)",[subject,org,country,state,branch,level]);
    credentials={employeeId:subject,email,temporaryPassword,expiresIn:"24 hours"};
   }else if(action==="verify"&&(actor.level==="country_admin"||actor.level==="state_admin")){
    const eventId=txt(a.event_id),userId=txt(a.user_id),minutes=Number(a.volunteer_minutes);
    if(!Number.isInteger(minutes)||minutes<0||minutes>10080)return fail("Enter valid volunteer minutes");
    const target=(await client.query<V3Membership>("SELECT m.* FROM v3_memberships m JOIN users u ON u.id=m.user_id AND u.organization_id=m.organization_id JOIN registrations r ON r.user_id=u.id JOIN events e ON e.id=r.event_id AND e.organization_id=m.organization_id WHERE u.id=$1 AND e.id=$2 AND m.level='employee' AND r.status='going' AND e.status='published' AND e.ends_at<=now() FOR UPDATE OF r,m",[userId,eventId])).rows[0];
    if(!target||!canManageScope(actor,target))return fail("No eligible registration in your scope",403);
    subject=eventId+":"+userId;
    await client.query("INSERT INTO v3_contributions(event_id,user_id,volunteer_minutes,contribution,verified_by) VALUES($1,$2,$3,$4,$5) ON CONFLICT(event_id,user_id) DO UPDATE SET volunteer_minutes=excluded.volunteer_minutes,contribution=excluded.contribution,verified_by=excluded.verified_by,verified_at=now()",[eventId,userId,minutes,txt(a.contribution,1000),user.id]);
   }else return fail("Not authorized",403);
   await logAudit(client,user,"v3."+action,subject,org);
   await client.query("COMMIT");
   return reply({success:true,...credentials});
  }catch(e){await client.query("ROLLBACK");const code=(e as {code?:string}).code;if(code==="23505")return fail("This record or account already exists",409);if(code==="23503"||code==="23514")return fail("Invalid organization or location assignment");throw e;}
  finally{await client.query("ROLLBACK").catch(()=>{});client.release();}
 }catch(e){console.error("V3 write failed",e);return fail("V3 operation unavailable",503);}
}
