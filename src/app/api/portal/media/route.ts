import {NextRequest,NextResponse} from "next/server";
import {databaseEnabled,getSession,sqlPool} from "@/lib/db/server";
import {mediaOwner,readMedia} from "@/lib/media/server";

export const runtime="nodejs";
export const dynamic="force-dynamic";

const notFound=()=>new NextResponse(null,{status:404,headers:{"Cache-Control":"no-store"}});

/** Streams an event banner, speaker photo or profile photo to a signed-in viewer who may see it. */
export async function GET(req:NextRequest){
 if(!databaseEnabled())return notFound();
 const key=req.nextUrl.searchParams.get("key")||"";
 const owner=mediaOwner(key);
 if(!owner)return notFound();
 try{
  const user=await getSession(req.cookies.get("elixir_session")?.value);
  if(!user)return new NextResponse(null,{status:401,headers:{"Cache-Control":"no-store"}});
  const admin=user.role==="platform_admin";
  if(owner.kind==="organization"&&!admin&&owner.organizationId!==user.companyId)return notFound();
  if(owner.kind==="profile"&&!admin&&owner.userId!==user.id){
   const colleague=await sqlPool().query("SELECT 1 FROM users WHERE id=$1 AND organization_id=$2",[owner.userId,user.companyId]);
   if(!colleague.rowCount)return notFound();
  }
  const {bytes,type}=await readMedia(key);
  // Object keys are random and never reused, so the browser can keep a private copy.
  return new NextResponse(Buffer.from(bytes),{headers:{"Content-Type":type,"Cache-Control":"private, max-age=86400, immutable","X-Content-Type-Options":"nosniff"}});
 }catch(error){
  console.error("Media read failed",error instanceof Error?error.name:"unknown");
  return notFound();
 }
}
