import {NextRequest,NextResponse} from "next/server";
import {randomUUID} from "node:crypto";
import {emailAuth} from "@/lib/auth/email-server";
import {databaseEnabled,passwordHash,sqlPool} from "@/lib/db/server";

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
  const existing=await sqlPool().query("SELECT 1 FROM users WHERE email=$1",[email]);
  if(existing.rows.length)return fail("An account with this email already exists",409);
  return NextResponse.json({eligible:true,organization:company.rows[0].name},{headers:{"Cache-Control":"no-store"}});
 }catch{return fail("Unable to check this organization",503);}
}
export async function POST(req:NextRequest){
 if(!databaseEnabled())return fail("Database registration not enabled",503);
 const origin=req.headers.get("origin");
 if(origin&&new URL(origin).host!==req.headers.get("host"))return fail("Invalid origin",403);
 if(Number(req.headers.get("content-length")||0)>4000)return fail("Request too large",413);
 let body:{email?:unknown;name?:unknown;department?:unknown;password?:unknown};
 try{body=await req.json();}catch{return fail("Invalid submission");}
 const email=typeof body.email==="string"?body.email.trim().toLowerCase():"";
 const name=typeof body.name==="string"?body.name.trim():"";
 const department=typeof body.department==="string"?body.department.trim():"";
 const password=typeof body.password==="string"?body.password:"";
 if(!validEmail(email)||name.length<2||name.length>100||department.length>100||password.length<12||password.length>128)return fail("Invalid registration details");
 try{
  const {data:identity,error:sessionError}=await emailAuth.getSession();
  const verifiedIdentity=identity?.user;
  if(sessionError||!verifiedIdentity||verifiedIdentity.email?.trim().toLowerCase()!==email||verifiedIdentity.emailVerified!==true){
   return fail("Verify the emailed OTP before completing registration",403);
  }
  const company=await companyFor(email);
  if(!company.rows.length)return fail("Your company is not registered",403);
  const id=randomUUID(),hash=await passwordHash(password);
  const result=await sqlPool().query(
   "INSERT INTO users(id,full_name,email,password_hash,department,role,organization_id,verified,status) VALUES($1,$2,$3,$4,$5,'employee',$6,false,'active') ON CONFLICT(email) DO NOTHING RETURNING id",
   [id,name,email,hash,department,company.rows[0].id]
  );
  if(!result.rows.length)return fail("An account already exists for this email",409);
  return NextResponse.json({success:true,organization:company.rows[0].name,message:"Email verified. Your organization administrator must approve your account before you can sign in."},{headers:{"Cache-Control":"no-store"}});
 }catch(error){
  console.error("Verified employee registration failed",error instanceof Error?error.name:"unknown");
  return fail("Unable to finish registration",503);
 }
}
