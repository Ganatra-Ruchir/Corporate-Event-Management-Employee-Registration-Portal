import {sameOrigin} from "@/lib/http";
import {NextRequest,NextResponse} from "next/server";
import {randomUUID} from "node:crypto";
import {databaseEnabled,sqlPool,hashToken,passwordHash,makeToken} from "@/lib/db/server";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export async function POST(req:NextRequest){
 if(!sameOrigin(req))return NextResponse.json({error:"Invalid request origin"},{status:403});
 if(!databaseEnabled()||!process.env.BOOTSTRAP_ADMIN_EMAIL)return NextResponse.json({error:"Administrator setup is not enabled"},{status:503});
 let body:{token?:string;name?:string;password?:string};
 try{body=await req.json();}catch{return NextResponse.json({error:"Invalid request"},{status:400});}
 const token=String(body.token||""),name=String(body.name||"").trim(),password=String(body.password||"");
 if(!/^[A-Za-z0-9_-]{43}$/.test(token)||name.length<2||name.length>100||password.length<14||password.length>128){
  return NextResponse.json({error:"Invalid setup link, name or password. Password must be at least 14 characters."},{status:400});
 }
 const client=await sqlPool().connect();
 try{
  await client.query("BEGIN");
  await client.query("SELECT pg_advisory_xact_lock(71623901)");
  const count=await client.query("SELECT count(*)::int AS count FROM users WHERE role='platform_admin'");
  if(count.rows[0].count!==0){await client.query("ROLLBACK");return NextResponse.json({error:"The first administrator is already configured"},{status:409});}
  const row=await client.query("SELECT email,expires_at,used_at FROM admin_setup_tokens WHERE token_hash=$1 FOR UPDATE",[hashToken(token)]);
  const setup=row.rows[0];
  const allowed=process.env.BOOTSTRAP_ADMIN_EMAIL!.trim().toLowerCase();
  if(!setup||setup.used_at||new Date(setup.expires_at)<=new Date()||setup.email!==allowed){
   await client.query("ROLLBACK");
   return NextResponse.json({error:"The activation link is invalid or expired"},{status:401});
  }
  const id=randomUUID();
  await client.query("INSERT INTO users(id,full_name,email,password_hash,role,organization_id,status,verified) VALUES($1,$2,$3,$4,'platform_admin',null,'active',true)",
   [id,name,allowed,await passwordHash(password)]);
  await client.query("UPDATE admin_setup_tokens SET used_at=now() WHERE token_hash=$1",[hashToken(token)]);
  const session=makeToken();
  await client.query("INSERT INTO sessions(token_hash,user_id,expires_at) VALUES($1,$2,now()+interval '7 days')",[hashToken(session),id]);
  await client.query("INSERT INTO audit_logs(actor_user_id,action,subject_id) VALUES($1,'platform.first_admin_activated',$1)",[id]);
  await client.query("COMMIT");
  const result=NextResponse.json({success:true},{headers:{"Cache-Control":"no-store"}});
  result.cookies.set("elixir_session",session,{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"strict",path:"/",maxAge:604800});
  return result;
 }catch(e){
  await client.query("ROLLBACK").catch(()=>{});
  console.error("First admin activation failed",e instanceof Error?e.name:"unknown");
  return NextResponse.json({error:"Unable to complete activation"},{status:500});
 }finally{client.release();}
}
