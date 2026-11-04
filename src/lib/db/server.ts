import "server-only";
import {Pool} from "pg";
import {randomBytes,scrypt as scryptCallback,timingSafeEqual,createHash} from "node:crypto";
import {promisify} from "node:util";
import type {PortalData,Person,PortalEvent,Company,Registration,Invitation} from "@/lib/portal-model";
import {hydrateEventImages} from "@/lib/media/server";

const scrypt=promisify(scryptCallback);
let pool:Pool|undefined;
export function databaseEnabled(){return process.env.PORTAL_BACKEND_MODE==="database" && Boolean(process.env.DATABASE_URL);}
export function sqlPool(){
 if(!databaseEnabled())throw new Error("Database mode is not configured");
 if(!pool)pool=new Pool({connectionString:process.env.DATABASE_URL,max:3,idleTimeoutMillis:10000,connectionTimeoutMillis:8000,ssl:{rejectUnauthorized:true}});
 return pool;
}
export const makeToken=()=>randomBytes(32).toString("base64url");
export const hashToken=(s:string)=>createHash("sha256").update(s).digest("hex");
export async function passwordHash(password:string){
 const salt=randomBytes(16).toString("hex");
 const dk=await scrypt(password,salt,64) as Buffer;
 return "scrypt:"+salt+":"+dk.toString("hex");
}
export async function passwordValid(password:string,stored:string){
 if(!stored.startsWith("scrypt:"))return false;
 const [,salt,hex]=stored.split(":");
 if(!salt||!hex||hex.length!==128)return false;
 const candidate=await scrypt(password,salt,64) as Buffer;
 return timingSafeEqual(candidate,Buffer.from(hex,"hex"));
}
export function toPerson(u:Record<string,unknown>):Person{
 return {id:String(u.id),fullName:String(u.full_name),email:String(u.email),department:String(u.department||""),
 role:u.role as Person["role"],companyId:u.organization_id===null?null:String(u.organization_id),status:u.status as Person["status"],
 verified:Boolean(u.verified),password:"",mustChangePassword:Boolean(u.must_change_password),showInAttendeeLists:Boolean(u.show_in_attendee_lists)};
}
export async function getSession(token?:string){
 if(!token)return null;
 const p=sqlPool();
 const r=await p.query("SELECT u.* FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=$1 AND s.expires_at>now() AND u.status='active'",[hashToken(token)]);
 if(!r.rowCount)return null;
 const person=toPerson(r.rows[0]);
 if(person.companyId){
  const company=await p.query("SELECT status FROM organizations WHERE id=$1",[person.companyId]);
  if(company.rows[0]?.status!=="active")return null;
 }
 return person;
}
export async function snapshot(current:Person):Promise<PortalData>{
 const p=sqlPool(),admin=current.role==="platform_admin";
 const [companies,users,events,registrations,invitations,domains]=await Promise.all([
  p.query(admin?"SELECT * FROM organizations ORDER BY name":"SELECT * FROM organizations WHERE id=$1 ORDER BY name",admin?[]:[current.companyId]),
  p.query(admin?"SELECT * FROM users ORDER BY full_name":"SELECT * FROM users WHERE organization_id=$1 ORDER BY full_name",admin?[]:[current.companyId]),
  p.query(admin?"SELECT payload FROM events ORDER BY starts_at":"SELECT payload FROM events WHERE organization_id=$1 AND (status='published' OR $2=true) ORDER BY starts_at",admin?[]:[current.companyId,current.role==="company_admin"]),
  p.query(admin?"SELECT r.* FROM registrations r":"SELECT r.* FROM registrations r JOIN events e ON e.id=r.event_id WHERE e.organization_id=$1",admin?[]:[current.companyId]),
  p.query(admin?"SELECT * FROM invitations":"SELECT * FROM invitations WHERE organization_id=$1",admin?[]:[current.companyId]),
  p.query(admin?"SELECT * FROM organization_domains":"SELECT * FROM organization_domains WHERE organization_id=$1",admin?[]:[current.companyId])
 ]);
 const domainMap=new Map<string,string[]>();
 for(const d of domains.rows){domainMap.set(d.organization_id,[...(domainMap.get(d.organization_id)||[]),d.domain]);}
 const mappedCompanies:Company[]=companies.rows.map(c=>({id:c.id,name:c.name,status:c.status,createdAt:new Date(c.created_at).toISOString(),domains:domainMap.get(c.id)||[]}));
 const mappedUsers=users.rows.map(toPerson);
 // Do not disclose all employees' private contact information to ordinary employees.
 const visibleUsers=current.role==="employee"?mappedUsers.filter(u=>u.id===current.id||u.showInAttendeeLists!==false).map(u=>u.id===current.id?u:{...u,email:""}):mappedUsers;
 const privateUsers=new Set(mappedUsers.filter(u=>u.showInAttendeeLists===false).map(u=>u.id));
 const mappedRegs:Registration[]=registrations.rows.map(r=>({
  id:r.id,eventId:r.event_id,
  userId:!admin&&current.role==="employee"&&r.user_id!==current.id&&privateUsers.has(r.user_id)?"private:"+r.id:r.user_id,
  status:r.status,createdAt:new Date(r.created_at).toISOString(),
  waitlistedAt:r.waitlisted_at?new Date(r.waitlisted_at).toISOString():null,
  promotedAt:r.promoted_at?new Date(r.promoted_at).toISOString():null
 }));
 const mappedInvites:Invitation[]=current.role==="platform_admin"?invitations.rows.map(i=>({id:i.id,email:i.email,companyId:i.organization_id,role:"company_admin",code:"",accepted:i.accepted})):[];
 return {companies:mappedCompanies,users:visibleUsers,events:await Promise.all(events.rows.map(e=>hydrateEventImages(e.payload as PortalEvent))),registrations:mappedRegs,invitations:mappedInvites};
}
export async function logAudit(client:{query:(sql:string,args?:unknown[])=>Promise<unknown>},current:Person,action:string,subject?:string,org?:string|null){
 await client.query("INSERT INTO audit_logs(actor_user_id,organization_id,action,subject_id) VALUES($1,$2,$3,$4)",[current.id,org??current.companyId,action,subject||null]);
}
