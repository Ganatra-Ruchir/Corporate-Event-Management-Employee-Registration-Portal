import {NextRequest,NextResponse} from "next/server";
import {randomUUID} from "node:crypto";
import {getEmailAuth} from "@/lib/auth/email-server";
import {databaseEnabled,passwordHash,sqlPool} from "@/lib/db/server";
import {sameOrigin} from "@/lib/http";

export const runtime="nodejs";
export const dynamic="force-dynamic";
const fail=(message:string,status=400)=>NextResponse.json({error:message},{status,headers:{"Cache-Control":"no-store"}});
const validEmail=(v:unknown)=>typeof v==="string"&&v.length<=255&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
async function companyFor(email:string){
 return sqlPool().query("SELECT o.id,o.name FROM organizations o JOIN organization_domains d ON d.organization_id=o.id WHERE d.domain=$1 AND o.status='active'",[email.split("@")[1]]);
}
export async function GET(req:NextRequest){
 if(!databaseEnabled())return fail("Database registration not enabled",503);
 const email=(req.nextUrl.searchParams.get("email")||"").toLowerCase().trim();
 if(!validEmail(email))return fail("Enter a valid company email address");
 try{
  const company=await companyFor(email);
  if(!company.rows.length)return fail("This work email domain is not registered with an organization",403);
  const existing=await sqlPool().query("SELECT role,verified,status FROM users WHERE email=$1",[email]);
  if(existing.rows.length&&(existing.rows[0].role!=="employee"||existing.rows[0].verified||existing.rows[0].status!=="active"))
   return fail("This email already has an account. Sign in or contact your administrator.",409);
  return NextResponse.json({eligible:true,organization:company.rows[0].name},{headers:{"Cache-Control":"no-store"}});
 }catch{return fail("Unable to check this organization",503);}
}
export async function POST(req:NextRequest){
 if(!databaseEnabled())return fail("Database registration not enabled",503);
 if(!sameOrigin(req))return fail("Invalid origin",403);
 if(Number(req.headers.get("content-length")||0)>4000)return fail("Request too large",413);
 let body:{email?:unknown;name?:unknown;department?:unknown;password?:unknown};
 try{body=await req.json();}catch{return fail("Invalid submission");}
 const email=typeof body.email==="string"?body.email.trim().toLowerCase():"";
 const name=typeof body.name==="string"?body.name.trim():"";
 const department=typeof body.department==="string"?body.department.trim():"";
 const password=typeof body.password==="string"?body.password:"";
 if(!validEmail(email)||name.length<2||name.length>100||department.length>100||password.length<12||password.length>128)return fail("Invalid registration details");
 try{
  const {data:identity,error:sessionError}=await getEmailAuth().getSession();
  const verifiedIdentity=identity?.user;
  if(sessionError||!verifiedIdentity||verifiedIdentity.email?.trim().toLowerCase()!==email||verifiedIdentity.emailVerified!==true){
   return fail("Verify the emailed OTP before completing registration",403);
  }
  const company=await companyFor(email);
  if(!company.rows.length)return fail("Your company is not registered",403);
  const id=randomUUID(),hash=await passwordHash(password);
  const result=await sqlPool().query(
   "INSERT INTO users(id,full_name,email,password_hash,department,role,organization_id,verified,status) VALUES($1,$2,$3,$4,$5,'employee',$6,true,'active') ON CONFLICT(email) DO NOTHING RETURNING id",
   [id,name,email,hash,department,company.rows[0].id]
  );
  if(!result.rows.length){
   // Existing unverified employee accounts from the old manual-approval flow
   // can be activated, but only after authenticating the verified work email.
   const changed=await sqlPool().query(
    "UPDATE users SET verified=true,password_hash=$1,full_name=$2,department=$3,failed_attempts=0,locked_until=NULL WHERE email=$4 AND role='employee' AND verified=false AND status='active' AND organization_id=$5 RETURNING id",
    [hash,name,department,email,company.rows[0].id]
   );
   if(!changed.rowCount)return fail("This account cannot be activated automatically. Contact your administrator.",409);
  }
  return NextResponse.json({success:true,organization:company.rows[0].name,message:"Email verified. Your employee account is active. You can sign in now."},{headers:{"Cache-Control":"no-store"}});
 }catch(error){
  console.error("Verified employee registration failed",error instanceof Error?error.name:"unknown");
  return fail("Unable to finish registration",503);
 }
}
