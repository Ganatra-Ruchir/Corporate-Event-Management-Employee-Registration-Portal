import {NextRequest,NextResponse} from "next/server";
import {randomUUID} from "node:crypto";
import {databaseEnabled,sqlPool,passwordHash,passwordValid,makeToken,hashToken,getSession,snapshot,logAudit} from "@/lib/db/server";
import {validateEvent} from "@/lib/portal-model";
import {storeEventImages} from "@/lib/media/server";
import type {Person,PortalEvent,Company} from "@/lib/portal-model";

export const runtime="nodejs";
export const dynamic="force-dynamic";
const COOKIE="elixir_session";
type Args=Record<string,unknown>;
function error(message:string,status=400){return NextResponse.json({error:message},{status,headers:{"Cache-Control":"no-store"}});}
function ok(data:Record<string,unknown>={}){return NextResponse.json(data,{headers:{"Cache-Control":"no-store"}});}
function text(v:unknown,max=200){return typeof v==="string"?v.trim().slice(0,max):"";}
function denied(){return error("Not authorized for this operation",403);}
function requireAdmin(user:Person){return user.role==="platform_admin";}
function requireCompanyAdmin(user:Person,companyId:string){return user.role==="company_admin"&&user.companyId===companyId;}
function requireOrg(user:Person,companyId:string){return requireAdmin(user)||user.companyId===companyId;}
function hostOriginMatch(req:NextRequest){
 const origin=req.headers.get("origin");
 return !origin||new URL(origin).host===req.headers.get("host");
}
function jsonPayload(value:unknown){
 const raw=JSON.stringify(value);
 if(!raw||raw.length>3_500_000)throw new Error("Event payload is too large");
 return raw;
}
async function getSnapshot(user:Person){return ok({enabled:true,currentId:user.id,data:await snapshot(user)});}
export async function GET(req:NextRequest){
 if(!databaseEnabled())return ok({enabled:false});
 try{
  const user=await getSession(req.cookies.get(COOKIE)?.value);
  return user?getSnapshot(user):ok({enabled:true,currentId:null,data:null});
 }catch(e){console.error("Portal database GET error",e);return error("Database unavailable",503);}
}
export async function POST(req:NextRequest){
 if(!databaseEnabled())return error("Database mode is not enabled",503);
 if(!hostOriginMatch(req))return error("Invalid request origin",403);
 if(Number(req.headers.get("content-length")||0)>4_000_000)return error("Request too large",413);
 let body:{action?:string;args?:Args};
 try{body=await req.json();}catch{return error("Invalid JSON");}
 const action=body.action,args=body.args||{},pool=sqlPool();
 if(!action||typeof action!=="string")return error("Missing action");
 try{
  if(action==="login"){
   const email=text(args.email,255).toLowerCase(),password=typeof args.password==="string"?args.password:"";
   if(!email||password.length>256)return error("Invalid email or password",401);
   const found=await pool.query("SELECT u.*,o.status AS org_status FROM users u LEFT JOIN organizations o ON o.id=u.organization_id WHERE u.email=$1",[email]);
   const u=found.rows[0];
   if(!u||u.status!=="active"||(u.organization_id&&u.org_status!=="active")||!u.verified||(u.locked_until&&new Date(u.locked_until)>new Date())||!await passwordValid(password,u.password_hash)){
    if(u)await pool.query("UPDATE users SET failed_attempts=failed_attempts+1,locked_until=CASE WHEN failed_attempts>=7 THEN now()+interval '15 minutes' ELSE locked_until END WHERE id=$1",[u.id]);
    return error("Invalid credentials, unverified account or account temporarily locked",401);
   }
   await pool.query("UPDATE users SET failed_attempts=0,locked_until=null WHERE id=$1",[u.id]);
   const token=makeToken();
   await pool.query("INSERT INTO sessions(token_hash,user_id,expires_at) VALUES($1,$2,now()+interval '7 days')",[hashToken(token),u.id]);
   const res=ok({success:true});
   res.cookies.set(COOKIE,token,{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax",path:"/",maxAge:604800});
   return res;
  }
  if(action==="signup")return error("Use email OTP signup to verify your company email address",409);
  const user=await getSession(req.cookies.get(COOKIE)?.value);
  if(!user)return error("Sign in required",401);
  if(action==="logout"){
   const token=req.cookies.get(COOKIE)?.value;
   if(token)await pool.query("DELETE FROM sessions WHERE token_hash=$1",[hashToken(token)]);
   const response=ok({success:true});response.cookies.delete(COOKIE);return response;
  }
  if(action==="refresh")return getSnapshot(user);
  if(action==="profile"){
   const name=text(args.fullName,100),department=text(args.department,100);
   if(name.length<2)return error("Name too short");
   const change=typeof args.password==="string"&&args.password.length>0;
   if(change&&(args.password as string).length<12)return error("New password must contain at least 12 characters");
   const client=await pool.connect();
   try{
    await client.query("BEGIN");
    await client.query("UPDATE users SET full_name=$1,department=$2,password_hash=CASE WHEN $3::text IS NOT NULL THEN $3 ELSE password_hash END WHERE id=$4",
     [name,department,change?await passwordHash(String(args.password)):null,user.id]);
    if(change){
      const activeToken=req.cookies.get(COOKIE)?.value;
      await client.query("DELETE FROM sessions WHERE user_id=$1 AND token_hash<>$2",[user.id,activeToken?hashToken(activeToken):""]);
    }
    await client.query("COMMIT");
   }catch(e){await client.query("ROLLBACK");throw e;}finally{client.release();}
   return getSnapshot(user);
  }
  if(action==="privacy"){
   await pool.query("UPDATE users SET show_in_attendee_lists=$1 WHERE id=$2",[args.visible===true,user.id]);
   return getSnapshot(user);
  }
  if(action==="saveCompany"){
   if(!requireAdmin(user))return denied();
   const c=args.company as Company;
   if(!c||typeof c!=="object")return error("Missing organization");
   const name=text(c.name,160),id=text(c.id,120)||randomUUID();
   const domains=Array.isArray(c.domains)?[...new Set(c.domains.map(x=>text(x,255).toLowerCase()))]:[];
   if(name.length<3||!domains.length||domains.some(d=>!/^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(d)))return error("Invalid organization name or domains");
   const client=await pool.connect();
   try{
    await client.query("BEGIN");
    const exists=await client.query("SELECT id FROM organizations WHERE id=$1",[id]);
    if(exists.rowCount)await client.query("UPDATE organizations SET name=$1 WHERE id=$2",[name,id]);
    else await client.query("INSERT INTO organizations(id,name,status) VALUES($1,$2,'active')",[id,name]);
    await client.query("DELETE FROM organization_domains WHERE organization_id=$1",[id]);
    for(const domain of domains)await client.query("INSERT INTO organization_domains(domain,organization_id) VALUES($1,$2)",[domain,id]);
    await logAudit(client,user,"organization.save",id,id);
    await client.query("COMMIT");
   }catch(e){await client.query("ROLLBACK");if((e as {code?:string}).code==="23505")return error("Domain already belongs to another organization");throw e;}
   finally{client.release();}
   return getSnapshot(user);
  }
  if(action==="companyStatus"){
   if(!requireAdmin(user))return denied();
   const id=text(args.companyId,120);
   await pool.query("UPDATE organizations SET status=CASE WHEN status='active' THEN 'suspended' ELSE 'active' END WHERE id=$1",[id]);
   await logAudit(pool,user,"organization.status",id,id);
   return getSnapshot(user);
  }
  if(action==="createEmployee"){
   if(user.role!=="company_admin"||!user.companyId)return denied();
   const name=text(args.name,100),email=text(args.email,255).toLowerCase(),department=text(args.department,100);
   if(name.length<2||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return error("Enter an employee name and valid company email");
   const domain=email.split("@")[1];
   const owned=await pool.query("SELECT 1 FROM organization_domains d JOIN organizations o ON o.id=d.organization_id WHERE d.organization_id=$1 AND d.domain=$2 AND o.status='active'",[user.companyId,domain]);
   if(!owned.rowCount)return error("Employee email must use an approved domain of your company",403);
   const id=randomUUID();
   // Generated credentials are shown to the manager once, never logged or emailed.
   // Privileged organization admins may provision employees directly; enforce password rotation at first login.
   const initialPassword=makeToken().slice(0,22);
   const client=await pool.connect();
   try{
    await client.query("BEGIN");
    const inserted=await client.query("INSERT INTO users(id,full_name,email,password_hash,department,role,organization_id,verified,status,must_change_password) VALUES($1,$2,$3,$4,$5,'employee',$6,true,'active',true) ON CONFLICT(email) DO NOTHING RETURNING id",[id,name,email,await passwordHash(initialPassword),department,user.companyId]);
    if(!inserted.rowCount){await client.query("ROLLBACK");return error("This email already has an employee account",409);}
    await logAudit(client,user,"employee.provisioned",id,user.companyId);
    await client.query("COMMIT");
   }catch(e){await client.query("ROLLBACK");throw e;}finally{client.release();}
   // Login uses company email and temporary password. The employee must rotate it at first sign-in.
   return ok({success:true,email,employeeId:"EMP-"+id.slice(0,8).toUpperCase(),temporaryPassword:initialPassword,data:await snapshot(user)});
  }
  if(action==="invite"){
   if(!requireAdmin(user))return denied();
   const email=text(args.email,255).toLowerCase(),companyId=text(args.companyId,120);
   if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return error("Invalid email");
   const domain=email.split("@")[1];
   const org=await pool.query("SELECT 1 FROM organization_domains d JOIN organizations o ON o.id=d.organization_id WHERE d.domain=$1 AND d.organization_id=$2 AND o.status='active'",[domain,companyId]);
   if(!org.rowCount)return error("Email domain does not belong to the active organization");
   if((await pool.query("SELECT 1 FROM users WHERE email=$1",[email])).rowCount)return error("Account already exists");
   await pool.query("INSERT INTO invitations(id,email,organization_id) VALUES($1,$2,$3)",[randomUUID(),email,companyId]);
   await logAudit(pool,user,"invitation.create",email,companyId);
   return getSnapshot(user);
  }
  if(action==="grantCompanyAdmin"){
   if(!requireAdmin(user))return denied();
   const id=text(args.userId,120);
   const client=await pool.connect();
   try{
    await client.query("BEGIN");
    const target=await client.query("SELECT id,email,organization_id,role,verified,status FROM users WHERE id=$1 FOR UPDATE",[id]);
    const person=target.rows[0];
    if(!person||person.role!=="employee"||person.verified!==true||person.status!=="active"||!person.organization_id){await client.query("ROLLBACK");return denied();}
    const invite=await client.query("SELECT id FROM invitations WHERE email=$1 AND organization_id=$2 AND accepted=false FOR UPDATE",[person.email,person.organization_id]);
    if(!invite.rowCount){await client.query("ROLLBACK");return error("An approved pending company-admin invitation is required",409);}
    await client.query("UPDATE users SET role='company_admin' WHERE id=$1",[id]);
    await client.query("UPDATE invitations SET accepted=true WHERE id=$1",[invite.rows[0].id]);
    await logAudit(client,user,"membership.grant_company_admin",id,person.organization_id);
    await client.query("COMMIT");
   }catch(e){await client.query("ROLLBACK");throw e;}finally{client.release();}
   return getSnapshot(user);
  }
  if(action==="role"){
   const id=text(args.userId,120);
   const person=await pool.query("SELECT id,role,organization_id,status,verified FROM users WHERE id=$1",[id]);
   const target=person.rows[0];
   if(!target||!requireCompanyAdmin(user,target.organization_id)||target.id===user.id||target.status!=="active"||!target.verified||target.role==="platform_admin")return denied();
   await pool.query("UPDATE users SET role=CASE WHEN role='employee' THEN 'company_admin' ELSE 'employee' END WHERE id=$1",[id]);
   await logAudit(pool,user,"membership.role",id,target.organization_id);
   return getSnapshot(user);
  }
  if(action==="userStatus"||action==="approveUser"){
   const id=text(args.userId,120);
   const target=(await pool.query("SELECT id,role,organization_id,verified FROM users WHERE id=$1",[id])).rows[0];
   if(!target||target.role==="platform_admin"||!(requireAdmin(user)||(action==="approveUser"&&requireCompanyAdmin(user,target.organization_id))))return denied();
   if(action==="approveUser"){
     await pool.query("UPDATE users SET verified=true WHERE id=$1",[id]);
   }else await pool.query("UPDATE users SET status=CASE WHEN status='active' THEN 'suspended' ELSE 'active' END WHERE id=$1",[id]);
   await logAudit(pool,user,action==="approveUser"?"user.approve":"user.status",id,target.organization_id);
   return getSnapshot(user);
  }
  if(action==="saveEvent"){
   const e=args.event as PortalEvent;
   if(!e||typeof e!=="object"||!requireCompanyAdmin(user,text(e.companyId,120)))return denied();
   const existing=await pool.query("SELECT id,created_by,payload FROM events WHERE id=$1",[text(e.id,120)]);
   if(existing.rowCount){
     const ownEvent=await pool.query("SELECT organization_id FROM events WHERE id=$1",[e.id]);
     if(ownEvent.rows[0]?.organization_id!==user.companyId)return denied();
   }
   const event:PortalEvent={...e,createdBy:existing.rows[0]?.created_by||user.id};
   const issue=validateEvent(event,await snapshot(user));
   if(issue)return error(issue);
   const sanitized=await storeEventImages(event,existing.rows[0]?.payload as PortalEvent|undefined);
   const payload=jsonPayload(sanitized),cap=Number(event.capacity),starts=new Date(event.startsAt),ends=new Date(event.endsAt);
   if(!Number.isInteger(cap)||cap<1||cap>100000||!(starts<ends))return error("Invalid dates or capacity");
   const client=await pool.connect();
   try{
    await client.query("BEGIN");
    const present=await client.query("SELECT * FROM events WHERE id=$1 FOR UPDATE",[event.id]);
    if(present.rowCount){
      if(present.rows[0].organization_id!==user.companyId){await client.query("ROLLBACK");return denied();}
      const reserved=await client.query("SELECT count(*)::int AS count FROM registrations WHERE event_id=$1 AND status='going'",[event.id]);
      if(Number(reserved.rows[0].count)>cap){await client.query("ROLLBACK");return error("Capacity cannot be below registered attendees");}
      await client.query("UPDATE events SET title=$1,status=$2,starts_at=$3,ends_at=$4,capacity=$5,waitlist_enabled=$6,payload=$7::jsonb,updated_at=now() WHERE id=$8",
       [event.title,event.status,event.startsAt,event.endsAt,cap,event.waitlistEnabled!==false,payload,event.id]);
      if(event.status==="published"&&new Date(event.startsAt)>new Date()){
       const openSlots=Math.max(0,cap-Number(reserved.rows[0].count));
       if(openSlots>0){
        const waiting=await client.query("SELECT id FROM registrations WHERE event_id=$1 AND status='waitlisted' ORDER BY waitlisted_at,id LIMIT $2 FOR UPDATE",[event.id,openSlots]);
        for(const item of waiting.rows)await client.query("UPDATE registrations SET status='going',promoted_at=now() WHERE id=$1",[item.id]);
       }
      }
    }else{
      await client.query("INSERT INTO events(id,organization_id,created_by,title,status,starts_at,ends_at,capacity,waitlist_enabled,payload) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb)",
       [event.id,user.companyId,user.id,event.title,event.status,event.startsAt,event.endsAt,cap,event.waitlistEnabled!==false,payload]);
    }
    await logAudit(client,user,"event.save",event.id);
    await client.query("COMMIT");
   }catch(e){await client.query("ROLLBACK");throw e;}finally{client.release();}
   return getSnapshot(user);
  }
  if(action==="cancelEvent"){
   const id=text(args.eventId,120);
   const found=await pool.query("SELECT organization_id,payload FROM events WHERE id=$1",[id]);
   if(!found.rowCount||!requireCompanyAdmin(user,found.rows[0].organization_id))return denied();
   const event={...found.rows[0].payload,status:"cancelled",cancellationReason:text(args.reason,500)};
   await pool.query("UPDATE events SET status='cancelled',payload=$1::jsonb,updated_at=now() WHERE id=$2",[jsonPayload(event),id]);
   await logAudit(pool,user,"event.cancel",id);
   return getSnapshot(user);
  }
  if(action==="register"||action==="cancelRegistration"||action==="removeParticipant"){
   const eventId=text(args.eventId,120),client=await pool.connect();
   try{
    await client.query("BEGIN");
    const locked=await client.query("SELECT * FROM events WHERE id=$1 FOR UPDATE",[eventId]);
    const event=locked.rows[0];
    if(!event||!requireOrg(user,event.organization_id)||!event.starts_at){await client.query("ROLLBACK");return denied();}
    const employeeId=action==="removeParticipant"?text(args.userId,120):user.id;
    if(action==="removeParticipant"&&!requireCompanyAdmin(user,event.organization_id)){await client.query("ROLLBACK");return denied();}
    if(action==="removeParticipant"){
      const member=await client.query("SELECT 1 FROM users WHERE id=$1 AND organization_id=$2",[employeeId,event.organization_id]);
      if(!member.rowCount){await client.query("ROLLBACK");return denied();}
    }
    const previous=await client.query("SELECT * FROM registrations WHERE event_id=$1 AND user_id=$2",[eventId,employeeId]);
    const oldStatus=previous.rows[0]?.status;
    if(action==="register"){
      if(user.role==="platform_admin"||user.companyId!==event.organization_id||!user.verified||event.status!=="published"||new Date(event.starts_at)<=new Date()||event.payload.deadline&&new Date(event.payload.deadline)<=new Date()){
       await client.query("ROLLBACK");return error("Registration unavailable",409);
      }
      if(oldStatus==="going"||oldStatus==="waitlisted"){await client.query("COMMIT");return getSnapshot(user);}
      const result=await client.query("SELECT count(*)::int AS count FROM registrations WHERE event_id=$1 AND status='going'",[eventId]);
      const status=Number(result.rows[0].count)<event.capacity?"going":event.waitlist_enabled?"waitlisted":null;
      if(!status){await client.query("ROLLBACK");return error("Event is full",409);}
      await client.query("INSERT INTO registrations(id,event_id,user_id,status,waitlisted_at) VALUES($1,$2,$3,$4,$5) ON CONFLICT(event_id,user_id) DO UPDATE SET status=excluded.status,created_at=now(),waitlisted_at=excluded.waitlisted_at,promoted_at=null,cancelled_at=null",
       [randomUUID(),eventId,user.id,status,status==="waitlisted"?new Date():null]);
    }else{
      if(action==="cancelRegistration"&&new Date(event.starts_at)<=new Date()){await client.query("ROLLBACK");return error("Event has started",409);}
      if(oldStatus!=="going"&&oldStatus!=="waitlisted"){await client.query("ROLLBACK");return error("No active RSVP",409);}
      await client.query("UPDATE registrations SET status='cancelled',cancelled_at=now() WHERE event_id=$1 AND user_id=$2",[eventId,employeeId]);
      if(oldStatus==="going"&&event.status==="published"){
       const next=await client.query("SELECT id FROM registrations WHERE event_id=$1 AND status='waitlisted' ORDER BY waitlisted_at,id LIMIT 1 FOR UPDATE",[eventId]);
       if(next.rowCount)await client.query("UPDATE registrations SET status='going',promoted_at=now() WHERE id=$1",[next.rows[0].id]);
      }
    }
    await logAudit(client,user,action,eventId,event.organization_id);
    await client.query("COMMIT");
   }catch(e){await client.query("ROLLBACK");throw e;}finally{client.release();}
   return getSnapshot(user);
  }
  return error("Unknown action",404);
 }catch(e){console.error("Portal database action error",action,e);return error("Request could not be completed",500);}
}
